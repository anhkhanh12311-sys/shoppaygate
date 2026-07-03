import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Radio, RefreshCw, Zap, AlertTriangle, CheckCircle2,
  Clock, Activity, Server, Database, Loader2, PlayCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/ui/kpi-card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Overview {
  total_merchants: number;
  merchants_with_bank_key: number;
  merchants_with_secret_key: number;
  merchants_no_signal: number;
  webhook_hits_24h: number;
  webhook_hits_1h: number;
  pending_links: number;
  pending_links_1h: number;
  last_webhook_at: string | null;
  per_merchant: Array<{
    merchant_id: string;
    business_name: string;
    email: string;
    banks_total: number;
    banks_with_key: number;
    has_secret: boolean;
    webhook_24h: number;
    pending_links: number;
  }>;
}

interface CronHealth {
  jobs: Array<{ jobid: number; jobname: string; schedule: string; active: boolean }>;
  recent_runs: Array<{ jobid: number; status: string; return_message: string; start_time: string; end_time: string }>;
}

const AdminSepayMonitor = () => {
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cron, setCron] = useState<CronHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, cr] = await Promise.all([
      supabase.rpc("get_admin_sepay_overview"),
      supabase.rpc("get_admin_cron_health"),
    ]);
    if (ov.data) setOverview(ov.data as unknown as Overview);
    if (cr.data) setCron(cr.data as unknown as CronHealth);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const triggerPollAll = async () => {
    setPolling(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-pending-transactions", {
        body: { trigger: "admin-manual" },
      });
      if (error) throw error;
      toast({
        title: "Đã kích hoạt polling",
        description: `Nguồn quét: ${data?.polled_pairs ?? 0} · Khớp mới: ${data?.matched ?? 0} · Trùng: ${data?.duplicate ?? 0}`,
      });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi", description: e.message });
    } finally {
      setPolling(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const cronActive = cron?.jobs.some(j => j.jobname === "sepay-poll-every-minute" && j.active);
  const lastRun = cron?.recent_runs[0];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <Radio className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Giám sát SePay</h1>
            <p className="text-sm text-muted-foreground">
              Trạng thái polling tự động toàn hệ thống + tín hiệu webhook mỗi cửa hàng
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button size="sm" onClick={triggerPollAll} disabled={polling}
            className="bg-gradient-to-r from-primary to-secondary">
            {polling
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang chạy…</>
              : <><Zap className="h-4 w-4 mr-2" /> Poll tất cả ngay</>}
          </Button>
        </div>
      </motion.div>

      {/* Cron status banner */}
      <Card className={cronActive ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}>
        <CardContent className="p-4 flex items-center gap-3">
          {cronActive
            ? <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
            : <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {cronActive ? "Cron polling đang hoạt động" : "Cron polling đang tắt"}
            </p>
            <p className="text-xs text-muted-foreground">
              {cronActive
                ? `Job: sepay-poll-every-minute · Chạy mỗi phút · ${cron?.recent_runs.length ?? 0} lượt chạy gần nhất`
                : "Không tìm thấy job cron. Cần bật lại pg_cron."}
            </p>
          </div>
          {lastRun && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {new Date(lastRun.start_time).toLocaleTimeString("vi-VN")}
              <span className={lastRun.status === "succeeded" ? "text-green-600" : "text-red-600"}>
                · {lastRun.status}
              </span>
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* KPI grid */}
      {overview && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Webhook 1h" value={overview.webhook_hits_1h} icon={Activity}
            hint={`${overview.webhook_hits_24h} sự kiện / 24h`}
            accent="from-green-500/20 to-green-500/5" />
          <KpiCard label="Link đang chờ" value={overview.pending_links} icon={Clock}
            hint={`+${overview.pending_links_1h} trong 1h qua`}
            accent="from-amber-500/20 to-amber-500/5" />
          <KpiCard label="Merchant có SePay key" value={`${overview.merchants_with_bank_key + overview.merchants_with_secret_key}`}
            icon={Server} hint={`${overview.merchants_no_signal} merchant chưa cấu hình`}
            accent="from-blue-500/20 to-blue-500/5" />
          <KpiCard label="Tổng merchant" value={overview.total_merchants} icon={Database}
            hint={overview.last_webhook_at
              ? `Webhook cuối: ${new Date(overview.last_webhook_at).toLocaleTimeString("vi-VN")}`
              : "Chưa có webhook nào"}
            accent="from-purple-500/20 to-purple-500/5" />
        </div>
      )}

      {/* Per-merchant table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-primary" /> Chi tiết theo cửa hàng
          </CardTitle>
          <CardDescription>Cửa hàng thiếu tín hiệu sẽ được đánh dấu đỏ</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">Cửa hàng</th>
                  <th className="text-center px-3 py-2.5">Bank</th>
                  <th className="text-center px-3 py-2.5">SePay key</th>
                  <th className="text-center px-3 py-2.5">Webhook 24h</th>
                  <th className="text-center px-3 py-2.5">Link chờ</th>
                  <th className="text-center px-3 py-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {overview?.per_merchant.map((m) => {
                  const hasSignal = m.banks_with_key > 0 || m.has_secret;
                  const healthy = hasSignal && (m.webhook_24h > 0 || m.pending_links === 0);
                  return (
                    <tr key={m.merchant_id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <div className="font-medium truncate max-w-[220px]">{m.business_name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">{m.email}</div>
                      </td>
                      <td className="text-center px-3 py-2.5">{m.banks_total}</td>
                      <td className="text-center px-3 py-2.5">
                        <Badge variant={m.banks_with_key + (m.has_secret ? 1 : 0) > 0 ? "default" : "outline"}
                          className="font-mono text-xs">
                          {m.banks_with_key}{m.has_secret ? " + 1S" : ""}
                        </Badge>
                      </td>
                      <td className="text-center px-3 py-2.5">
                        <span className={m.webhook_24h > 0 ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                          {m.webhook_24h}
                        </span>
                      </td>
                      <td className="text-center px-3 py-2.5">
                        {m.pending_links > 0
                          ? <Badge variant="outline" className="border-amber-500/40 text-amber-700">{m.pending_links}</Badge>
                          : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="text-center px-3 py-2.5">
                        {!hasSignal
                          ? <Badge className="bg-red-500/15 text-red-700 border-red-500/30">Chưa cấu hình</Badge>
                          : healthy
                            ? <Badge className="bg-green-500/15 text-green-700 border-green-500/30">OK</Badge>
                            : <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Chờ tín hiệu</Badge>}
                      </td>
                    </tr>
                  );
                })}
                {(overview?.per_merchant.length ?? 0) === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có cửa hàng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cron run log */}
      {cron && cron.recent_runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlayCircle className="h-4 w-4 text-primary" /> Nhật ký cron (20 lượt gần nhất)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y">
              {cron.recent_runs.map((r, i) => (
                <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                  <Badge variant={r.status === "succeeded" ? "default" : "destructive"}
                    className="w-20 justify-center capitalize">{r.status}</Badge>
                  <span className="text-muted-foreground w-40">
                    {new Date(r.start_time).toLocaleString("vi-VN")}
                  </span>
                  <span className="text-muted-foreground truncate flex-1">{r.return_message || "—"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSepayMonitor;
