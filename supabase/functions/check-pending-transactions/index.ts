import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SepayTx {
  id: string | number;
  transaction_date: string;
  amount_in: string | number;
  transaction_content: string;
  reference_number: string;
}

interface SepaySource {
  merchant_id: string;
  api_key: string;
  account_number: string | null;
  origin: "secret" | "bank";
}

const json = (b: Record<string, unknown>, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let merchantId: string | null = null;
    let paymentLinkId: string | null = null;
    try {
      const body = await req.json();
      merchantId = body?.merchant_id ?? null;
      paymentLinkId = body?.payment_link_id ?? null;
    } catch { /* no body */ }

    // ===== Collect SePay sources =====
    const sources: SepaySource[] = [];

    // A) Legacy: merchant_secrets.sepay_api_key
    let secretsQ = supabase
      .from("merchant_secrets")
      .select("merchant_id, sepay_api_key, merchants!inner(bank_account_number)")
      .not("sepay_api_key", "is", null);
    if (merchantId) secretsQ = secretsQ.eq("merchant_id", merchantId);
    const { data: secRows } = await secretsQ;
    for (const r of (secRows as any[]) || []) {
      sources.push({
        merchant_id: r.merchant_id,
        api_key: r.sepay_api_key,
        account_number: r.merchants?.bank_account_number ?? null,
        origin: "secret",
      });
    }

    // B) Multi-bank: merchant_banks.sepay_api_key
    let banksQ = supabase
      .from("merchant_banks")
      .select("merchant_id, sepay_api_key, bank_account_number")
      .not("sepay_api_key", "is", null);
    if (merchantId) banksQ = banksQ.eq("merchant_id", merchantId);
    const { data: bankRows } = await banksQ;
    for (const r of (bankRows as any[]) || []) {
      sources.push({
        merchant_id: r.merchant_id,
        api_key: r.sepay_api_key,
        account_number: r.bank_account_number,
        origin: "bank",
      });
    }

    // Dedupe by (api_key + account_number)
    const seen = new Set<string>();
    const uniq = sources.filter((s) => {
      const k = `${s.api_key}::${s.account_number ?? "*"}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (uniq.length === 0) {
      return json({
        success: true,
        polled_pairs: 0,
        matched: 0,
        duplicate: 0,
        note: "No SePay API keys configured (checked merchant_secrets & merchant_banks)",
      });
    }

    let matched = 0;
    let duplicate = 0;
    const details: any[] = [];

    // Pending links cache per merchant
    const linksCache = new Map<string, any[]>();
    const loadLinks = async (mid: string) => {
      if (linksCache.has(mid)) return linksCache.get(mid)!;
      let q = supabase
        .from("payment_links")
        .select("id, code, amount, is_static, status, merchant_id")
        .eq("merchant_id", mid)
        .eq("status", "active");
      if (paymentLinkId) q = q.eq("id", paymentLinkId);
      const { data } = await q;
      linksCache.set(mid, (data as any[]) || []);
      return linksCache.get(mid)!;
    };

    for (const src of uniq) {
      const links = await loadLinks(src.merchant_id);
      if (links.length === 0) continue;

      const url = new URL("https://my.sepay.vn/userapi/transactions/list");
      url.searchParams.set("limit", "50");
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
        console.error("SePay fetch error", src.merchant_id, (e as Error).message);
        continue;
      }
      if (!resp.ok) {
        console.error("SePay HTTP", resp.status, src.merchant_id, src.origin);
        continue;
      }
      const data = await resp.json();
      const txs: SepayTx[] = data?.transactions || [];

      const linksByCode = new Map<string, any>();
      links.forEach((l) => linksByCode.set(l.code.toUpperCase(), l));

      for (const tx of txs) {
        const amtIn = Number(tx.amount_in) || 0;
        if (amtIn <= 0) continue;
        const ref = tx.reference_number || String(tx.id);

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
        if (!link) {
          link = links.find(
            (l: any) => l.status === "active" && Math.abs(Number(l.amount) - amtIn) < 1
          );
        }
        if (!link) continue;

        const { data: newId, error: insErr } = await supabase.rpc(
          "insert_transaction_from_webhook",
          {
            p_payment_link_id: link.id,
            p_merchant_id: src.merchant_id,
            p_amount: amtIn,
            p_transfer_content: tx.transaction_content,
            p_bank_reference: ref,
            p_status: "completed",
            p_paid_at: new Date(tx.transaction_date).toISOString(),
          }
        );
        if (insErr) {
          console.error("Insert error", insErr);
          continue;
        }
        if (!link.is_static) {
          await supabase.from("payment_links")
            .update({ status: "completed" }).eq("id", link.id);
        }
        matched++;
        details.push({
          transaction_id: newId, amount: amtIn, code: link.code,
          merchant_id: src.merchant_id, via: src.origin,
        });
      }
    }

    return json({
      success: true,
      polled_pairs: uniq.length,
      matched,
      duplicate,
      details,
    });
  } catch (e) {
    console.error("check-pending-transactions error:", (e as Error).message);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
