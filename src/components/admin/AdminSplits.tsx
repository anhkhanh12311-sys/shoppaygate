import { useEffect, useState } from "react";
import { Split } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DataTableShell from "@/components/shared/DataTableShell";
import StatCard from "@/components/shared/StatCard";
import { vnd, dt } from "@/components/shared/format";

const AdminSplits = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_split_executions", { p_limit: 200 });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = rows.reduce((s, r) => s + Number(r.amount_total ?? 0), 0);
  const shops = new Set(rows.map((r) => r.merchant_id)).size;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Chia doanh thu & Đối soát</h2>
        <p className="text-sm text-muted-foreground">Lịch sử tự động chia tiền khi giao dịch thành công</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Lượt chia" value={rows.length} icon={Split} loading={loading} />
        <StatCard label="Tổng tiền đã chia" value={vnd(total)} tone="accent" loading={loading} />
        <StatCard label="Số shop áp dụng" value={shops} tone="success" loading={loading} />
      </div>

      <DataTableShell
        title="Lịch sử chia"
        description={`${rows.length} lượt gần nhất`}
        icon={Split}
        onRefresh={load}
        loading={loading}
        isEmpty={rows.length === 0}
        emptyText="Chưa có lượt chia doanh thu nào"
      >
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.business_name ?? "—"}</span>
                    <Badge className="rounded-md border-0 bg-primary/15 text-[10px] text-primary">{r.status}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{dt(r.created_at)}</p>
                </div>
                <span className="shrink-0 font-display text-sm font-bold text-emerald-400">{vnd(r.amount_total)}</span>
              </div>
              {Array.isArray(r.breakdown) && r.breakdown.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.breakdown.map((b: any, i: number) => (
                    <span key={i} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      {b.label ?? b.bank_id?.slice(0, 8) ?? "NH"} · {b.percent}% · {vnd(b.amount)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DataTableShell>
    </div>
  );
};

export default AdminSplits;
