import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Store, ExternalLink, CreditCard, Clock, Copy, Check,
  Phone, Mail, MapPin, Globe, Facebook, Instagram, MessageCircle,
  Search, ShieldCheck, TrendingUp, Sparkles, ArrowRight, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface StoreData {
  id: string;
  slug: string;
  store_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string | null;
  merchant_id: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  business_hours: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  zalo_url: string | null;
  website_url: string | null;
  show_stats: boolean;
  theme_style: string;
}

interface PaymentLinkData {
  id: string;
  code: string;
  amount: number;
  description: string | null;
  status: string;
  is_static: boolean;
  created_at: string;
}

const formatAmount = (a: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(a);

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [links, setLinks] = useState<PaymentLinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "static" | "dynamic">("all");

  useEffect(() => {
    if (!slug) return;
    const fetchStore = async () => {
      const { data: storeData } = await supabase
        .from("merchant_stores").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!storeData) { setNotFound(true); setLoading(false); return; }
      setStore(storeData as any);

      const { data: linksData } = await supabase
        .from("payment_links")
        .select("id, code, amount, description, status, is_static, created_at")
        .eq("merchant_id", storeData.merchant_id).eq("status", "active")
        .order("created_at", { ascending: false });
      setLinks(linksData || []);
      setLoading(false);
    };
    fetchStore();
  }, [slug]);

  const copyLink = (code: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/pay/${code}`);
    setCopiedId(id);
    toast.success("Đã sao chép!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareStore = async () => {
    const shareData = {
      title: store?.store_name,
      text: store?.description || `Cửa hàng ${store?.store_name}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Đã sao chép link cửa hàng!");
      }
    } catch {}
  };

  const filtered = useMemo(() => {
    return links.filter((l) => {
      if (filter === "static" && !l.is_static) return false;
      if (filter === "dynamic" && l.is_static) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.code.toLowerCase().includes(q) || (l.description || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [links, filter, search]);

  const stats = useMemo(() => ({
    total: links.length,
    staticCount: links.filter(l => l.is_static).length,
    avgAmount: links.length ? links.reduce((s, l) => s + Number(l.amount), 0) / links.length : 0,
  }), [links]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className="container max-w-5xl py-8 space-y-4">
          <Skeleton className="h-32" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <Store className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Cửa hàng không tồn tại</h1>
          <p className="text-muted-foreground">Đường dẫn không khả dụng hoặc đã ngừng hoạt động.</p>
          <Link to="/"><Button>Về trang chủ</Button></Link>
        </motion.div>
      </div>
    );
  }

  const isDark = store.theme_style === "dark";
  const gradient = `linear-gradient(135deg, ${store.primary_color} 0%, ${store.secondary_color} 100%)`;
  const containerBg = isDark ? "bg-slate-950 text-slate-100" : "bg-muted/30";

  return (
    <div className={`min-h-screen ${containerBg}`}>
      {/* Banner */}
      <div className="relative h-56 sm:h-72 overflow-hidden" style={!store.banner_url ? { background: gradient } : undefined}>
        {store.banner_url && (
          <img src={store.banner_url} alt="Banner" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />
        <div className="absolute top-4 right-4 flex gap-2">
          <Button size="sm" variant="secondary" onClick={shareStore} className="backdrop-blur bg-white/20 text-white border-0 hover:bg-white/30">
            <Share2 className="h-4 w-4 mr-1" /> Chia sẻ
          </Button>
        </div>
      </div>

      {/* Store Header Card */}
      <div className="container max-w-5xl -mt-20 relative z-10 px-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className={`rounded-2xl shadow-xl p-6 sm:p-8 border ${isDark ? "bg-slate-900 border-slate-800" : "bg-card"}`}>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.store_name}
                className="h-20 w-20 rounded-2xl object-cover border-4 shadow-lg"
                style={{ borderColor: store.primary_color }} />
            ) : (
              <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg" style={{ background: gradient }}>
                {store.store_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold">{store.store_name}</h1>
                <Badge className="text-white border-0" style={{ background: gradient }}>
                  <ShieldCheck className="h-3 w-3 mr-1" /> Đã xác thực
                </Badge>
              </div>
              {store.description && (
                <p className={`mt-2 ${isDark ? "text-slate-300" : "text-muted-foreground"}`}>{store.description}</p>
              )}
              {/* Contact chips */}
              <div className="flex flex-wrap gap-2 mt-3 text-sm">
                {store.phone && (
                  <a href={`tel:${store.phone}`} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? "bg-slate-800" : "bg-muted"} hover:opacity-80`}>
                    <Phone className="h-3.5 w-3.5" /> {store.phone}
                  </a>
                )}
                {store.email && (
                  <a href={`mailto:${store.email}`} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? "bg-slate-800" : "bg-muted"} hover:opacity-80`}>
                    <Mail className="h-3.5 w-3.5" /> {store.email}
                  </a>
                )}
                {store.address && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? "bg-slate-800" : "bg-muted"}`}>
                    <MapPin className="h-3.5 w-3.5" /> {store.address}
                  </span>
                )}
                {store.business_hours && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? "bg-slate-800" : "bg-muted"}`}>
                    <Clock className="h-3.5 w-3.5" /> {store.business_hours}
                  </span>
                )}
              </div>
              {/* Social */}
              {(store.website_url || store.facebook_url || store.instagram_url || store.zalo_url) && (
                <div className="flex gap-2 mt-3">
                  {store.website_url && <a href={store.website_url} target="_blank" rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full flex items-center justify-center hover:scale-110 transition" style={{ background: gradient, color: "white" }}><Globe className="h-4 w-4" /></a>}
                  {store.facebook_url && <a href={store.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition"><Facebook className="h-4 w-4" /></a>}
                  {store.instagram_url && <a href={store.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white flex items-center justify-center hover:scale-110 transition"><Instagram className="h-4 w-4" /></a>}
                  {store.zalo_url && <a href={store.zalo_url} target="_blank" rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full bg-blue-500 text-white flex items-center justify-center hover:scale-110 transition text-xs font-bold">Z</a>}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {store.show_stats && (
            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t" style={{ borderColor: isDark ? "rgb(30 41 59)" : undefined }}>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: store.primary_color }}>{stats.total}</p>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>Link đang mở</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: store.primary_color }}>{stats.staticCount}</p>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>QR tĩnh</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold truncate" style={{ color: store.primary_color }}>
                  {stats.avgAmount > 0 ? formatAmount(stats.avgAmount) : "—"}
                </p>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>Trung bình</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Filter & Search */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã hoặc mô tả..." className={`pl-9 ${isDark ? "bg-slate-900 border-slate-800" : ""}`} />
          </div>
          <div className={`flex gap-1 p-1 rounded-lg ${isDark ? "bg-slate-900" : "bg-muted"}`}>
            {[
              { id: "all", label: "Tất cả" },
              { id: "static", label: "QR tĩnh" },
              { id: "dynamic", label: "Một lần" },
            ].map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filter === f.id ? "text-white shadow" : (isDark ? "text-slate-400 hover:text-white" : "text-muted-foreground hover:text-foreground")
                }`}
                style={filter === f.id ? { background: gradient } : undefined}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Links Grid */}
        <div className="mt-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" style={{ color: store.primary_color }} />
              Sản phẩm / Dịch vụ
            </h2>
            <span className={`text-sm ${isDark ? "text-slate-400" : "text-muted-foreground"}`}>{filtered.length} kết quả</span>
          </div>

          {filtered.length === 0 ? (
            <Card className={isDark ? "bg-slate-900 border-slate-800" : ""}>
              <CardContent className="py-16 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className={isDark ? "text-slate-400" : "text-muted-foreground"}>Không tìm thấy link phù hợp</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((link, index) => (
                <motion.div key={link.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <Card className={`group overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 ${isDark ? "bg-slate-900 border-slate-800" : ""}`}>
                    <div className="h-1.5" style={{ background: gradient }} />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Badge variant="outline" className={`text-xs ${isDark ? "border-slate-700" : ""}`}>
                          {link.is_static ? "♾ QR tĩnh" : "⚡ Một lần"}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => copyLink(link.code, link.id)} className="h-7 w-7 p-0 -mr-2 -mt-2">
                          {copiedId === link.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <p className="font-semibold line-clamp-2 min-h-[2.5rem]">
                        {link.description || `Thanh toán ${link.code}`}
                      </p>
                      <p className="text-2xl font-bold mt-2" style={{ color: store.primary_color }}>
                        {formatAmount(link.amount)}
                      </p>
                      <p className={`text-xs mt-1 font-mono ${isDark ? "text-slate-500" : "text-muted-foreground"}`}>{link.code}</p>
                      <Link to={`/pay/${link.code}`} className="block mt-4">
                        <Button className="w-full text-white border-0 group-hover:shadow-lg transition" style={{ background: gradient }}>
                          Thanh toán ngay <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`text-center py-8 text-sm border-t ${isDark ? "text-slate-400 border-slate-800" : "text-muted-foreground"}`}>
          {store.footer_text && <p className="mb-2">{store.footer_text}</p>}
          <p className="flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3" /> Powered by <span className="font-semibold" style={{ color: store.primary_color }}>PayGate</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StorePage;
