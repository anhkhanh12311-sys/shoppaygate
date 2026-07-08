import { useEffect, useState, useCallback } from "react";
import { Split, Plus, Trash2, Loader2, Calculator, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { useToast } from "@/hooks/use-toast";

type Recipient = { label: string; account_number: string; bank_name: string; account_name: string; percent: number };
type Rule = { id: string; name: string; description: string | null; recipients: Recipient[]; active: boolean; is_default: boolean };

const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const SplitPaymentRules = () => {
  const { merchant } = useMerchant();
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([
    { label: "Đối tác A", account_number: "", bank_name: "", account_name: "", percent: 70 },
    { label: "Đối tác B", account_number: "", bank_name: "", account_name: "", percent: 30 },
  ]);
  const [simAmount, setSimAmount] = useState("1000000");
  const [simRuleId, setSimRuleId] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<any>(null);

  const load = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("split_rules").select("*").eq("merchant_id", merchant.id).order("created_at", { ascending: false });
    setRules((data as Rule[]) || []);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { load(); }, [load]);

  const totalPct = recipients.reduce((s, r) => s + Number(r.percent || 0), 0);

  const create = async () => {
    if (!merchant || !name.trim()) return;
    if (Math.abs(totalPct - 100) > 0.01) {
      toast({ title: "Tổng % phải = 100", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("split_rules").insert({
      merchant_id: merchant.id, name, description: description || null, recipients: recipients as any, active: true,
    });
    setSaving(false);
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    toast({ title: "Đã tạo quy tắc" });
    setOpen(false); setName(""); setDescription("");
    setRecipients([
      { label: "Đối tác A", account_number: "", bank_name: "", account_name: "", percent: 70 },
      { label: "Đối tác B", account_number: "", bank_name: "", account_name: "", percent: 30 },
    ]);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("split_rules").delete().eq("id", id);
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).from("split_rules").update({ active: !active }).eq("id", id);
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    load();
  };

  const simulate = async (id: string) => {
    setSimRuleId(id);
    const { data, error } = await (supabase as any).rpc("preview_split", { p_rule_id: id, p_amount: Number(simAmount) || 0 });
    if (error) return toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    setSimResult(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
            <Split className="h-7 w-7 text-primary" />
            Chia doanh thu
          </h1>
          <p className="text-muted-foreground text-sm">
            Tạo quy tắc chia % thu về cho nhiều tài khoản (đối tác, nhân viên, quỹ chung).
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Tạo quy tắc</Button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải…</div>
      ) : rules.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Chưa có quy tắc nào.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {r.name}
                      <Badge variant={r.active ? "default" : "secondary"} className="text-[10px]">{r.active ? "Đang bật" : "Tạm tắt"}</Badge>
                    </CardTitle>
                    {r.description && <CardDescription className="text-xs mt-1">{r.description}</CardDescription>}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  {(r.recipients || []).map((rec, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                      <div>
                        <div className="font-medium">{rec.label}</div>
                        <div className="text-muted-foreground font-mono">{rec.account_number} · {rec.bank_name}</div>
                      </div>
                      <div className="text-primary font-bold">{rec.percent}%</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input type="number" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} className="h-8 text-xs" placeholder="Số tiền" />
                  <Button size="sm" variant="outline" className="h-8" onClick={() => simulate(r.id)}><Calculator className="h-3 w-3 mr-1" />Test</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => toggleActive(r.id, r.active)}>{r.active ? "Tắt" : "Bật"}</Button>
                </div>
                {simRuleId === r.id && simResult && (
                  <div className="border rounded-lg p-2 space-y-1 text-xs bg-primary/5">
                    <div className="font-medium mb-1">Chia {fmt(simResult.total)}:</div>
                    {simResult.breakdown.map((b: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{b.label} ({b.percent}%)</span>
                        <span className="font-mono">{fmt(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Tạo quy tắc chia doanh thu</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên quy tắc *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Chia khoá học premium" /></div>
            <div><Label>Mô tả</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Người nhận</Label>
                <div className={`text-xs ${Math.abs(totalPct - 100) < 0.01 ? "text-emerald-500" : "text-destructive"} flex items-center gap-1`}>
                  {Math.abs(totalPct - 100) >= 0.01 && <AlertTriangle className="h-3 w-3" />}
                  Tổng: {totalPct}%
                </div>
              </div>
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {recipients.map((rec, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-2">
                    <div className="col-span-3"><Label className="text-xs">Nhãn</Label><Input className="h-8" value={rec.label} onChange={(e) => setRecipients(recipients.map((r, j) => j === i ? { ...r, label: e.target.value } : r))} /></div>
                    <div className="col-span-3"><Label className="text-xs">Số TK</Label><Input className="h-8" value={rec.account_number} onChange={(e) => setRecipients(recipients.map((r, j) => j === i ? { ...r, account_number: e.target.value } : r))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Ngân hàng</Label><Input className="h-8" value={rec.bank_name} onChange={(e) => setRecipients(recipients.map((r, j) => j === i ? { ...r, bank_name: e.target.value } : r))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Chủ TK</Label><Input className="h-8" value={rec.account_name} onChange={(e) => setRecipients(recipients.map((r, j) => j === i ? { ...r, account_name: e.target.value } : r))} /></div>
                    <div className="col-span-1"><Label className="text-xs">%</Label><Input type="number" className="h-8" value={rec.percent} onChange={(e) => setRecipients(recipients.map((r, j) => j === i ? { ...r, percent: Number(e.target.value) } : r))} /></div>
                    <div className="col-span-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setRecipients(recipients.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button></div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setRecipients([...recipients, { label: "Người nhận", account_number: "", bank_name: "", account_name: "", percent: 0 }])}>
                <Plus className="h-3 w-3 mr-1" />Thêm người nhận
              </Button>
            </div>
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

export default SplitPaymentRules;
