import { useEffect, useState } from "react";
import { Clock, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTableShell from "@/components/shared/DataTableShell";
import StatCard from "@/components/shared/StatCard";
import { dt } from "@/components/shared/format";

const MANUAL_JOBS = [
  { fn: "check-pending-transactions", label: "Quét giao dịch chờ" },
  { fn: "recurring-billing-cron", label: "Thu đăng ký định kỳ" },
  { fn: "invoice-reminder-cron", label: "Nhắc nợ hóa đơn" },
];

const AdminCronJobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_cron_jobs");
    if (error) toast.error(error.message);
    setJobs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = async (fn: string) => {
    setRunning(fn);
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    setRunning(null);
    if (error) return toast.error(`${fn}: ${error.message}`);
    toast.success(`${fn} đã chạy`, { description: JSON.stringify(data).slice(0, 120) });
    load();
  };

  const active = jobs.filter((j) => j.active).length;
  const failed = jobs.filter((j) => j.last_status && j.last_status !== "succeeded").length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Cron & Jobs</h2>
        <p className="text-sm text-muted-foreground">Lịch chạy tự động và chạy tay khi cần</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Tổng job" value={jobs.length} icon={Clock} loading={loading} />
        <StatCard label="Đang bật" value={active} tone="success" loading={loading} />
        <StatCard label="Lần chạy lỗi" value={failed} tone={failed ? "danger" : "default"} loading={loading} />
      </div>

      <DataTableShell
        title="Lịch chạy tự động"
        description={`${jobs.length} job trong hệ thống`}
        icon={Clock}
        onRefresh={load}
        loading={loading}
        isEmpty={jobs.length === 0}
        emptyText="Chưa có job nào được lên lịch"
      >
        <div className="space-y-1.5">
          {jobs.map((j) => (
            <div key={j.jobid} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{j.jobname ?? `job #${j.jobid}`}</span>
                  <Badge
                    className={`rounded-md border-0 text-[10px] ${
                      j.active ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {j.active ? "on" : "off"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{j.schedule}</span> · Lần cuối {dt(j.last_run)}
                  {j.last_status ? ` · ${j.last_status}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DataTableShell>

      <DataTableShell title="Chạy tay" description="Gọi trực tiếp tác vụ nền" icon={PlayCircle}>
        <div className="grid gap-2 sm:grid-cols-3">
          {MANUAL_JOBS.map((j) => (
            <Button
              key={j.fn}
              variant="outline"
              className="h-auto flex-col items-start gap-1 rounded-xl px-3 py-3 text-left"
              disabled={running === j.fn}
              onClick={() => runNow(j.fn)}
            >
              <span className="text-sm font-semibold">{j.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{j.fn}</span>
            </Button>
          ))}
        </div>
      </DataTableShell>
    </div>
  );
};

export default AdminCronJobs;
