import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Package, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plan {
  id?: string; code: string; name: string; description: string;
  price_monthly: number; price_yearly: number; monthly_tx_limit: number;
  fee_percent: number; features: string[]; is_active: boolean; sort_order: number;
}

const empty: Plan = {
  code: "", name: "", description: "", price_monthly: 0, price_yearly: 0,
  monthly_tx_limit: 0, fee_percent: 0, features: [], is_active: true, sort_order: 99,
};

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Plan | null>(null);
  const [featuresText, setFeaturesText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("subscription_plans").select("*").order("sort_order");
    setPlans((data ?? []).map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const open = (p?: Plan) => {
    const next = p ? { ...p } : { ...empty };
    setEdit(next);
    setFeaturesText((next.features ?? []).join("\n"));
  };

  const save = async () => {
    if (!edit) return;
    if (!edit.code || !edit.name) return toast.error("Code và tên bắt buộc");
    setSaving(true);
    const features = featuresText.split("\n").map(s => s.trim()).filter(Boolean);
    const payload = { ...edit, features };
    const { id, ...rest } = payload;
    const { error } = id
      ? await supabase.from("subscription_plans").update(rest).eq("id", id)
      : await supabase.from("subscription_plans").insert(rest);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Đã lưu");
    setEdit(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Xóa gói này?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xóa");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Package className="h-7 w-7" /> Quản lý gói cước</h1>
          <p className="text-muted-foreground text-sm">Tạo / sửa / xóa các gói bán cho merchant</p>
        </div>
        <Button onClick={() => open()} className="gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> Tạo gói mới
        </Button>
      </div>

      {loading ? <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin inline" /></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map(p => (
            <Card key={p.id} className={p.is_active ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {p.name}
                      <Badge variant="outline" className="text-[10px]">{p.code}</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">{p.description}</CardDescription>
                  </div>
                  {!p.is_active && <Badge variant="secondary">Tắt</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tháng</span>
                  <span className="font-bold">{fmt(p.price_monthly)}đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Năm</span>
                  <span className="font-bold">{fmt(p.price_yearly)}đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hạn mức GD/tháng</span>
                  <span className="font-bold">{p.monthly_tx_limit === 0 ? "∞" : fmt(p.monthly_tx_limit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí %</span>
                  <span className="font-bold">{p.fee_percent}%</span>
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {p.features.length} tính năng
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => open(p)}>
                    <Pencil className="h-3 w-3 mr-1" /> Sửa
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(p.id!)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Sửa gói" : "Tạo gói mới"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-1">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input value={edit.code} onChange={e => setEdit({ ...edit, code: e.target.value.toLowerCase() })} placeholder="starter" />
              </div>
              <div className="md:col-span-1">
                <Label>Tên gói <span className="text-destructive">*</span></Label>
                <Input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Mô tả</Label>
                <Input value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} />
              </div>
              <div>
                <Label>Giá / tháng (đ)</Label>
                <Input type="number" value={edit.price_monthly} onChange={e => setEdit({ ...edit, price_monthly: +e.target.value })} />
              </div>
              <div>
                <Label>Giá / năm (đ)</Label>
                <Input type="number" value={edit.price_yearly} onChange={e => setEdit({ ...edit, price_yearly: +e.target.value })} />
              </div>
              <div>
                <Label>Hạn mức GD / tháng (0 = ∞)</Label>
                <Input type="number" value={edit.monthly_tx_limit} onChange={e => setEdit({ ...edit, monthly_tx_limit: +e.target.value })} />
              </div>
              <div>
                <Label>Phí giao dịch %</Label>
                <Input type="number" step="0.01" value={edit.fee_percent} onChange={e => setEdit({ ...edit, fee_percent: +e.target.value })} />
              </div>
              <div>
                <Label>Thứ tự hiển thị</Label>
                <Input type="number" value={edit.sort_order} onChange={e => setEdit({ ...edit, sort_order: +e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={edit.is_active} onCheckedChange={v => setEdit({ ...edit, is_active: v })} />
                <Label>Đang bật bán</Label>
              </div>
              <div className="md:col-span-2">
                <Label>Tính năng (mỗi dòng 1 tính năng)</Label>
                <Textarea rows={6} value={featuresText} onChange={e => setFeaturesText(e.target.value)}
                  placeholder="1.000 GD/tháng&#10;Auto-bank callback&#10;..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlans;
