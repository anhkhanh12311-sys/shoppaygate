import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SepayTx {
  id: string | number;
  bank_brand_name: string;
  account_number: string;
  transaction_date: string;
  amount_in: string | number;
  amount_out: string | number;
  transaction_content: string;
  reference_number: string;
}

interface SepayListResponse {
  status: number;
  messages?: { success?: boolean };
  transactions?: SepayTx[];
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth: require logged-in user, then derive merchant
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ success: false, error: "Unauthorized" }, 401);

    const { data: merchant, error: mErr } = await supabase
      .from("merchants")
      .select("*")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (mErr || !merchant) return json({ success: false, error: "Merchant not found" }, 404);

    // Gather SePay sources: legacy secret + each linked bank
    const pairs: Array<{ api_key: string; account_number: string | null; origin: string }> = [];
    const { data: secretRow } = await supabase
      .from("merchant_secrets").select("sepay_api_key")
      .eq("merchant_id", merchant.id).maybeSingle();
    if (secretRow?.sepay_api_key) {
      pairs.push({
        api_key: secretRow.sepay_api_key,
        account_number: merchant.bank_account_number || null,
        origin: "secret",
      });
    }
    const { data: bankRows } = await supabase
      .from("merchant_banks")
      .select("sepay_api_key, bank_account_number")
      .eq("merchant_id", merchant.id)
      .not("sepay_api_key", "is", null);
    for (const b of (bankRows as any[]) || []) {
      pairs.push({ api_key: b.sepay_api_key, account_number: b.bank_account_number, origin: "bank" });
    }
    const seen = new Set<string>();
    const sources = pairs.filter(p => {
      const k = `${p.api_key}::${p.account_number ?? "*"}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
    if (sources.length === 0) {
      return json({ success: false, error: "Chưa có SePay API key nào (kiểm tra Ngân hàng hoặc Đồng bộ SePay)" }, 400);
    }

    // Optional body: { limit, since_hours }
    let limit = 50;
    let sinceHours = 24;
    try {
      const body = await req.json();
      if (typeof body?.limit === "number") limit = Math.min(Math.max(body.limit, 1), 200);
      if (typeof body?.since_hours === "number") sinceHours = Math.max(body.since_hours, 1);
    } catch {}

    const sinceDate = new Date(Date.now() - sinceHours * 3600 * 1000);

    // Load pending links once
    const { data: links } = await supabase
      .from("payment_links")
      .select("id, code, amount, is_static, status")
      .eq("merchant_id", merchant.id);
    const linksByCode = new Map<string, any>();
    (links || []).forEach((l) => linksByCode.set(l.code.toUpperCase(), l));

    let matched = 0, duplicate = 0, unmatched = 0, totalFetched = 0;
    const matchedDetails: any[] = [];
    const perSource: any[] = [];

    for (const src of sources) {
      const url = new URL("https://my.sepay.vn/userapi/transactions/list");
      url.searchParams.set("limit", String(limit));
      if (src.account_number) url.searchParams.set("account_number", src.account_number);

      let resp: Response;
      try {
        resp = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${src.api_key}`,
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        perSource.push({ account_number: src.account_number, origin: src.origin, error: (e as Error).message });
        continue;
      }
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        const friendly = resp.status === 401 || resp.status === 403
          ? "API key không hợp lệ"
          : `SePay ${resp.status}: ${txt.slice(0, 120)}`;
        perSource.push({ account_number: src.account_number, origin: src.origin, error: friendly, status: resp.status });
        continue;
      }
      const data: SepayListResponse = await resp.json();
      const allTx = (data.transactions || []).filter((t) => {
        const d = new Date(t.transaction_date);
        return (Number(t.amount_in) || 0) > 0 && d >= sinceDate;
      });
      totalFetched += allTx.length;
      let srcMatched = 0, srcDup = 0;

      for (const tx of allTx) {
        const ref = tx.reference_number || String(tx.id);
        const { data: existing } = await supabase
          .from("transactions").select("id").eq("bank_reference", ref).maybeSingle();
        if (existing) { duplicate++; srcDup++; continue; }

        const contentUpper = (tx.transaction_content || "").toUpperCase();
        const codeMatch = contentUpper.match(/PG-[A-Z0-9]{6,}/);
        let link: any = null;
        if (codeMatch) link = linksByCode.get(codeMatch[0]);
        if (!link) {
          const amtIn = Number(tx.amount_in);
          link = (links || []).find((l) => l.status === "active" && Math.abs(Number(l.amount) - amtIn) < 1);
        }
        if (!link) { unmatched++; continue; }

        const { data: newId, error: insErr } = await supabase.rpc(
          "insert_transaction_from_webhook", {
            p_payment_link_id: link.id,
            p_merchant_id: merchant.id,
            p_amount: Number(tx.amount_in),
            p_transfer_content: tx.transaction_content,
            p_bank_reference: ref,
            p_status: "completed",
            p_paid_at: new Date(tx.transaction_date).toISOString(),
          }
        );
        if (insErr) { console.error("Insert error:", insErr); continue; }
        if (!link.is_static) {
          await supabase.from("payment_links").update({ status: "completed" }).eq("id", link.id);
        }
        matched++; srcMatched++;
        matchedDetails.push({
          transaction_id: newId, amount: Number(tx.amount_in),
          code: link.code, paid_at: tx.transaction_date, via: src.origin,
        });
      }
      perSource.push({
        account_number: src.account_number, origin: src.origin,
        fetched: allTx.length, matched: srcMatched, duplicate: srcDup,
      });
    }

    return json({
      success: true,
      sources: sources.length,
      total_fetched: totalFetched,
      matched, duplicate, unmatched,
      since_hours: sinceHours,
      per_source: perSource,
      matched_details: matchedDetails,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sepay-sync error:", msg);
    return json({ success: false, error: msg }, 500);
  }
});
