import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { Save, Upload, Smartphone, Monitor, Loader2, Sparkles, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useReceiptSettings, type ReceiptSettings } from "@/hooks/useReceiptSettings";
import { BrandedReceipt } from "@/components/receipt/BrandedReceipt";

const isValidUrl = (s?: string | null) => {
  if (!s) return true;
  try { new URL(s); return true; } catch { return false; }
};

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="h-10 w-10 rounded-lg border-2 border-border shadow-sm shrink-0"
          style={{ backgroundColor: value }}
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" />
      </div>
      {open && (
        <div className="mt-2">
          <HexColorPicker color={value} onChange={onChange} style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
};

const ReceiptSettingsForm = () => {
  const { settings, loading, saving, save, uploadLogo } = useReceiptSettings();
  const [draft, setDraft] = useState<ReceiptSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  if (loading || !draft) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-60 rounded-xl" />
        <div className="grid lg:grid-cols-[1fr,420px] gap-6">
          <Skeleton className="h-[600px] rounded-2xl" />
          <Skeleton className="h-[600px] rounded-2xl" />
        </div>
      </div>
    );
  }

  const update = <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) =>
    setDraft({ ...draft, [key]: value });

  const updateSocial = (key: string, value: string) =>
    setDraft({ ...draft, social_links: { ...draft.social_links, [key]: value } });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File quá lớn", description: "Logo phải nhỏ hơn 2MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const { url, error } = await uploadLogo(file);
    setUploading(false);
    if (error || !url) {
      toast({ title: "Tải lên thất bại", description: error?.message, variant: "destructive" });
      return;
    }
    update("logo_url", url);
    toast({ title: "Đã tải logo" });
  };

  const handleSave = async () => {
    // validate URLs
    const urls: Array<[string, string | null | undefined]> = [
      ["Website", draft.website],
      ["Zalo OA URL", draft.qr_zalo_url],
      ["Google Maps URL", draft.qr_maps_url],
      ["Facebook", draft.social_links?.facebook],
      ["Instagram", draft.social_links?.instagram],
      ["TikTok", draft.social_links?.tiktok],
      ["Zalo", draft.social_links?.zalo],
    ];
    for (const [name, val] of urls) {
      if (val && !isValidUrl(val)) {
        toast({ title: `${name} không hợp lệ`, description: "Vui lòng nhập URL hợp lệ (https://...)", variant: "destructive" });
        return;
      }
    }
    const { error } = await save(draft);
    if (error) {
      toast({ title: "Lưu thất bại", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Đã lưu mẫu hoá đơn" });
    }
  };

  const demoTx = {
    id: "demo-" + draft.merchant_id.slice(0, 8),
    amount: 250000,
    status: "completed",
    paid_at: new Date().toISOString(),
    bank_reference: "FT24061234567",
    transfer_content: "PG-DEMO123 thanh toan don hang",
    payment_method: "Chuyển khoản QR",
    cashier_name: "Demo Staff",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Mẫu hoá đơn thương hiệu
          </h2>
          <p className="text-sm text-muted-foreground">Tuỳ biến bill và xem trước realtime</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Lưu thay đổi
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr,440px] gap-6">
        {/* FORM */}
        <div className="space-y-4 min-w-0">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold">Thương hiệu</h3>

            <div>
              <Label className="text-xs font-semibold">Logo cửa hàng</Label>
              <div className="flex items-center gap-3 mt-1.5">
                {draft.logo_url ? (
                  <img src={draft.logo_url} alt="logo" className="h-14 w-14 rounded-xl object-cover border" />
                ) : (
                  <div className="h-14 w-14 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted text-sm font-medium">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Đang tải..." : "Tải logo (≤ 2MB)"}
                  </span>
                </label>
                {draft.logo_url && (
                  <Button variant="ghost" size="sm" onClick={() => update("logo_url", null)}>Xoá</Button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Tên shop</Label>
                <Input value={draft.shop_name ?? ""} onChange={(e) => update("shop_name", e.target.value)} maxLength={80} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Slogan</Label>
                <Input value={draft.slogan ?? ""} onChange={(e) => update("slogan", e.target.value)} maxLength={120} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <ColorField label="Màu chính" value={draft.primary_color} onChange={(v) => update("primary_color", v)} />
              <ColorField label="Màu phụ" value={draft.secondary_color} onChange={(v) => update("secondary_color", v)} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-bold">Liên hệ</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Hotline</Label>
                <Input value={draft.hotline ?? ""} onChange={(e) => update("hotline", e.target.value)} placeholder="0901..." />
              </div>
              <div>
                <Label className="text-xs font-semibold">Website</Label>
                <Input value={draft.website ?? ""} onChange={(e) => update("website", e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Địa chỉ</Label>
              <Input value={draft.address ?? ""} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Facebook</Label>
                <Input value={draft.social_links?.facebook ?? ""} onChange={(e) => updateSocial("facebook", e.target.value)} placeholder="https://facebook.com/..." />
              </div>
              <div>
                <Label className="text-xs font-semibold">Instagram</Label>
                <Input value={draft.social_links?.instagram ?? ""} onChange={(e) => updateSocial("instagram", e.target.value)} placeholder="https://instagram.com/..." />
              </div>
              <div>
                <Label className="text-xs font-semibold">TikTok</Label>
                <Input value={draft.social_links?.tiktok ?? ""} onChange={(e) => updateSocial("tiktok", e.target.value)} placeholder="https://tiktok.com/@..." />
              </div>
              <div>
                <Label className="text-xs font-semibold">Zalo cá nhân</Label>
                <Input value={draft.social_links?.zalo ?? ""} onChange={(e) => updateSocial("zalo", e.target.value)} placeholder="https://zalo.me/..." />
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-bold">Lời chào & cảm ơn</h3>
            <div>
              <Label className="text-xs font-semibold">Lời chào</Label>
              <Textarea rows={2} value={draft.greeting ?? ""} onChange={(e) => update("greeting", e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Lời cảm ơn / kết</Label>
              <Textarea rows={2} value={draft.closing ?? ""} onChange={(e) => update("closing", e.target.value)} maxLength={200} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">🎁 Voucher khuyến mãi</h3>
              <Switch checked={draft.voucher_enabled} onCheckedChange={(v) => update("voucher_enabled", v)} />
            </div>
            {draft.voucher_enabled && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Mô tả ưu đãi</Label>
                  <Input value={draft.voucher_text ?? ""} onChange={(e) => update("voucher_text", e.target.value)} maxLength={120} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Mã code</Label>
                    <Input value={draft.voucher_code ?? ""} onChange={(e) => update("voucher_code", e.target.value)} maxLength={20} className="font-mono uppercase" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Giới hạn lượt</Label>
                    <Input type="number" min={1} value={draft.voucher_max_uses ?? ""} onChange={(e) => update("voucher_max_uses", e.target.value ? Number(e.target.value) : null)} placeholder="Không giới hạn" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">HSD (ngày)</Label>
                    <Input type="number" min={1} value={draft.voucher_expiry_days} onChange={(e) => update("voucher_expiry_days", Number(e.target.value) || 30)} />
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-bold">QR Codes</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">QR Zalo OA</p>
                <p className="text-xs text-muted-foreground">Vào Zalo OA → Quản lý → Copy link trang</p>
              </div>
              <Switch checked={draft.qr_zalo_enabled} onCheckedChange={(v) => update("qr_zalo_enabled", v)} />
            </div>
            {draft.qr_zalo_enabled && (
              <Input value={draft.qr_zalo_url ?? ""} onChange={(e) => update("qr_zalo_url", e.target.value)} placeholder="https://zalo.me/..." />
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">QR Google Maps</p>
                <p className="text-xs text-muted-foreground">Tìm shop trên Maps → Chia sẻ → Copy link</p>
              </div>
              <Switch checked={draft.qr_maps_enabled} onCheckedChange={(v) => update("qr_maps_enabled", v)} />
            </div>
            {draft.qr_maps_enabled && (
              <Input value={draft.qr_maps_url ?? ""} onChange={(e) => update("qr_maps_url", e.target.value)} placeholder="https://maps.app.goo.gl/..." />
            )}
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Tự động hỏi gửi bill</p>
                <p className="text-xs text-muted-foreground">Sau mỗi giao dịch thành công sẽ tự mở popup chia sẻ</p>
              </div>
              <Switch checked={draft.auto_open_share} onCheckedChange={(v) => update("auto_open_share", v)} />
            </div>
          </Card>
        </div>

        {/* PREVIEW */}
        <div>
          <div className="lg:sticky lg:top-[72px]">
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)} className="mb-3">
              <TabsList className="grid grid-cols-2 w-full max-w-xs">
                <TabsTrigger value="mobile"><Smartphone className="h-4 w-4 mr-2" /> Mobile</TabsTrigger>
                <TabsTrigger value="desktop"><Monitor className="h-4 w-4 mr-2" /> Desktop</TabsTrigger>
              </TabsList>
            </Tabs>
            <motion.div
              key={previewMode}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center bg-muted/30 rounded-2xl p-4 border"
            >
              <div style={{ width: previewMode === "mobile" ? 360 : 420 }}>
                <BrandedReceipt settings={draft} transaction={demoTx} />
              </div>
            </motion.div>
            <p className="text-xs text-muted-foreground text-center mt-2">Bản xem trước — cập nhật realtime</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettingsForm;
