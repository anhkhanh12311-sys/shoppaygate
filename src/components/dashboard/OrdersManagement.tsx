import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, Search, Phone, MapPin, Clock, Eye, Package, CheckCircle2,
  Truck, XCircle, Wallet, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useOrders, Order, OrderStatus, OrderItem } from "@/hooks/useOrders";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const STATUS_META: Record<OrderStatus, { label: string; cls: string; icon: any }> = {
  pending:   { label: "Chờ thanh toán", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
  paid:      { label: "Đã thanh toán",  cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  shipping:  { label: "Đang giao",      cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: Truck },
  completed: { label: "Hoàn tất",       cls: "bg-primary/15 text-primary border-primary/30", icon: CheckCircle2 },
  cancelled: { label: "Đã huỷ",         cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  refunded:  { label: "Hoàn tiền",      cls: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

const OrdersManagement = () => {
  const { orders, stats, loading, updateStatus, getItems } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [viewing, setViewing] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  const filtered = useMemo(() => orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_code.toLowerCase().includes(q) ||
      (o.customer_name || "").toLowerCase().includes(q) ||
      (o.customer_phone || "").includes(q)
    );
  }), [orders, statusFilter, search]);

  const openOrder = async (o: Order) => {
    setViewing(o);
    setItems(await getItems(o.id));
  };

  const STATS = [
    { label: "Đơn hôm nay", value: stats.orders_today, icon: ShoppingBag, color: "text-primary" },
    { label: "DT hôm nay", value: `${fmt(stats.revenue_today)}₫`, icon: Wallet, color: "text-emerald-500" },
    { label: "Chờ xử lý", value: stats.pending_orders, icon: Clock, color: "text-amber-500" },
    { label: "Tổng DT cửa hàng", value: `${fmt(stats.total_revenue)}₫`, icon: TrendingUp, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Đơn hàng</h1>
            <p className="text-muted-foreground text-sm">Theo dõi & xử lý đơn từ storefront</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(s => (
          <Card key={s.label} className="border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-lg font-bold tabular-nums truncate">
                {typeof s.value === "number" ? fmt(s.value) : s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã đơn, tên khách, SĐT..." className="pl-9 h-10" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="md:w-48 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Chưa có đơn hàng nào.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((o) => {
                const meta = STATUS_META[o.status];
                const Icon = meta.icon;
                return (
                  <div key={o.id} className="p-3 md:p-4 flex items-center gap-3 hover:bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm font-mono">{o.order_code}</p>
                        <Badge variant="outline" className={`text-[10px] h-5 ${meta.cls}`}>
                          <Icon className="h-3 w-3 mr-1" />{meta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="truncate">{o.customer_name || "Khách lẻ"}</span>
                        {o.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{o.customer_phone}</span>}
                        <span>{formatDistanceToNow(new Date(o.created_at), { addSuffix: true, locale: vi })}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums text-primary">{fmt(o.total)}₫</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openOrder(o)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{viewing?.order_code}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/40 p-3 space-y-1.5 text-sm">
                <p className="font-semibold">{viewing.customer_name || "Khách lẻ"}</p>
                {viewing.customer_phone && <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{viewing.customer_phone}</p>}
                {viewing.customer_address && <p className="flex items-start gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5 mt-0.5" />{viewing.customer_address}</p>}
                {viewing.note && <p className="text-xs text-muted-foreground italic pt-1 border-t">Ghi chú: {viewing.note}</p>}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Sản phẩm</p>
                <div className="divide-y rounded-xl border">
                  {items.map(it => (
                    <div key={it.id} className="p-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                        {it.product_image && <img src={it.product_image} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{it.product_name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(it.unit_price)}₫ × {it.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{fmt(it.line_total)}₫</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border p-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Tạm tính</span><span>{fmt(viewing.subtotal)}₫</span></div>
                {viewing.shipping_fee > 0 && <div className="flex justify-between text-muted-foreground"><span>Phí ship</span><span>{fmt(viewing.shipping_fee)}₫</span></div>}
                <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Tổng cộng</span><span className="text-primary">{fmt(viewing.total)}₫</span></div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Cập nhật trạng thái</p>
                <Select value={viewing.status} onValueChange={(v) => updateStatus(viewing.id, v as OrderStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersManagement;
