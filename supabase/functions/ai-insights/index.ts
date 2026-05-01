import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: Record<string, unknown>, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ success: false, error: "Missing LOVABLE_API_KEY" }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) return json({ success: false, error: "Unauthorized" }, 401);

    const { data: merchant } = await supabase
      .from("merchants").select("id, business_name").eq("auth_user_id", userData.user.id).maybeSingle();
    if (!merchant) return json({ success: false, error: "Merchant not found" }, 404);

    // Pull last 90d completed transactions
    const since = new Date(Date.now() - 90 * 86400_000).toISOString();
    const { data: txs } = await supabase
      .from("transactions")
      .select("amount, paid_at, status, transfer_content")
      .eq("merchant_id", merchant.id)
      .eq("status", "completed")
      .gte("paid_at", since)
      .order("paid_at", { ascending: false })
      .limit(500);

    const list = txs || [];
    const total = list.length;
    const revenue = list.reduce((s, t) => s + Number(t.amount || 0), 0);
    const avg = total > 0 ? revenue / total : 0;

    // Hour buckets
    const hourBuckets = Array(24).fill(0);
    list.forEach((t) => {
      if (t.paid_at) hourBuckets[new Date(t.paid_at).getHours()]++;
    });
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

    // Last 7 days revenue trend
    const last7: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const day = d.toISOString().slice(0, 10);
      const s = list.filter((t) => t.paid_at?.startsWith(day)).reduce((a, t) => a + Number(t.amount), 0);
      last7.push(s);
    }
    const trend = last7[6] > last7[0] ? "tăng" : last7[6] < last7[0] ? "giảm" : "ổn định";

    const summary = {
      business: merchant.business_name,
      window_days: 90,
      total_transactions: total,
      total_revenue: Math.round(revenue),
      avg_ticket: Math.round(avg),
      peak_hour: peakHour,
      last_7_days: last7,
      trend,
    };

    // Call Lovable AI for narrative insights
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Bạn là chuyên gia phân tích dữ liệu cho cổng thanh toán Việt Nam. Trả lời CỰC NGẮN GỌN bằng tiếng Việt, dùng emoji, đưa ra 3-5 insight thực tế và 2-3 hành động cụ thể.",
          },
          {
            role: "user",
            content: `Phân tích dữ liệu cửa hàng "${summary.business}" 90 ngày qua: ${total} giao dịch, doanh thu ${revenue.toLocaleString("vi-VN")}đ, trung bình ${Math.round(avg).toLocaleString("vi-VN")}đ/đơn, giờ vàng ${peakHour}h, xu hướng 7 ngày: ${trend} (${last7.map((v) => v.toLocaleString("vi-VN")).join(", ")}). Đưa ra: 1) Insight nổi bật 2) Cảnh báo nếu có 3) Hành động cụ thể tăng doanh thu.`,
          },
        ],
      }),
    });

    let aiText = "";
    if (aiResp.ok) {
      const aiData = await aiResp.json();
      aiText = aiData.choices?.[0]?.message?.content || "";
    } else if (aiResp.status === 429) {
      aiText = "⚠️ Đã vượt giới hạn AI. Vui lòng thử lại sau ít phút.";
    } else if (aiResp.status === 402) {
      aiText = "💳 Cần nạp thêm credit cho Lovable AI.";
    }

    return json({ success: true, summary, ai_insights: aiText });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ success: false, error: msg }, 500);
  }
});
