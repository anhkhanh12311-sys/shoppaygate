import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Building2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TopupBank {
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  content_prefix: string;
  note: string;
}
interface ApiBranding {
  brand_name: string;
  api_version: string;
  support_email: string;
  doc_url: string;
}

const AdminSystemSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [bank, setBank] = useState<TopupBank>({
    bank_name: "", bank_account_number: "", bank_account_name: "",
    content_prefix: "NAP", note: "",
  });
  const [bankPublic, setBankPublic] = useState(true);
  const [brand, setBrand] = useState<ApiBranding>({
    brand_name: "PayGate", api_version: "v2", support_email: "", doc_url: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("system_settings").select("*");
    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r]));
    if (map.topup_bank) {
      setBank({ ...bank, ...(map.topup_bank.value as any) });
      setBankPublic(map.topup_bank.is_public);
    }
    if (map.api_branding) setBrand({ ...brand, ...(map.api_branding.value as any) });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (key: string, value: any, is_public: boolean) => {
    setSaving(key);
    const { error } = await (supabase as any).rpc("admin_upsert_setting", {
      p_key: key, p_value: value, p_is_public: is_public, p_description: null,
    });
    setSaving(null);
    if (error) return toast.error("Lưu thất bại: " + error.message);
    toast.success("Đã lưu cài đặt");
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground">Cấu hình toàn cục — ảnh hưởng đến mọi merchant.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Tài khoản nhận nạp tiền hệ thống
          </CardTitle>
          <CardDescription>
            Thông tin ngân hàng và quy ước nội dung chuyển khoản hiển thị cho người dùng nạp tiền vào ví PayGate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Tên ngân hàng (mã VietQR)</Label>
              <Input value={bank.bank_name} onChange={e => setBank({ ...bank, bank_name: e.target.value })} placeholder="MBBank, VCB, Techcombank..." />
            </div>
            <div>
              <Label>Số tài khoản</Label>
              <Input value={bank.bank_account_number} onChange={e => setBank({ ...bank, bank_account_number: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Chủ tài khoản</Label>
              <Input value={bank.bank_account_name} onChange={e => setBank({ ...bank, bank_account_name: e.target.value })} />
            </div>
            <div>
              <Label>Tiền tố nội dung CK</Label>
              <Input value={bank.content_prefix} onChange={e => setBank({ ...bank, content_prefix: e.target.value.toUpperCase() })} placeholder="NAP" />
              <p className="text-xs text-muted-foreground mt-1">
                Ví dụ: <code>NAP</code> → mã đầy đủ <code>NAPxxxxxxxx</code>
              </p>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={bankPublic} onCheckedChange={setBankPublic} />
              <span className="text-sm">Hiển thị công khai cho mọi merchant</span>
            </div>
          </div>
          <div>
            <Label>Ghi chú hiển thị (tùy chọn)</Label>
            <Textarea value={bank.note} onChange={e => setBank({ ...bank, note: e.target.value })} rows={2} />
          </div>
          <Button onClick={() => save("topup_bank", bank, bankPublic)} disabled={saving === "topup_bank"}>
            {saving === "topup_bank" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Lưu cấu hình ngân hàng
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Thương hiệu & Tài liệu API
          </CardTitle>
          <CardDescription>Hiển thị trong tài liệu tích hợp và trang công khai.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Tên thương hiệu</Label>
              <Input value={brand.brand_name} onChange={e => setBrand({ ...brand, brand_name: e.target.value })} />
            </div>
            <div>
              <Label>Phiên bản API <Badge variant="outline" className="ml-2">{brand.api_version}</Badge></Label>
              <Input value={brand.api_version} onChange={e => setBrand({ ...brand, api_version: e.target.value })} />
            </div>
            <div>
              <Label>Email hỗ trợ</Label>
              <Input value={brand.support_email} onChange={e => setBrand({ ...brand, support_email: e.target.value })} />
            </div>
            <div>
              <Label>URL tài liệu (tùy chọn)</Label>
              <Input value={brand.doc_url} onChange={e => setBrand({ ...brand, doc_url: e.target.value })} />
            </div>
          </div>
          <Button onClick={() => save("api_branding", brand, true)} disabled={saving === "api_branding"}>
            {saving === "api_branding" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Lưu thương hiệu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemSettings;
