import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DataTableShell from "@/components/shared/DataTableShell";
import { dt } from "@/components/shared/format";

const AdminAuditLogs = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_audit_logs", { p_limit: 200 });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.action?.toLowerCase().includes(q) ||
          r.actor_email?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q),
      )
    : rows;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Nhật ký hoạt động</h2>
        <p className="text-sm text-muted-foreground">Mọi hành động quản trị và tác vụ nền đều được ghi lại</p>
      </div>

      <DataTableShell
        title="Audit log"
        description={`${filtered.length} bản ghi gần nhất`}
        icon={ScrollText}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Hành động, người thực hiện..."
        onRefresh={load}
        loading={loading}
        isEmpty={filtered.length === 0}
        emptyText="Chưa có hoạt động nào được ghi"
      >
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge className="rounded-md border-0 bg-primary/15 font-mono text-[10px] text-primary">
                    {r.action}
                  </Badge>
                  <span className="truncate text-sm">{r.description ?? "—"}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{dt(r.created_at)}</span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {r.actor_email ?? "hệ thống"}
                {r.target_type ? ` · ${r.target_type}` : ""}
                {r.target_id ? ` · ${String(r.target_id).slice(0, 8)}` : ""}
              </p>
            </div>
          ))}
        </div>
      </DataTableShell>
    </div>
  );
};

export default AdminAuditLogs;
