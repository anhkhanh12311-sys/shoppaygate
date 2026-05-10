import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, Webhook, Send, Check, AlertCircle, Eye, EyeOff, RefreshCw, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  merchant_id: string;
  business_name: string;
  email: string;
  webhook_url: string | null;
  webhook_enabled: boolean;
  topup_callback_url: string | null;
  topup_secret: string | null;
  has_subscription: boolean;
  plan_name: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const randomSecret = (len = 40) => {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
};

const useAutoSave = () => {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const schedule = (key: string, fn: () => Promise<void>, delay = 700) => {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => { void fn(); }, delay);
  };
  return schedule;
};

const AdminMerchantCallbacks = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const schedule = useAutoSave();

  const load = async () => {
    setLoading(true);
    const [{ data: merchants }, { data: subs }, { data: plans }] = await Promise.all([
      supabase.from("merchants")
        .select("id, business_name, email, webhook_url, webhook_enabled")
        .order("created_at", { ascending: false }),
      supabase.from("merchant_subscriptions")
        .select("merchant_id, topup_callback_url, topup_secret, plan_id"),
      supabase.from("subscription_plans").select("id, name"),
    ]);
    const planMap = Object.fromEntries((plans ?? []).map((p: any) => [p.id, p.name]));
    const subMap = Object.fromEntries((subs ?? []).map((s: any) => [s.merchant_id, s]));
    const merged: Row[] = (merchants ?? []).map((m: any) => {
      const s = subMap[m.id];
      return {
        merchant_id: m.id,
        business_name: m.business_name,
        email: m.email,
        webhook_url: m.webhook_url,
        webhook_enabled: !!m.webhook_enabled,
        topup_callback_url: s?.topup_callback_url ?? null,
        topup_secret: s?.topup_secret ?? null,
        has_subscription: !!s,
        plan_name: s ? (planMap[s.plan_id] ?? null) : null,
      };
    });
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.business_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.merchant_id === id ? { ...r, ...patch } : r)));

  const saveTopup = async (r: Row) => {
    setSaveState((s) => ({ ...s, [`topup:${r.merchant_id}`]: "saving" }));
    const { error } = await (supabase as any).rpc("admin_upsert_merchant_callback", {
      p_merchant_id: r.merchant_id,
      p_callback_url: r.topup_callback_url ?? "",
      p_secret: r.topup_secret ?? "",
    });
    if (error) {
      setSaveState((s) => ({ ...s, [`topup:${r.merchant_id}`]: "error" }));
      toast.error("Lưu thất bại: " + error.message);
    } else {
      setSaveState((s) => ({ ...s, [`topup:${r.merchant_id}`]: "saved" }));
      setTimeout(() => setSaveState((s) => ({ ...s, [`topup:${r.merchant_id}`]: "idle" })), 1500);
    }
  };

  const saveWebhook = async (r: Row) => {
    setSaveState((s) => ({ ...s, [`hook:${r.merchant_id}`]: "saving" }));
    const { error } = await (supabase as any).rpc("admin_set_merchant_webhook", {
      p_merchant_id: r.merchant_id,
      p_webhook_url: r.webhook_url ?? "",
      p_enabled: r.webhook_enabled,
    });
    if (error) {
      setSaveState((s) => ({ ...s, [`hook:${r.merchant_id}`]: "error" }));
      toast.error("Lưu thất bại: " + error.message);
    } else {
      setSaveState((s) => ({ ...s, [`hook:${r.merchant_id}`]: "saved" }));
      setTimeout(() => setSaveState((s) => ({ ...s, [`hook:${r.merchant_id}`]: "idle" })), 1500);
    }
  };

  const sendTest = async (r: Row) => {
    if (!r.topup_callback_url) {
      toast.error("Chưa có Callback URL");
      return;
    }
    toast.loading("Đang gửi test...", { id: `test-${r.merchant_id}` });
    const { data, error } = await supabase.functions.invoke("send-topup-callback", {
      body: { merchant_id: r.merchant_id, test: true, customer_ref: "TEST_USER", amount: 10000 },
    });
    if (error) {
      toast.error("Lỗi gửi test: " + error.message, { id: `test-${r.merchant_id}` });
    } else {
      toast.success(`Đã gửi test → HTTP ${(data as any)?.http_status ?? "?"}`, { id: `test-${r.merchant_id}` });
    }
  };

  const StatusBadge = ({ s }: { s: SaveState }) => {
    if (s === "saving") return <Badge variant="secondary" className="gap-1 text-[10px]"><Loader2 className="h-3 w-3 animate-spin" /> Đang lưu</Badge>;
    if (s === "saved") return <Badge className="gap-1 text-[10px] bg-success text-success-foreground"><Check className="h-3 w-3" /> Đã lưu</Badge>;
    if (s === "error") return <Badge variant="destructive" className="gap-1 text-[10px]"><AlertCircle className="h-3 w-3" /> Lỗi</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Webhook className="h-7 w-7 text-primary" /> Callback merchant
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cấu hình URL callback gửi tín hiệu <code className="px-1 rounded bg-muted">topup.success</code> và <code className="px-1 rounded bg-muted">payment.completed</code> cho từng merchant. Tự động lưu khi thay đổi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm merchant..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" size="icon" onClick={load} title="Tải lại">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Không có merchant nào</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r) => {
            const sk = `secret:${r.merchant_id}`;
            const showSec = !!showSecrets[r.merchant_id];
            return (
              <Card key={r.merchant_id} className="overflow-hidden">
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Merchant header */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.business_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.plan_name && <Badge variant="outline">{r.plan_name}</Badge>}
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {r.merchant_id.slice(0, 8)}
                      </Badge>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { navigator.clipboard.writeText(r.merchant_id); toast.success("Đã copy ID"); }}
                        title="Copy merchant ID"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="topup">
                    <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-grid">
                      <TabsTrigger value="topup" className="gap-1.5"><Send className="h-3.5 w-3.5" /> topup.success</TabsTrigger>
                      <TabsTrigger value="payment" className="gap-1.5"><Webhook className="h-3.5 w-3.5" /> payment.completed</TabsTrigger>
                    </TabsList>

                    {/* TOPUP CALLBACK (gateway rental) */}
                    <TabsContent value="topup" className="space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Callback URL</Label>
                        <StatusBadge s={saveState[`topup:${r.merchant_id}`] ?? "idle"} />
                      </div>
                      <Input
                        placeholder="https://yourapp.com/api/paygate/topup"
                        value={r.topup_callback_url ?? ""}
                        onChange={(e) => {
                          setRow(r.merchant_id, { topup_callback_url: e.target.value });
                          schedule(`topup:${r.merchant_id}`, () => saveTopup({ ...r, topup_callback_url: e.target.value }));
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">HMAC secret</Label>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => setShowSecrets((s) => ({ ...s, [r.merchant_id]: !s[r.merchant_id] }))}>
                            {showSec ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => {
                              const s = randomSecret();
                              setRow(r.merchant_id, { topup_secret: s });
                              void saveTopup({ ...r, topup_secret: s });
                              toast.success("Đã sinh secret mới");
                            }}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sinh
                          </Button>
                        </div>
                      </div>
                      <Input
                        type={showSec ? "text" : "password"}
                        placeholder="Secret để ký HMAC-SHA256 payload"
                        value={r.topup_secret ?? ""}
                        onChange={(e) => {
                          setRow(r.merchant_id, { topup_secret: e.target.value });
                          schedule(`topup:${r.merchant_id}`, () => saveTopup({ ...r, topup_secret: e.target.value }));
                        }}
                        className="font-mono text-xs"
                      />
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => sendTest(r)} disabled={!r.topup_callback_url}>
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Gửi test
                        </Button>
                        {!r.has_subscription && (
                          <Badge variant="outline" className="text-[10px]">Chưa có gói — sẽ tự tạo Free khi lưu</Badge>
                        )}
                      </div>
                    </TabsContent>

                    {/* PAYMENT.COMPLETED WEBHOOK */}
                    <TabsContent value="payment" className="space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Webhook URL (mỗi giao dịch link)</Label>
                        <StatusBadge s={saveState[`hook:${r.merchant_id}`] ?? "idle"} />
                      </div>
                      <Input
                        placeholder="https://yourapp.com/api/paygate/payment"
                        value={r.webhook_url ?? ""}
                        onChange={(e) => {
                          setRow(r.merchant_id, { webhook_url: e.target.value });
                          schedule(`hook:${r.merchant_id}`, () => saveWebhook({ ...r, webhook_url: e.target.value }));
                        }}
                      />
                      <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/40">
                        <div>
                          <div className="text-sm font-medium">Bật webhook</div>
                          <div className="text-xs text-muted-foreground">Khi tắt, hệ thống không gửi event payment.completed.</div>
                        </div>
                        <Switch
                          checked={r.webhook_enabled}
                          onCheckedChange={(v) => {
                            setRow(r.merchant_id, { webhook_enabled: v });
                            void saveWebhook({ ...r, webhook_enabled: v });
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Bí mật ký HMAC dùng <code>webhook_secret</code> ở bảng <code>merchant_secrets</code>, do chính merchant cấu hình.
                      </p>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminMerchantCallbacks;
