import { useEffect, useState } from "react";
import { Loader2, Wallet, Search, Plus, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const AdminBalances = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjust, setAdjust] = useState<any | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("merchants")
      .select("id, business_name, email, balance, topup_code")
      .order("balance", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const doAdjust = async (sign: 1 | -1) => {
    if (!adjust || !amount) return;
    const value = sign * Number(amount);
    if (!value) return;
    setSaving(true);
    const { error } = await (supabase as any).rpc("admin_adjust_balance", {
      p_merchant_id: adjust.id, p_amount: value, p_note: note || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật số dư");
    setAdjust(null); setAmount(""); setNote("");
    load();
  };

  const filtered = rows.filter(r =>
    r.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.topup_code?.toLowerCase().includes(search.toLowerCase())
  );

  const total = rows.reduce((s, r) => s + Number(r.balance ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Wallet className="h-7 w-7" /> Số dư merchant</h1>
          <p className="text-muted-foreground text-sm">
            Tổng số dư hệ thống: <span className="font-bold text-primary">{fmt(total)}đ</span>
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin inline" /></div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Mã nạp</TableHead>
                    <TableHead className="text-right">Số dư</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.business_name}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </TableCell>
                      <TableCell><code className="text-xs">{m.topup_code}</code></TableCell>
                      <TableCell className="text-right font-bold">{fmt(Number(m.balance ?? 0))}đ</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setAdjust(m)}>Điều chỉnh</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!adjust} onOpenChange={o => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Điều chỉnh số dư: {adjust?.business_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Số dư hiện tại</Label>
              <p className="font-bold text-lg">{fmt(Number(adjust?.balance ?? 0))}đ</p>
            </div>
            <div>
              <Label>Số tiền (VND)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100000" />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Lý do điều chỉnh..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdjust(null)}>Hủy</Button>
            <Button variant="outline" className="text-destructive" disabled={saving} onClick={() => doAdjust(-1)}>
              <Minus className="h-4 w-4 mr-1" /> Trừ
            </Button>
            <Button disabled={saving} onClick={() => doAdjust(1)} className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" /> Cộng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBalances;
