import { useEffect, useState } from "react";
import { FileText, Repeat, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import DataTableShell from "@/components/shared/DataTableShell";
import StatCard from "@/components/shared/StatCard";
import { vnd, dt, dateOnly } from "@/components/shared/format";

const invoiceTone = (s: string) =>
  s === "paid"
    ? "bg-emerald-500/15 text-emerald-400"
    : s === "overdue"
    ? "bg-destructive/15 text-destructive"
    : s === "sent"
    ? "bg-primary/15 text-primary"
    : "bg-muted text-muted-foreground";

const AdminBilling = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const client = supabase as any;
    const [inv, sb] = await Promise.all([
      client.rpc("admin_list_invoices", { p_status: null, p_limit: 150 }),
      client.rpc("admin_list_subscriptions", { p_limit: 150 }),
    ]);
    if (inv.error) toast.error(inv.error.message);
    setInvoices(inv.data ?? []);
    setSubs(sb.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const chargeNow = async (id: string) => {
    setCharging(id);
    const { data, error } = await (supabase as any).rpc("admin_charge_subscription", { p_sub_id: id });
    setCharging(null);
    if (error) return toast.error(error.message);
    toast.success(`Đã tạo link thu tiền: ${data}`);
    load();
  };

  const mrr = subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => {
      const perMonth =
        s.interval_unit === "month"
          ? Number(s.price) / Number(s.interval_count || 1)
          : s.interval_unit === "year"
          ? Number(s.price) / (12 * Number(s.interval_count || 1))
          : s.interval_unit === "week"
          ? (Number(s.price) * 52) / 12 / Number(s.interval_count || 1)
          : (Number(s.price) * 30) / Number(s.interval_count || 1);
      return sum + perMonth;
    }, 0);

  const unpaid = invoices.filter((i) => i.status !== "paid");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Hóa đơn & Đăng ký định kỳ</h2>
        <p className="text-sm text-muted-foreground">Giám sát dòng tiền định kỳ toàn hệ thống</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Hóa đơn" value={invoices.length} icon={FileText} loading={loading} />
        <StatCard label="Chưa thanh toán" value={unpaid.length} tone="warning" loading={loading} />
        <StatCard label="Đăng ký hoạt động" value={subs.filter((s) => s.status === "active").length} icon={Repeat} tone="success" loading={loading} />
        <StatCard label="MRR ước tính" value={vnd(Math.round(mrr))} tone="accent" loading={loading} />
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="rounded-xl">
          <TabsTrigger value="invoices" className="rounded-lg">Hóa đơn</TabsTrigger>
          <TabsTrigger value="subs" className="rounded-lg">Đăng ký định kỳ</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <DataTableShell
            title="Hóa đơn toàn hệ thống"
            description={`${invoices.length} hóa đơn`}
            icon={FileText}
            onRefresh={load}
            loading={loading}
            isEmpty={invoices.length === 0}
            emptyText="Chưa có hóa đơn nào"
          >
            <div className="space-y-1.5">
              {invoices.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{i.invoice_number}</span>
                      <Badge className={`rounded-md border-0 text-[10px] ${invoiceTone(i.status)}`}>{i.status}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.business_name ?? "—"} · {i.customer_name} · Hạn {dateOnly(i.due_date)} · Nhắc {i.reminder_count}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-sm font-bold">{vnd(i.total)}</span>
                </div>
              ))}
            </div>
          </DataTableShell>
        </TabsContent>

        <TabsContent value="subs" className="mt-4">
          <DataTableShell
            title="Đăng ký định kỳ"
            description={`${subs.length} đăng ký`}
            icon={Repeat}
            onRefresh={load}
            loading={loading}
            isEmpty={subs.length === 0}
            emptyText="Chưa có đăng ký định kỳ nào"
          >
            <div className="space-y-1.5">
              {subs.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-border/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{s.plan_name}</span>
                      <Badge
                        className={`rounded-md border-0 text-[10px] ${
                          s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.business_name ?? "—"} · {s.customer_name} · Kỳ tới {dt(s.next_charge_at)} · Đã thu {s.charge_count} lần
                      {s.last_charged_at ? ` (gần nhất ${dt(s.last_charged_at)})` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-sm font-bold">{vnd(s.price)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs"
                      disabled={charging === s.id}
                      onClick={() => chargeNow(s.id)}
                    >
                      <Zap className="mr-1 h-3 w-3" /> Thu ngay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DataTableShell>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBilling;
