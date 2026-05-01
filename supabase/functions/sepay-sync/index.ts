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
    if (!merchant.sepay_api_key) {
      return json({ success: false, error: "SePay API key chưa được cấu hình" }, 400);
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

    // Build SePay request
    const url = new URL("https://my.sepay.vn/userapi/transactions/list");
    url.searchParams.set("limit", String(limit));
    if (merchant.bank_account_number) {
      url.searchParams.set("account_number", merchant.bank_account_number);
    }

    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${merchant.sepay_api_key}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return json({ success: false, error: `SePay API ${resp.status}: ${txt.slice(0, 200)}` }, 502);
    }

    const data: SepayListResponse = await resp.json();
    const allTx = (data.transactions || []).filter((t) => {
      const d = new Date(t.transaction_date);
      const amtIn = Number(t.amount_in) || 0;
      return amtIn > 0 && d >= sinceDate;
    });

    // Get all active payment links for this merchant
    const { data: links } = await supabase
      .from("payment_links")
      .select("id, code, amount, is_static, status")
      .eq("merchant_id", merchant.id);

    const linksByCode = new Map<string, any>();
    (links || []).forEach((l) => linksByCode.set(l.code.toUpperCase(), l));

    let matched = 0;
    let duplicate = 0;
    let unmatched = 0;
    const matchedDetails: any[] = [];

    for (const tx of allTx) {
      const ref = tx.reference_number || String(tx.id);
      // dedupe
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("bank_reference", ref)
        .maybeSingle();
      if (existing) {
        duplicate++;
        continue;
      }

      const contentUpper = (tx.transaction_content || "").toUpperCase();
      const codeMatch = contentUpper.match(/PG-[A-Z0-9]{6,}/);
      let link: any = null;
      if (codeMatch) link = linksByCode.get(codeMatch[0]);

      // Fallback: match by amount + active link
      if (!link) {
        const amtIn = Number(tx.amount_in);
        link = (links || []).find(
          (l) => l.status === "active" && Math.abs(Number(l.amount) - amtIn) < 1
        );
      }

      if (!link) {
        unmatched++;
        continue;
      }

      const { data: newId, error: insErr } = await supabase.rpc(
        "insert_transaction_from_webhook",
        {
          p_payment_link_id: link.id,
          p_merchant_id: merchant.id,
          p_amount: Number(tx.amount_in),
          p_transfer_content: tx.transaction_content,
          p_bank_reference: ref,
          p_status: "completed",
          p_paid_at: new Date(tx.transaction_date).toISOString(),
        }
      );
      if (insErr) {
        console.error("Insert error:", insErr);
        continue;
      }

      if (!link.is_static) {
        await supabase
          .from("payment_links")
          .update({ status: "completed" })
          .eq("id", link.id);
      }
      matched++;
      matchedDetails.push({
        transaction_id: newId,
        amount: Number(tx.amount_in),
        code: link.code,
        paid_at: tx.transaction_date,
      });
    }

    return json({
      success: true,
      total_fetched: allTx.length,
      matched,
      duplicate,
      unmatched,
      since_hours: sinceHours,
      matched_details: matchedDetails,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sepay-sync error:", msg);
    return json({ success: false, error: msg }, 500);
  }
});
