import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacHex(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const body = await req.json().catch(() => ({}));
    const {
      test = true,
      customer_ref = "TEST_USER",
      amount = 10000,
      transaction_id = null,
      merchant_id: targetMerchantId = null,
    } = body;

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve target merchant. Admin may target any merchant via merchant_id; otherwise resolve from JWT.
    let merchantId: string | null = null;
    if (targetMerchantId) {
      const { data: roles } = await admin
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      merchantId = targetMerchantId;
    } else {
      const { data: merchant } = await admin
        .from("merchants").select("id").eq("auth_user_id", user.id).maybeSingle();
      merchantId = merchant?.id ?? null;
    }
    if (!merchantId) return new Response(JSON.stringify({ error: "No merchant" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const merchant = { id: merchantId };

    const { data: sub } = await admin
      .from("merchant_subscriptions")
      .select("topup_callback_url, topup_secret")
      .eq("merchant_id", merchant.id).maybeSingle();

    if (!sub?.topup_callback_url) {
      return new Response(JSON.stringify({ error: "Chưa cấu hình callback URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      event: test ? "topup.test" : "topup.success",
      customer_ref,
      amount: Number(amount),
      transaction_id,
      merchant_id: merchant.id,
      timestamp: new Date().toISOString(),
    };
    const payloadStr = JSON.stringify(payload);
    const signature = sub.topup_secret ? await hmacHex(sub.topup_secret, payloadStr) : null;

    let httpStatus = 0; let responseBody = ""; let status = "failed"; let error: string | null = null;
    try {
      const res = await fetch(sub.topup_callback_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PayGate-Signature": signature ?? "",
          "X-PayGate-Event": payload.event,
        },
        body: payloadStr,
      });
      httpStatus = res.status;
      responseBody = (await res.text()).slice(0, 2000);
      status = res.ok ? "success" : "failed";
    } catch (e) {
      error = (e as Error).message;
    }

    await admin.from("topup_callbacks").insert({
      merchant_id: merchant.id,
      transaction_id,
      customer_ref,
      amount: Number(amount),
      callback_url: sub.topup_callback_url,
      payload,
      signature,
      http_status: httpStatus,
      response_body: responseBody,
      status,
      error,
      delivered_at: status === "success" ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({ ok: status === "success", http_status: httpStatus, response: responseBody, error }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
