import { useState } from "react";
import { Ticket, Plus, Trash2, Copy, Percent, DollarSign, Truck, TrendingUp, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useVouchers, Voucher } from "@/hooks/useVouchers";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const VouchersManagement = () => {
  const { vouchers, stats, loading, create, update, remove } = useVouchers();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "", name: "", type: "percent" as Voucher["type"], value: 10,
    min_order: 0, max_discount: 0, usage_limit: 0, expires_at: "", description: "",
  });

  const save = async () => {
    if (!form.code.trim()) return toast.error("Nhập mã giảm giá");
    await create({
      code: form.code,
      name: form.name || null,
      type: form.type,
      value: Number(form.value),
      min_order: Number(form.min_order) || 0,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at || null,
      description: form.description || null,
      is_active: true,
    });
    setOpen(false);
    setForm({ code: "", name: "", type: "percent", value: 10, min_order: 0, max_discount: 0, usage_limit: 0, expires_at: "", description: "" });
  };

  const typeIcon = (t: string) => t === "percent" ? Percent : t === "fixed" ? DollarSign : Truck;
  const typeLabel = (t: string) => t === "percent" ? "% giảm" : t === "fixed" ? "Giảm cố định" : "Freeship";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" /> Khuyến mãi & Voucher
          </h1>
          <p className="text-sm text-muted-foreground">Tạo mã giảm giá, freeship áp dụng cho cửa hàng của bạn</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Tạo voucher</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tạo voucher mới</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mã *</Label>
                  <Input placeholder="SALE10" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label>Loại</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Giảm theo %</SelectItem>
                      <SelectItem value="fixed">Giảm cố định</SelectItem>
                      <SelectItem value="freeship">Freeship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Tên hiển thị</Label>
                <Input placeholder="Giảm 10% cho khách mới" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              {form.type !== "freeship" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{form.type === "percent" ? "% giảm" : "Số tiền giảm"}</Label>
                    <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} />
                  </div>
                  {form.type === "percent" && (
                    <div>
                      <Label>Giảm tối đa (₫)</Label>
                      <Input type="number" value={form.max_discount} onChange={e => setForm({ ...form, max_discount: Number(e.target.value) })} />
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Đơn tối thiểu (₫)</Label>
                  <Input type="number" value={form.min_order} onChange={e => setForm({ ...form, min_order: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Giới hạn lượt</Label>
                  <Input type="number" placeholder="0 = không giới hạn" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Hạn dùng</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
              </div>
              <div>
                <Label>Mô tả</Label>
                <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button className="w-full" onClick={save}>Tạo voucher</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tổng voucher" value={stats.total} icon={Ticket} />
        <KpiCard label="Đang hoạt động" value={stats.active} icon={Gift} accent="from-emerald-500/15 to-transparent" />
        <KpiCard label="Lượt sử dụng" value={fmt(stats.redemptions)} icon={TrendingUp} accent="from-blue-500/15 to-transparent" />
        <KpiCard label="Tổng giảm giá" value={fmt(stats.total_discount) + "₫"} icon={DollarSign} accent="from-orange-500/15 to-transparent" />
      </div>

      {loading ? (
        <div className="grid gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : vouchers.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <Ticket className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>Chưa có voucher nào. Tạo mã đầu tiên để khuyến mãi cho khách.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {vouchers.map(v => {
            const Icon = typeIcon(v.type);
            const expired = v.expires_at && new Date(v.expires_at) < new Date();
            const usedUp = v.usage_limit && v.used_count >= v.usage_limit;
            return (
              <div key={v.id} className="rounded-2xl border bg-card/40 backdrop-blur-xl p-4 flex items-center gap-4 hover:border-primary/40 transition">
                <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="font-mono font-bold text-lg">{v.code}</code>
                    <Badge variant="secondary" className="text-[10px]">{typeLabel(v.type)}</Badge>
                    {!v.is_active && <Badge variant="outline" className="text-[10px]">Tạm tắt</Badge>}
                    {expired && <Badge variant="destructive" className="text-[10px]">Hết hạn</Badge>}
                    {usedUp && <Badge variant="destructive" className="text-[10px]">Hết lượt</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {v.name || v.description || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {v.type === "percent" ? `${v.value}%` : v.type === "fixed" ? `${fmt(v.value)}₫` : "Miễn ship"}
                    {v.min_order > 0 && ` · Đơn từ ${fmt(v.min_order)}₫`}
                    {` · Đã dùng ${v.used_count}${v.usage_limit ? `/${v.usage_limit}` : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch checked={v.is_active} onCheckedChange={c => update(v.id, { is_active: c })} />
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(v.code); toast.success("Đã copy"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Xoá voucher?")) remove(v.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VouchersManagement;
