import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: due, error: dueErr } = await admin.rpc("list_due_subscriptions", { p_limit: 200 });
    if (dueErr) return json({ success: false, error: dueErr.message }, 500);

    const results: Array<{ id: string; ok: boolean; code?: string; error?: string }> = [];

    for (const sub of (due ?? []) as Array<{ id: string }>) {
      const { data, error } = await admin.rpc("subscription_charge", { p_sub_id: sub.id });
      if (error) {
        results.push({ id: sub.id, ok: false, error: error.message });
      } else {
        results.push({ id: sub.id, ok: true, code: data as string });
      }
    }

    const charged = results.filter((r) => r.ok).length;

    await admin.from("audit_logs").insert({
      action: "cron.recurring_billing",
      target_type: "customer_subscriptions",
      description: `Thu ${charged}/${results.length} đăng ký định kỳ tới hạn`,
      metadata: { results },
    });

    return json({ success: true, due: results.length, charged, results });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
