import { useState, useEffect } from "react";
import { Rocket, RefreshCw, Copy, KeyRound, Webhook, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useTopupRental } from "@/hooks/useTopupRental";
import { KpiCard } from "@/components/ui/kpi-card";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const TopupRentalCenter = () => {
  const { data, logs, loading, regenerateSecret, updateCallbackUrl, retryCallback } = useTopupRental();
  const [callbackUrl, setCallbackUrl] = useState("");
  const [secret, setSecret] = useState("");

  useEffect(() => {
    if (data?.subscription) {
      setCallbackUrl(data.subscription.topup_callback_url || "");
    }
  }, [data]);

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  }

  const sub = data?.subscription;
  const successRate = data && data.callbacks_total > 0
    ? (data.callbacks_success / data.callbacks_total) * 100 : 0;
  const quotaPercent = sub?.tx_quota_limit ? (sub.tx_quota_used / sub.tx_quota_limit) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" /> Trung tâm thuê nạp tiền
        </h1>
        <p className="text-sm text-muted-foreground">Theo dõi callback, hạn mức giao dịch và cấu hình webhook</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Callback thành công" value={`${data?.callbacks_success || 0}/${data?.callbacks_total || 0}`}
          icon={CheckCircle2} hint={`${successRate.toFixed(1)}% tỉ lệ`} accent="from-emerald-500/15 to-transparent" />
        <KpiCard label="Đang chờ retry" value={data?.callbacks_pending_retry || 0}
          icon={Clock} accent="from-orange-500/15 to-transparent" />
        <KpiCard label="GD hôm nay" value={fmt(data?.today_topups || 0)} icon={Send} />
        <KpiCard label="Số tiền hôm nay" value={fmt(data?.today_amount || 0) + "₫"} icon={Rocket}
          accent="from-blue-500/15 to-transparent" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Quota */}
        <div className="rounded-2xl border bg-card/40 backdrop-blur-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Hạn mức giao dịch</p>
            <Badge variant={sub?.status === "active" ? "default" : "secondary"}>{sub?.status || "—"}</Badge>
          </div>
          {sub?.tx_quota_limit ? (
            <>
              <p className="text-3xl font-bold">{fmt(sub.tx_quota_used)}<span className="text-base text-muted-foreground"> / {fmt(sub.tx_quota_limit)}</span></p>
              <Progress value={quotaPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Reset vào {sub.quota_reset_at ? new Date(sub.quota_reset_at).toLocaleDateString("vi-VN") : "—"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Gói hiện tại không giới hạn giao dịch</p>
          )}
          {sub?.expires_at && (
            <p className="text-xs text-muted-foreground">Hết hạn: {new Date(sub.expires_at).toLocaleDateString("vi-VN")}</p>
          )}
        </div>

        {/* Webhook config */}
        <div className="rounded-2xl border bg-card/40 backdrop-blur-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <p className="font-semibold">Cấu hình Callback</p>
          </div>
          <div>
            <Label className="text-xs">Callback URL</Label>
            <Input value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)} placeholder="https://your-app.com/topup-callback" />
          </div>
          <div>
            <Label className="text-xs">Webhook Secret (HMAC-SHA256)</Label>
            <div className="flex gap-2">
              <Input value={secret} onChange={e => setSecret(e.target.value)} placeholder="whsec_..." type="password" />
              <Button variant="outline" size="icon" onClick={async () => { const s = await regenerateSecret(); if (s) setSecret(s); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {sub?.has_secret && <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Đã có secret. Để trống nếu không đổi.</p>}
          </div>
          <Button className="w-full" onClick={() => updateCallbackUrl(callbackUrl, secret)}>Lưu cấu hình</Button>
        </div>
      </div>

      {/* Callback logs */}
      <div className="rounded-2xl border bg-card/40 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">Nhật ký callback gần đây</p>
          <Badge variant="outline">{logs.length} bản ghi</Badge>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-8">Chưa có callback nào</p>
        ) : (
          <div className="space-y-2">
            {logs.map(l => (
              <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl border bg-background/30 hover:border-primary/30 transition">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  l.status === "success" ? "bg-emerald-500/15 text-emerald-500" :
                  l.status === "failed" ? "bg-destructive/15 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {l.status === "success" ? <CheckCircle2 className="h-4 w-4" /> :
                    l.status === "failed" ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={l.status === "success" ? "default" : l.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                      {l.status} {l.response_code && `· ${l.response_code}`}
                    </Badge>
                    {l.retry_count > 0 && <Badge variant="outline" className="text-[10px]">Retry #{l.retry_count}</Badge>}
                    <span className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString("vi-VN")}</span>
                  </div>
                  {l.last_error && <p className="text-xs text-destructive mt-1 truncate">{l.last_error}</p>}
                  <p className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                    {JSON.stringify(l.payload).slice(0, 140)}
                  </p>
                </div>
                {l.status === "failed" && l.retry_count < 5 && (
                  <Button size="sm" variant="outline" onClick={() => retryCallback(l.id)}>Thử lại</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopupRentalCenter;
