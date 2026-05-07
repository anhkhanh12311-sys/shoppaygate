import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Store, Eye, ExternalLink, Copy, Check, Palette, Type, Image,
  FileText, Globe, Phone, Mail, MapPin, Clock, Share2, Smartphone,
  Monitor, Sparkles, Facebook, Instagram, MessageCircle, Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMerchantStore } from "@/hooks/useMerchantStore";
import { useMerchant } from "@/hooks/useMerchant";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const StoreSettings = () => {
  const { merchant } = useMerchant();
  const { store, loading, upsertStore } = useMerchantStore();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const [slug, setSlug] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [secondaryColor, setSecondaryColor] = useState("#e91e8c");
  const [footerText, setFooterText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [zaloUrl, setZaloUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showStats, setShowStats] = useState(true);
  const [themeStyle, setThemeStyle] = useState("modern");

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
      setPhone(store.phone || "");
      setEmail(store.email || "");
      setAddress(store.address || "");
      setBusinessHours(store.business_hours || "");
      setFacebookUrl(store.facebook_url || "");
      setInstagramUrl(store.instagram_url || "");
      setZaloUrl(store.zalo_url || "");
      setWebsiteUrl(store.website_url || "");
      setShowStats(store.show_stats ?? true);
      setThemeStyle(store.theme_style || "modern");
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
      phone: phone || null,
      email: email || null,
      address: address || null,
      business_hours: businessHours || null,
      facebook_url: facebookUrl || null,
      instagram_url: instagramUrl || null,
      zalo_url: zaloUrl || null,
      website_url: websiteUrl || null,
      show_stats: showStats,
      theme_style: themeStyle,
    });

    if (error) {
      if (error.message?.includes("duplicate")) toast.error("Đường dẫn này đã được sử dụng");
      else toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã lưu cài đặt cửa hàng! 🎉");
    }
    setSaving(false);
  };

  const storeUrl = `${window.location.origin}/store/${slug}`;
  const copyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success("Đã sao chép!");
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
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Cửa hàng</h1>
              <p className="text-muted-foreground text-sm">Tạo trang cửa hàng với thương hiệu riêng</p>
            </div>
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

      {/* URL & Status Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="gradient-card border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">{storeUrl}</div>
              <Button size="sm" variant="outline" onClick={copyUrl} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline"><ExternalLink className="h-4 w-4" /></Button>
              </a>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-success text-success-foreground" : ""}>
                {isActive ? "● Đang hoạt động" : "○ Đã tắt"}
              </Badge>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info" className="gap-2"><Type className="h-4 w-4" /> Thông tin</TabsTrigger>
          <TabsTrigger value="branding" className="gap-2"><Palette className="h-4 w-4" /> Thương hiệu</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2"><Eye className="h-4 w-4" /> Xem trước</TabsTrigger>
        </TabsList>

        {/* Tab: Info */}
        <TabsContent value="info" className="mt-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Thông tin cơ bản
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="store-name">Tên cửa hàng *</Label>
                    <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Cửa hàng ABC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Đường dẫn (slug) *</Label>
                    <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="cua-hang-abc" />
                    <p className="text-xs text-muted-foreground">Chỉ chữ thường, số và dấu gạch ngang</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả cửa hàng</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Giới thiệu ngắn về cửa hàng..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer">Chữ chân trang</Label>
                  <Input id="footer" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="© 2026 Cửa hàng ABC" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Tab: Branding */}
        <TabsContent value="branding" className="mt-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" /> Màu sắc
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Màu chính</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-14 rounded cursor-pointer border" />
                      <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Màu phụ</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-14 rounded cursor-pointer border" />
                      <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 font-mono" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Xem trước gradient</Label>
                  <div className="h-16 rounded-xl flex items-center justify-center" style={gradientStyle}>
                    <span className="text-white font-bold text-lg drop-shadow">{storeName || "Cửa hàng"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" /> Hình ảnh
                </CardTitle>
                <CardDescription>Logo và banner hiển thị trên trang cửa hàng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="logo">URL Logo</Label>
                    <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
                    {logoUrl && (
                      <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner">URL Banner</Label>
                    <Input id="banner" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://example.com/banner.jpg" />
                    {bannerUrl && (
                      <div className="h-16 rounded-lg border bg-muted overflow-hidden">
                        <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Tab: Preview */}
        <TabsContent value="preview" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Xem trước giao diện
                  </CardTitle>
                  <div className="flex gap-1 bg-muted rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={previewDevice === "desktop" ? "default" : "ghost"}
                      onClick={() => setPreviewDevice("desktop")}
                      className="h-8 px-3"
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={previewDevice === "mobile" ? "default" : "ghost"}
                      onClick={() => setPreviewDevice("mobile")}
                      className="h-8 px-3"
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`mx-auto border rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
                  previewDevice === "mobile" ? "max-w-[375px]" : "max-w-full"
                }`}>
                  {/* Preview banner */}
                  <div className="h-28 relative" style={gradientStyle}>
                    {bannerUrl && (
                      <img src={bannerUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                          <Store className="h-7 w-7 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Preview body */}
                  <div className="bg-background p-4 space-y-3">
                    <div className="text-center">
                      <h3 className="font-bold text-lg">{storeName || "Tên cửa hàng"}</h3>
                      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="rounded-lg border p-3 space-y-1">
                          <div className="h-3 w-2/3 bg-muted rounded" />
                          <div className="h-5 w-1/2 bg-primary/10 rounded" />
                        </div>
                      ))}
                    </div>
                    {footerText && (
                      <p className="text-xs text-muted-foreground text-center pt-3 border-t">{footerText}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Save */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto text-white" style={gradientStyle} size="lg">
          {saving ? "Đang lưu..." : store ? "💾 Cập nhật cửa hàng" : "🚀 Tạo cửa hàng"}
        </Button>
      </motion.div>
    </div>
  );
};

export default StoreSettings;
