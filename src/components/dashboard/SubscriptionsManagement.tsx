import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Repeat, Plus, Play, Pause, X, Loader2, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { useToast } from "@/hooks/use-toast";

type Sub = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  plan_name: string;
  description: string | null;
  price: number;
  interval_unit: "day" | "week" | "month" | "year";
  interval_count: number;
  next_charge_at: string;
  last_charged_at: string | null;
  status: "active" | "paused" | "cancelled" | "failed";
  total_charged: number;
  charge_count: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const statusColor: Record<Sub["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-500",
  paused: "bg-amber-500/15 text-amber-500",
  cancelled: "bg-muted text-muted-foreground",
  failed: "bg-destructive/15 text-destructive",
};

const intervalLabel = (u: string, c: number) => {
  const map: Record<string, string> = { day: "ngày", week: "tuần", month: "tháng", year: "năm" };
  return c === 1 ? `Mỗi ${map[u]}` : `Mỗi ${c} ${map[u]}`;
};

const SubscriptionsManagement = () => {
  const { merchant } = useMerchant();
  const { toast } = useToast();
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    plan_name: "",
    description: "",
    price: 0,
    interval_unit: "month" as Sub["interval_unit"],
    interval_count: 1,
    next_charge_at: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("customer_subscriptions")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });
    setRows((data as Sub[]) || []);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!merchant) return;
    if (!form.customer_name || !form.plan_name || form.price <= 0) {
      toast({ title: "Điền đủ tên khách, tên gói và giá", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("customer_subscriptions").insert({
      merchant_id: merchant.id,
      customer_name: form.customer_name,
      customer_email: form.customer_email || null,
      customer_phone: form.customer_phone || null,
      plan_name: form.plan_name,
      description: form.description || null,
      price: form.price,
      interval_unit: form.interval_unit,
      interval_count: form.interval_count,
      next_charge_at: new Date(form.next_charge_at).toISOString(),
    });
    setSaving(false);
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    toast({ title: "Đã tạo đăng ký định kỳ" });
    setOpen(false);
    setForm({ ...form, customer_name: "", customer_email: "", customer_phone: "", plan_name: "", description: "", price: 0 });
    load();
  };

  const setStatus = async (id: string, status: Sub["status"]) => {
    const { error } = await (supabase as any)
      .from("customer_subscriptions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    load();
  };

  const chargeNow = async (id: string) => {
    const { data, error } = await (supabase as any).rpc("subscription_charge", { p_sub_id: id });
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    toast({ title: "Đã sinh link thanh toán", description: data ? `Mã: ${data}` : "" });
    load();
  };

  const totalMRR = rows
    .filter((r) => r.status === "active")
    .reduce((s, r) => {
      const monthly = r.interval_unit === "month" ? r.price / r.interval_count
        : r.interval_unit === "year" ? r.price / (12 * r.interval_count)
        : r.interval_unit === "week" ? (r.price * 4.33) / r.interval_count
        : (r.price * 30) / r.interval_count;
      return s + monthly;
    }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
            <Repeat className="h-7 w-7 text-primary" />
            Đăng ký định kỳ
          </h1>
          <p className="text-muted-foreground text-sm">
            Tự động sinh link thanh toán theo chu kỳ (tháng/tuần/năm) cho khách hàng của bạn.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> Tạo đăng ký
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-5">
          <div className="text-xs text-muted-foreground">Đang hoạt động</div>
          <div className="text-2xl font-bold mt-1">{rows.filter(r => r.status === "active").length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> MRR ước tính</div>
          <div className="text-2xl font-bold mt-1">{fmt(totalMRR)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="text-xs text-muted-foreground">Tổng đã thu</div>
          <div className="text-2xl font-bold mt-1">{fmt(rows.reduce((s, r) => s + Number(r.total_charged || 0), 0))}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách</CardTitle>
          <CardDescription>Trạng thái, chu kỳ, số lần thu và thao tác nhanh.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Chưa có đăng ký nào. Bấm "Tạo đăng ký" để bắt đầu.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead>Chu kỳ</TableHead>
                  <TableHead>Kỳ kế tiếp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{r.customer_email || r.customer_phone || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{r.plan_name}</div>
                      <div className="text-xs text-muted-foreground">×{r.charge_count} lần</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(r.price))}</TableCell>
                    <TableCell className="text-xs">{intervalLabel(r.interval_unit, r.interval_count)}</TableCell>
                    <TableCell className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.next_charge_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell><Badge className={`${statusColor[r.status]} border-0`}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      {r.status === "active" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => chargeNow(r.id)} className="h-7 text-xs">Thu ngay</Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "paused")} className="h-7 w-7 p-0"><Pause className="h-3 w-3" /></Button>
                        </>
                      )}
                      {r.status === "paused" && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "active")} className="h-7 w-7 p-0"><Play className="h-3 w-3" /></Button>
                      )}
                      {r.status !== "cancelled" && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "cancelled")} className="h-7 w-7 p-0 text-destructive"><X className="h-3 w-3" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tạo đăng ký định kỳ</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tên khách hàng *</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
            </div>
            <div><Label>SĐT</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
            <div><Label>Tên gói *</Label><Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} placeholder="VD: Premium" /></div>
            <div><Label>Mô tả</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Giá (VND) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
              <div>
                <Label>Chu kỳ</Label>
                <Select value={form.interval_unit} onValueChange={(v: any) => setForm({ ...form, interval_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Ngày</SelectItem>
                    <SelectItem value="week">Tuần</SelectItem>
                    <SelectItem value="month">Tháng</SelectItem>
                    <SelectItem value="year">Năm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Mỗi</Label><Input type="number" min={1} value={form.interval_count} onChange={(e) => setForm({ ...form, interval_count: Math.max(1, Number(e.target.value)) })} /></div>
            </div>
            <div><Label>Ngày thu đầu tiên</Label><Input type="date" value={form.next_charge_at} onChange={(e) => setForm({ ...form, next_charge_at: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionsManagement;
