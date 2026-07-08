import { useEffect, useState, useCallback } from "react";
import { FileText, Plus, Trash2, Loader2, Send, Bell, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { useToast } from "@/hooks/use-toast";

type Item = { description: string; quantity: number; unit_price: number };
type Invoice = {
  id: string; invoice_number: string; customer_name: string; customer_email: string | null;
  items: Item[]; subtotal: number; tax_percent: number; tax_amount: number; discount: number; total: number;
  due_date: string | null; status: string; payment_link_id: string | null; reminder_count: number; created_at: string;
};

const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-500",
  paid: "bg-emerald-500/15 text-emerald-500",
  overdue: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const InvoicesPro = () => {
  const { merchant } = useMerchant();
  const { toast } = useToast();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "", customer_address: "",
    tax_percent: 0, discount: 0, due_date: "", notes: "",
    items: [{ description: "", quantity: 1, unit_price: 0 }] as Item[],
  });

  const load = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("invoices").select("*").eq("merchant_id", merchant.id).order("created_at", { ascending: false });
    setRows((data as Invoice[]) || []);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { load(); }, [load]);

  const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const tax = Math.round((subtotal * (Number(form.tax_percent) || 0)) / 100);
  const total = Math.max(0, subtotal + tax - (Number(form.discount) || 0));

  const create = async () => {
    if (!form.customer_name.trim() || form.items.every((i) => !i.description.trim())) {
      toast({ title: "Điền tên khách và ít nhất 1 mục", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).rpc("save_invoice", {
      p_id: null,
      p_customer_name: form.customer_name,
      p_customer_email: form.customer_email || null,
      p_customer_phone: form.customer_phone || null,
      p_customer_address: form.customer_address || null,
      p_items: form.items.filter((i) => i.description.trim()) as any,
      p_tax_percent: form.tax_percent,
      p_discount: form.discount,
      p_due_date: form.due_date || null,
      p_notes: form.notes || null,
      p_status: "draft",
    });
    setSaving(false);
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    toast({ title: "Đã tạo hóa đơn" });
    setOpen(false);
    setForm({ customer_name: "", customer_email: "", customer_phone: "", customer_address: "", tax_percent: 0, discount: 0, due_date: "", notes: "", items: [{ description: "", quantity: 1, unit_price: 0 }] });
    load();
  };

  const createLink = async (id: string) => {
    const { data, error } = await (supabase as any).rpc("invoice_create_payment_link", { p_invoice_id: id });
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    toast({ title: "Đã tạo link thanh toán", description: `Mã: ${data}` });
    load();
  };

  const remind = async (id: string) => {
    const { error } = await (supabase as any).rpc("invoice_mark_reminder", { p_invoice_id: id });
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    toast({ title: "Đã ghi nhận nhắc nợ" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("invoices").delete().eq("id", id);
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    load();
  };

  const copyPayUrl = async (code: string) => {
    const url = `${window.location.origin}/pay2/${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const [payCodes, setPayCodes] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = rows.filter((r) => r.payment_link_id).map((r) => r.payment_link_id!) as string[];
    if (!ids.length) return;
    (async () => {
      const { data } = await supabase.from("payment_links").select("id,code").in("id", ids);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.code; });
      setPayCodes(map);
    })();
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Hóa đơn Pro
          </h1>
          <p className="text-muted-foreground text-sm">Tạo hóa đơn chuyên nghiệp, gửi khách, gắn link thanh toán và nhắc nợ.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Tạo hóa đơn</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách hóa đơn</CardTitle>
          <CardDescription>Trạng thái, tổng tiền, hạn thanh toán và thao tác.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Chưa có hóa đơn nào.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số HĐ</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead>Hạn</TableHead>
                  <TableHead>Nhắc</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const code = r.payment_link_id ? payCodes[r.payment_link_id] : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{r.customer_email || "—"}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(r.total))}</TableCell>
                      <TableCell className="text-xs">{r.due_date ? new Date(r.due_date).toLocaleDateString("vi-VN") : "—"}</TableCell>
                      <TableCell className="text-xs">×{r.reminder_count}</TableCell>
                      <TableCell><Badge className={`${statusColor[r.status] || "bg-muted"} border-0`}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        {!r.payment_link_id ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => createLink(r.id)}>
                            <Send className="h-3 w-3 mr-1" />Tạo link
                          </Button>
                        ) : code ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copyPayUrl(code)}>
                            {copiedCode === code ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}Copy URL
                          </Button>
                        ) : null}
                        {r.status !== "paid" && r.payment_link_id && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remind(r.id)}><Bell className="h-3 w-3" /></Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Tạo hóa đơn mới</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tên khách *</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
              <div><Label>SĐT</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              <div><Label>Hạn thanh toán</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label>Địa chỉ</Label><Input value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} /></div>

            <div>
              <Label>Danh mục</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto mt-1">
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-2">
                    <div className="col-span-6"><Label className="text-xs">Mô tả</Label><Input className="h-8" value={it.description} onChange={(e) => setForm({ ...form, items: form.items.map((r, j) => j === i ? { ...r, description: e.target.value } : r) })} /></div>
                    <div className="col-span-2"><Label className="text-xs">SL</Label><Input type="number" className="h-8" value={it.quantity} onChange={(e) => setForm({ ...form, items: form.items.map((r, j) => j === i ? { ...r, quantity: Number(e.target.value) } : r) })} /></div>
                    <div className="col-span-3"><Label className="text-xs">Đơn giá</Label><Input type="number" className="h-8" value={it.unit_price} onChange={(e) => setForm({ ...form, items: form.items.map((r, j) => j === i ? { ...r, unit_price: Number(e.target.value) } : r) })} /></div>
                    <div className="col-span-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}><Trash2 className="h-3 w-3" /></Button></div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setForm({ ...form, items: [...form.items, { description: "", quantity: 1, unit_price: 0 }] })}>
                <Plus className="h-3 w-3 mr-1" />Thêm mục
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Thuế (%)</Label><Input type="number" value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: Number(e.target.value) })} /></div>
              <div><Label>Giảm giá (VND)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Tổng cộng</Label><div className="h-10 flex items-center px-3 font-bold text-primary">{fmt(total)}</div></div>
            </div>
            <div className="text-xs text-muted-foreground flex justify-end gap-4">
              <span>Tạm tính: {fmt(subtotal)}</span><span>Thuế: {fmt(tax)}</span><span>Giảm: {fmt(form.discount)}</span>
            </div>
            <div><Label>Ghi chú</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Tạo hóa đơn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPro;
