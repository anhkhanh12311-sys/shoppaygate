import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import DataTableShell from "@/components/shared/DataTableShell";
import StatCard from "@/components/shared/StatCard";
import { vnd, dateOnly } from "@/components/shared/format";

const AdminVouchers = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_vouchers", { p_limit: 200 });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).rpc("admin_toggle_voucher", {
      p_voucher_id: id,
      p_active: active,
    });
    if (error) return toast.error(error.message);
    toast.success(active ? "Đã bật voucher" : "Đã tắt voucher");
    setRows((r) => r.map((v) => (v.id === id ? { ...v, is_active: active } : v)));
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (v) =>
          v.code?.toLowerCase().includes(q) ||
          v.name?.toLowerCase().includes(q) ||
          v.business_name?.toLowerCase().includes(q),
      )
    : rows;

  const activeCount = rows.filter((v) => v.is_active).length;
  const totalUsed = rows.reduce((s, v) => s + (v.used_count ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Voucher toàn cục</h2>
        <p className="text-sm text-muted-foreground">Theo dõi và kiểm soát voucher của mọi shop</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Tổng voucher" value={rows.length} icon={Ticket} loading={loading} />
        <StatCard label="Đang hoạt động" value={activeCount} tone="success" loading={loading} />
        <StatCard label="Lượt sử dụng" value={totalUsed} tone="accent" loading={loading} />
      </div>

      <DataTableShell
        title="Danh sách voucher"
        description={`${filtered.length} voucher`}
        icon={Ticket}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Mã, tên, shop..."
        onRefresh={load}
        loading={loading}
        isEmpty={filtered.length === 0}
        emptyText="Chưa có voucher nào"
      >
        <div className="space-y-1.5">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{v.code}</span>
                  <Badge className="rounded-md border-0 bg-primary/15 text-[10px] text-primary">
                    {v.type === "percent" ? `${v.value}%` : v.type === "freeship" ? "Freeship" : vnd(v.value)}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {v.business_name ?? "—"} · Dùng {v.used_count}
                  {v.usage_limit ? `/${v.usage_limit}` : ""} · HSD {dateOnly(v.expires_at)}
                </p>
              </div>
              <Switch checked={!!v.is_active} onCheckedChange={(c) => toggle(v.id, c)} />
            </div>
          ))}
        </div>
      </DataTableShell>
    </div>
  );
};

export default AdminVouchers;
