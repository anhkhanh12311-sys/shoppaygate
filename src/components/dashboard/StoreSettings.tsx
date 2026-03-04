import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Store, Eye, ExternalLink, Copy, Check, Palette, Type, Image, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMerchantStore } from "@/hooks/useMerchantStore";
import { useMerchant } from "@/hooks/useMerchant";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const StoreSettings = () => {
  const { merchant } = useMerchant();
  const { store, loading, upsertStore } = useMerchantStore();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [slug, setSlug] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [secondaryColor, setSecondaryColor] = useState("#e91e8c");
  const [footerText, setFooterText] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (store) {
      setSlug(store.slug);
      setStoreName(store.store_name);
      setDescription(store.description || "");
      setLogoUrl(store.logo_url || "");
      setBannerUrl(store.banner_url || "");
      setPrimaryColor(store.primary_color || "#7c3aed");
      setSecondaryColor(store.secondary_color || "#e91e8c");
      setFooterText(store.footer_text || "");
      setIsActive(store.is_active);
    } else if (merchant) {
      setStoreName(merchant.business_name);
      setSlug(merchant.business_name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [store, merchant]);

  const handleSave = async () => {
    if (!slug.trim() || !storeName.trim()) {
      toast.error("Vui lòng nhập tên cửa hàng và đường dẫn");
      return;
    }

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      toast.error("Đường dẫn chỉ được chứa chữ thường, số và dấu gạch ngang");
      return;
    }

    setSaving(true);
    const { error } = await upsertStore({
      slug,
      store_name: storeName,
      description: description || null,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      footer_text: footerText || null,
      is_active: isActive,
    });

    if (error) {
      if (error.message?.includes("duplicate")) {
        toast.error("Đường dẫn này đã được sử dụng, vui lòng chọn đường dẫn khác");
      } else {
        toast.error("Lỗi: " + error.message);
      }
    } else {
      toast.success("Đã lưu cài đặt cửa hàng!");
    }
    setSaving(false);
  };

  const storeUrl = `${window.location.origin}/store/${slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success("Đã sao chép link cửa hàng!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const gradientStyle = {
    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              Cửa hàng của tôi
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Tạo trang cửa hàng riêng với thương hiệu của bạn
            </p>
          </div>
          {store && (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" /> Xem cửa hàng
              </Button>
            </a>
          )}
        </div>
      </motion.div>

      {/* Store URL Preview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
                {storeUrl}
              </div>
              <Button size="sm" variant="outline" onClick={copyUrl} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Đang hoạt động" : "Đã tắt"}
              </Badge>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Basic Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="h-5 w-5" /> Thông tin cơ bản
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store-name">Tên cửa hàng *</Label>
                <Input
                  id="store-name"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Cửa hàng ABC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Đường dẫn (slug) *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="cua-hang-abc"
                />
                <p className="text-xs text-muted-foreground">Chỉ chữ thường, số và dấu gạch ngang</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả cửa hàng</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Giới thiệu ngắn về cửa hàng..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer">Chữ chân trang</Label>
              <Input
                id="footer"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="© 2026 Cửa hàng ABC. All rights reserved."
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Branding */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5" /> Thương hiệu
            </CardTitle>
            <CardDescription>Tùy chỉnh màu sắc và hình ảnh cửa hàng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Màu chính</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded cursor-pointer border"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Màu phụ</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-14 rounded cursor-pointer border"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview gradient */}
            <div className="space-y-2">
              <Label>Xem trước</Label>
              <div className="h-20 rounded-xl" style={gradientStyle} />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logo">URL Logo</Label>
                <Input
                  id="logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner">URL Banner</Label>
                <Input
                  id="banner"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto text-white"
          style={gradientStyle}
          size="lg"
        >
          {saving ? "Đang lưu..." : store ? "Cập nhật cửa hàng" : "Tạo cửa hàng"}
        </Button>
      </motion.div>
    </div>
  );
};

export default StoreSettings;
