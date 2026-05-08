import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Rocket, Copy, Send, Loader2, ExternalLink, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { toast } from "sonner";

interface Plan {
  id: string; code: string; name: string; description: string | null;
  price_monthly: number; price_yearly: number; monthly_tx_limit: number;
  fee_percent: number; features: string[]; sort_order: number;
}
interface Subscription {
  id: string; plan_id: string; status: string; billing_cycle: string;
  started_at: string; expires_at: string | null; tx_used: number;
  topup_callback_url: string | null; topup_secret: string | null;
}
interface CallbackLog {
  id: string; customer_ref: string | null; amount: number;
  http_status: number | null; status: string; created_at: string; error: string | null;
}

const planIcons: Record<string, any> = {
  free: Sparkles, starter: Rocket, pro: Zap, business: Crown,
};

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const GatewayRental = () => {
  const { merchant } = useMerchant();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [logs, setLogs] = useState<CallbackLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: planData }, { data: subData }] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
      merchant ? supabase.from("merchant_subscriptions").select("*").eq("merchant_id", merchant.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setPlans((planData ?? []).map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] })));
    setSub(subData as any);
    if (subData) {
      setCallbackUrl((subData as any).topup_callback_url ?? "");
      setSecret((subData as any).topup_secret ?? "");
    }
    if (merchant) {
      const { data: logData } = await supabase
        .from("topup_callbacks").select("id, customer_ref, amount, http_status, status, created_at, error")
        .eq("merchant_id", merchant.id).order("created_at", { ascending: false }).limit(10);
      setLogs((logData ?? []) as any);
    }
    setLoading(false);
  };

  useEffect(() => { if (merchant) load(); }, [merchant]);

  const subscribe = async (code: string) => {
    setSubscribing(code);
    const { data, error } = await (supabase as any).rpc("subscribe_to_plan_paid", {
      p_plan_code: code, p_billing_cycle: cycle,
    });
    setSubscribing(null);
    if (error) return toast.error("Đăng ký thất bại: " + error.message);
    toast.success(`Đăng ký gói thành công! Số dư còn: ${new Intl.NumberFormat("vi-VN").format(Number((data as any)?.balance_left ?? 0))}đ`);
    load();
  };

  const saveConfig = async () => {
    if (!sub) return toast.error("Vui lòng đăng ký gói trước");
    setSaving(true);
    const { error } = await (supabase as any).rpc("update_topup_config", {
      p_callback_url: callbackUrl, p_secret: secret,
    });
    setSaving(false);
    if (error) return toast.error("Lưu thất bại: " + error.message);
    toast.success("Đã lưu cấu hình callback");
    load();
  };

  const sendTest = async () => {
    if (!callbackUrl) return toast.error("Cấu hình callback URL trước");
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("send-topup-callback", {
      body: { test: true, customer_ref: "TEST_USER_001", amount: 50000 },
    });
    setTesting(false);
    if (error) return toast.error("Test thất bại: " + error.message);
    if ((data as any)?.ok) toast.success(`Callback OK (HTTP ${(data as any).http_status})`);
    else toast.error(`Callback lỗi (HTTP ${(data as any)?.http_status ?? "—"}): ${(data as any)?.error ?? (data as any)?.response ?? ""}`);
    load();
  };

  const currentPlan = plans.find(p => p.id === sub?.plan_id);
  const usagePct = currentPlan && currentPlan.monthly_tx_limit > 0
    ? Math.min(100, (sub!.tx_used / currentPlan.monthly_tx_limit) * 100) : 0;

  const docsExample = `// Endpoint hệ thống bạn nhận POST từ PayGate
app.post("/paygate/topup", (req, res) => {
  const sig = req.headers["x-paygate-signature"];
  const expected = hmacSHA256(JSON.stringify(req.body), YOUR_SECRET);
  if (sig !== expected) return res.status(401).end();

  const { customer_ref, amount, transaction_id } = req.body;
  // → cộng tiền cho user customer_ref trong DB của bạn
  res.json({ ok: true });
});`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" /> Cho thuê cổng thanh toán
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Tích hợp PayGate vào hệ thống của bạn — tự động cộng tiền user khi nhận chuyển khoản.
        </p>
      </div>

      {/* Current subscription */}
      {sub && currentPlan && (
        <Card className="glass border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Gói hiện tại: {currentPlan.name}
                  <Badge variant={sub.status === "active" ? "default" : "secondary"}>{sub.status}</Badge>
                </CardTitle>
                <CardDescription>
                  {sub.expires_at ? `Hết hạn: ${new Date(sub.expires_at).toLocaleDateString("vi-VN")}` : "—"}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Đã dùng</p>
                <p className="font-bold">{fmt(sub.tx_used)} / {currentPlan.monthly_tx_limit === 0 ? "∞" : fmt(currentPlan.monthly_tx_limit)} GD</p>
              </div>
            </div>
          </CardHeader>
          {currentPlan.monthly_tx_limit > 0 && (
            <CardContent>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full gradient-primary transition-all" style={{ width: `${usagePct}%` }} />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Tabs defaultValue={sub ? "config" : "plans"} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plans">Gói cước</TabsTrigger>
          <TabsTrigger value="config">Cấu hình</TabsTrigger>
          <TabsTrigger value="docs">Tài liệu</TabsTrigger>
          <TabsTrigger value="logs">Nhật ký</TabsTrigger>
        </TabsList>

        {/* Plans */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl bg-muted p-1">
              <button onClick={() => setCycle("monthly")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${cycle === "monthly" ? "bg-background shadow" : ""}`}>
                Theo tháng
              </button>
              <button onClick={() => setCycle("yearly")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${cycle === "yearly" ? "bg-background shadow" : ""}`}>
                Theo năm <Badge variant="secondary" className="ml-1 text-[10px]">-17%</Badge>
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((p, i) => {
              const Icon = planIcons[p.code] ?? Sparkles;
              const isCurrent = sub?.plan_id === p.id;
              const price = cycle === "yearly" ? p.price_yearly : p.price_monthly;
              const isPopular = p.code === "pro";
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`relative h-full flex flex-col ${isPopular ? "border-primary shadow-lg" : ""}`}>
                    {isPopular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground">
                        Phổ biến
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center mb-2">
                        <Icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <CardTitle>{p.name}</CardTitle>
                      <CardDescription className="text-xs min-h-[32px]">{p.description}</CardDescription>
                      <div className="pt-2">
                        <span className="text-3xl font-bold">{price === 0 ? "Miễn phí" : fmt(price)}</span>
                        {price > 0 && <span className="text-muted-foreground text-sm">đ/{cycle === "yearly" ? "năm" : "tháng"}</span>}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-2 flex-1 mb-4">
                        {p.features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={isPopular ? "gradient-primary text-primary-foreground" : ""}
                        variant={isPopular ? "default" : "outline"}
                        disabled={isCurrent || subscribing === p.code}
                        onClick={() => subscribe(p.code)}
                      >
                        {subscribing === p.code ? <Loader2 className="h-4 w-4 animate-spin" /> :
                          isCurrent ? "Đang dùng" : price === 0 ? "Dùng thử" : "Đăng ký"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Config */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình Auto-bank Callback</CardTitle>
              <CardDescription>
                Nhập URL và secret để PayGate tự động gọi về hệ thống của bạn mỗi khi user nạp tiền thành công.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Callback URL <span className="text-destructive">*</span></Label>
                <Input placeholder="https://yoursite.com/api/paygate/topup"
                  value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Endpoint nhận POST JSON khi user nạp tiền thành công.
                </p>
              </div>
              <div>
                <Label>Secret (HMAC SHA256)</Label>
                <div className="flex gap-2">
                  <Input placeholder="random secret string" value={secret}
                    onChange={e => setSecret(e.target.value)} />
                  <Button variant="outline" onClick={() => setSecret(crypto.randomUUID() + crypto.randomUUID().replace(/-/g, ""))}>
                    Tạo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dùng để ký payload — header <code>X-PayGate-Signature</code>.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={saveConfig} disabled={saving || !sub}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Lưu cấu hình
                </Button>
                <Button variant="outline" onClick={sendTest} disabled={testing || !callbackUrl}>
                  {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Gửi tín hiệu test
                </Button>
              </div>
              {!sub && (
                <p className="text-sm text-amber-500">⚠ Bạn cần đăng ký một gói cước trước khi cấu hình.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Docs */}
        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Tài liệu tích hợp</CardTitle>
              <CardDescription>Cách hệ thống bạn nhận tín hiệu nạp tiền tự động từ PayGate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">1. Quy ước nội dung chuyển khoản</h4>
                <p className="text-muted-foreground">
                  User trên hệ thống của bạn chuyển khoản với nội dung dạng:
                  <code className="mx-2 px-2 py-0.5 rounded bg-muted">PG-XXXXXX USER_REF</code>
                  trong đó <code>USER_REF</code> là ID user trong DB của bạn.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. PayGate gửi POST tới Callback URL</h4>
                <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs"><code>{`POST ${callbackUrl || "https://yoursite.com/api/paygate/topup"}
Content-Type: application/json
X-PayGate-Signature: <hex hmac sha256>
X-PayGate-Event: topup.success

{
  "event": "topup.success",
  "customer_ref": "USER_123",
  "amount": 100000,
  "transaction_id": "uuid",
  "merchant_id": "${merchant?.id ?? "..."}",
  "timestamp": "2026-05-08T12:00:00Z"
}`}</code></pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Code mẫu xử lý (Node.js / Express)</h4>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs"><code>{docsExample}</code></pre>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2"
                    onClick={() => { navigator.clipboard.writeText(docsExample); toast.success("Đã copy"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4. Phản hồi mong đợi</h4>
                <p className="text-muted-foreground">
                  HTTP 2xx → coi như thành công. HTTP khác → ghi log <code>failed</code>, có thể retry thủ công.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Nhật ký 10 callback gần nhất</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Chưa có callback nào.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 text-sm">
                      <div>
                        <p className="font-medium">{l.customer_ref ?? "—"} · {fmt(Number(l.amount))}đ</p>
                        <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("vi-VN")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {l.http_status && <Badge variant="outline">HTTP {l.http_status}</Badge>}
                        <Badge variant={l.status === "success" ? "default" : "destructive"}>{l.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GatewayRental;
