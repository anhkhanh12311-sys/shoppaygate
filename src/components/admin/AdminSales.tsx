import { useEffect, useState } from "react";
import { ShoppingBag, Package, Wallet, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import StatCard from "@/components/shared/StatCard";
import DataTableShell from "@/components/shared/DataTableShell";
import { vnd, dt } from "@/components/shared/format";

const ORDER_STATUSES = ["pending", "paid", "shipping", "completed", "cancelled", "refunded"];

const statusTone = (s: string) =>
  s === "paid" || s === "completed"
    ? "bg-emerald-500/15 text-emerald-400"
    : s === "cancelled" || s === "refunded"
    ? "bg-destructive/15 text-destructive"
    : s === "shipping"
    ? "bg-primary/15 text-primary"
    : "bg-muted text-muted-foreground";

const AdminSales = () => {
  const [overview, setOverview] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const client = supabase as any;
    const [ov, or_, pr] = await Promise.all([
      client.rpc("admin_sales_overview"),
      client.rpc("admin_list_orders", {
        p_status: statusFilter === "all" ? null : statusFilter,
        p_search: orderSearch || null,
        p_limit: 100,
      }),
      client.rpc("admin_list_products", { p_search: productSearch || null, p_limit: 100 }),
    ]);
    if (ov.error) toast.error(ov.error.message);
    setOverview(ov.data ?? null);
    setOrders(or_.data ?? []);
    setProducts(pr.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSearch, productSearch]);

  const changeStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).rpc("admin_set_order_status", {
      p_order_id: id,
      p_status: status,
    });
    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật trạng thái đơn");
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Bán hàng toàn hệ thống</h2>
        <p className="text-sm text-muted-foreground">Đơn hàng và sản phẩm của mọi merchant</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tổng đơn" value={overview?.orders_total ?? 0} icon={ShoppingBag} loading={loading} />
        <StatCard label="Đơn đã thu" value={overview?.orders_paid ?? 0} icon={ShoppingBag} tone="success" loading={loading} />
        <StatCard label="Doanh thu đơn" value={vnd(overview?.orders_revenue)} icon={Wallet} tone="accent" loading={loading} />
        <StatCard label="Sản phẩm đang bán" value={`${overview?.products_active ?? 0}/${overview?.products_total ?? 0}`} icon={Package} loading={loading} />
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="rounded-xl">
          <TabsTrigger value="orders" className="rounded-lg">Đơn hàng</TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg">Sản phẩm</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <DataTableShell
            title="Đơn hàng"
            description={`${orders.length} đơn gần nhất`}
            icon={ShoppingBag}
            search={orderSearch}
            onSearchChange={setOrderSearch}
            searchPlaceholder="Mã đơn, khách, shop..."
            onRefresh={load}
            loading={loading}
            isEmpty={orders.length === 0}
            emptyText="Chưa có đơn hàng nào"
            filters={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          >
            <div className="space-y-1.5">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.order_code ?? "—"}</span>
                      <Badge className={`rounded-md border-0 text-[10px] ${statusTone(o.status)}`}>
                        {o.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.business_name ?? "—"} · {o.customer_name ?? "Khách lẻ"} · {dt(o.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-emerald-400">{vnd(o.total)}</span>
                    <Select value={o.status} onValueChange={(v) => changeStatus(o.id, v)}>
                      <SelectTrigger className="h-8 w-[120px] rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </DataTableShell>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <DataTableShell
            title="Sản phẩm"
            description={`${products.length} sản phẩm gần nhất`}
            icon={Package}
            search={productSearch}
            onSearchChange={setProductSearch}
            searchPlaceholder="Tên sản phẩm, shop..."
            onRefresh={load}
            loading={loading}
            isEmpty={products.length === 0}
            emptyText="Chưa có sản phẩm nào"
          >
            <div className="space-y-1.5">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.business_name ?? "—"} · Tồn {p.unlimited_stock ? "∞" : p.stock} · Đã bán {p.sold_count}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-sm font-bold">{vnd(p.sale_price ?? p.price)}</span>
                    <Badge
                      className={`rounded-md border-0 text-[10px] ${
                        p.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.is_active ? "Đang bán" : "Ẩn"}
                    </Badge>
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

export default AdminSales;
