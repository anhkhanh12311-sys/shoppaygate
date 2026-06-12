import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Store, Clock, Phone, Mail, MapPin, Globe, Facebook, Instagram,
  Search, ShieldCheck, Sparkles, ShoppingCart, Plus, Minus, X, Trash2,
  Share2, Package, Image as ImageIcon, ArrowRight, Tag, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";

interface StoreData {
  id: string; slug: string; store_name: string;
  description: string | null; logo_url: string | null; banner_url: string | null;
  primary_color: string; secondary_color: string; footer_text: string | null;
  merchant_id: string; phone: string | null; email: string | null;
  address: string | null; business_hours: string | null;
  facebook_url: string | null; instagram_url: string | null;
  zalo_url: string | null; website_url: string | null;
  show_stats: boolean; theme_style: string;
}

interface StoreProduct {
  id: string; name: string; description: string | null; category: string | null;
  price: number; sale_price: number | null; image_url: string | null;
  stock: number; unlimited_stock: boolean; is_featured: boolean;
  sold_count: number; merchant_id: string;
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ code: string; total: number } | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherInfo, setVoucherInfo] = useState<{ valid: boolean; discount?: number; error?: string; name?: string } | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "",
    customer_address: "", note: "",
  });

  const cart = useCart(slug || "");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: storeData } = await supabase
        .from("merchant_stores").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!storeData) { setNotFound(true); setLoading(false); return; }
      setStore(storeData as any);
      const { data: prodData } = await supabase.rpc("get_public_store_products", { p_slug: slug });
      setProducts((prodData as any) || []);
      setLoading(false);
    })();
  }, [slug]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => products.filter(p => {
    if (category !== "all" && p.category !== category) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
  }), [products, search, category]);

  const shareStore = async () => {
    try {
      if (navigator.share) await navigator.share({ title: store?.store_name, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Đã sao chép link cửa hàng!"); }
    } catch {}
  };

  const addToCart = (p: StoreProduct) => {
    const price = p.sale_price || p.price;
    cart.add({
      product_id: p.id, name: p.name, price, image_url: p.image_url,
      max_stock: p.stock, unlimited: p.unlimited_stock,
    });
    toast.success(`Đã thêm: ${p.name}`);
  };

  const submitOrder = async () => {
    if (!store) return;
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      return toast.error("Vui lòng nhập họ tên và SĐT");
    }
    if (cart.items.length === 0) return toast.error("Giỏ hàng trống");
    setSubmitting(true);
    const { data, error } = await supabase.rpc("public_create_order", {
      p_merchant_id: store.merchant_id,
      p_customer_name: form.customer_name,
      p_customer_phone: form.customer_phone,
      p_customer_email: form.customer_email || null,
      p_customer_address: form.customer_address || null,
      p_note: form.note || null,
      p_shipping_fee: 0,
      p_items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      p_voucher_code: voucherInfo?.valid ? voucherCode : null,
    } as any);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    const res = data as { order_code: string; total: number };
    setCheckoutOpen(false);
    setCartOpen(false);
    cart.clear();
    setVoucherCode(""); setVoucherInfo(null);
    setSuccessOrder({ code: res.order_code, total: res.total });
  };

  const applyVoucher = async () => {
    if (!store || !voucherCode.trim()) return;
    setValidatingVoucher(true);
    const { data, error } = await supabase.rpc("validate_voucher" as any, {
      p_merchant_id: store.merchant_id,
      p_code: voucherCode.trim(),
      p_subtotal: cart.total,
      p_shipping_fee: 0,
    });
    setValidatingVoucher(false);
    if (error) return toast.error(error.message);
    setVoucherInfo(data as any);
    if ((data as any)?.valid) toast.success(`Áp dụng thành công: -${fmt((data as any).discount)}₫`);
    else toast.error((data as any)?.error || "Mã không hợp lệ");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className="container max-w-6xl py-8 space-y-4">
          <Skeleton className="h-32" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-64" />)}
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
          <Link to="/"><Button>Về trang chủ</Button></Link>
        </motion.div>
      </div>
    );
  }

  const isDark = store.theme_style === "dark";
  const gradient = `linear-gradient(135deg, ${store.primary_color} 0%, ${store.secondary_color} 100%)`;
  const containerBg = isDark ? "bg-slate-950 text-slate-100" : "bg-muted/30";

  return (
    <div className={`min-h-screen ${containerBg} pb-24`}>
      {/* Banner */}
      <div className="relative h-48 sm:h-64 overflow-hidden" style={!store.banner_url ? { background: gradient } : undefined}>
        {store.banner_url && <img src={store.banner_url} alt="Banner" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />
        <div className="absolute top-4 right-4 flex gap-2">
          <Button size="sm" variant="secondary" onClick={shareStore}
            className="backdrop-blur bg-white/20 text-white border-0 hover:bg-white/30">
            <Share2 className="h-4 w-4 mr-1" /> Chia sẻ
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="container max-w-6xl -mt-16 relative z-10 px-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className={`rounded-2xl shadow-xl p-5 sm:p-6 border ${isDark ? "bg-slate-900 border-slate-800" : "bg-card"}`}>
          <div className="flex items-start gap-4">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.store_name}
                className="h-16 w-16 rounded-2xl object-cover border-4 shadow-lg shrink-0"
                style={{ borderColor: store.primary_color }} />
            ) : (
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0" style={{ background: gradient }}>
                {store.store_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold">{store.store_name}</h1>
                <Badge className="text-white border-0" style={{ background: gradient }}>
                  <ShieldCheck className="h-3 w-3 mr-1" /> Đã xác thực
                </Badge>
              </div>
              {store.description && <p className={`mt-1.5 text-sm ${isDark ? "text-slate-300" : "text-muted-foreground"}`}>{store.description}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
                {store.phone && <a href={`tel:${store.phone}`} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${isDark ? "bg-slate-800" : "bg-muted"}`}><Phone className="h-3 w-3" />{store.phone}</a>}
                {store.address && <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${isDark ? "bg-slate-800" : "bg-muted"}`}><MapPin className="h-3 w-3" />{store.address}</span>}
                {store.business_hours && <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${isDark ? "bg-slate-800" : "bg-muted"}`}><Clock className="h-3 w-3" />{store.business_hours}</span>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search & categories */}
        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className={`pl-9 h-11 ${isDark ? "bg-slate-900 border-slate-800" : ""}`} />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {["all", ...categories].map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    category === c ? "text-white shadow" : (isDark ? "bg-slate-900 text-slate-300" : "bg-card text-muted-foreground")
                  }`}
                  style={category === c ? { background: gradient } : undefined}>
                  {c === "all" ? "Tất cả" : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products grid */}
        <div className="mt-5 mb-12">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: store.primary_color }} />
              Sản phẩm <span className="text-muted-foreground font-normal">({filtered.length})</span>
            </h2>
          </div>

          {filtered.length === 0 ? (
            <Card className={isDark ? "bg-slate-900 border-slate-800" : ""}>
              <CardContent className="py-16 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className={isDark ? "text-slate-400" : "text-muted-foreground"}>Chưa có sản phẩm</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {filtered.map((p, index) => {
                const finalPrice = p.sale_price || p.price;
                const outOfStock = !p.unlimited_stock && p.stock <= 0;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.5) }}>
                    <Card className={`group overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5 h-full flex flex-col ${isDark ? "bg-slate-900 border-slate-800" : ""}`}>
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                          </div>
                        )}
                        {p.sale_price && (
                          <Badge className="absolute top-2 left-2 bg-destructive text-white border-0 text-[10px]">
                            -{Math.round((1 - p.sale_price / p.price) * 100)}%
                          </Badge>
                        )}
                        {p.is_featured && (
                          <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-0 text-[10px]">
                            HOT
                          </Badge>
                        )}
                        {outOfStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Badge className="bg-white text-black">Hết hàng</Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3 flex-1 flex flex-col gap-2">
                        <p className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-bold tabular-nums" style={{ color: store.primary_color }}>{fmt(finalPrice)}₫</span>
                          {p.sale_price && <span className="text-xs text-muted-foreground line-through">{fmt(p.price)}₫</span>}
                        </div>
                        {p.sold_count > 0 && (
                          <p className="text-[10px] text-muted-foreground">Đã bán {p.sold_count}</p>
                        )}
                        <Button size="sm" className="w-full text-white border-0 mt-auto h-9"
                          style={{ background: gradient }}
                          disabled={outOfStock}
                          onClick={() => addToCart(p)}>
                          <ShoppingCart className="h-3.5 w-3.5" /> Thêm vào giỏ
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`text-center py-6 text-xs border-t ${isDark ? "text-slate-400 border-slate-800" : "text-muted-foreground"}`}>
          {store.footer_text && <p className="mb-1">{store.footer_text}</p>}
          <p>Powered by <span className="font-semibold" style={{ color: store.primary_color }}>PayGate</span></p>
        </div>
      </div>

      {/* Floating cart button */}
      <AnimatePresence>
        {cart.count > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
            <Button onClick={() => setCartOpen(true)}
              className="w-full h-14 text-white border-0 shadow-2xl rounded-2xl text-base font-semibold justify-between px-5"
              style={{ background: gradient }}>
              <span className="flex items-center gap-2">
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -top-2 -right-2 bg-white text-black rounded-full h-5 min-w-5 px-1 text-[10px] flex items-center justify-center font-bold">
                    {cart.count}
                  </span>
                </div>
                Xem giỏ
              </span>
              <span className="tabular-nums">{fmt(cart.total)}₫</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Giỏ hàng ({cart.count})</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-2">
            {cart.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                Giỏ hàng trống
              </div>
            ) : cart.items.map(it => (
              <div key={it.product_id} className="flex gap-3 p-2 rounded-xl border">
                <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                  {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{it.name}</p>
                  <p className="text-sm font-bold text-primary tabular-nums">{fmt(it.price)}₫</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.setQty(it.product_id, it.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.setQty(it.product_id, it.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto text-destructive" onClick={() => cart.remove(it.product_id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cart.items.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Tổng cộng</span>
                <span className="text-primary tabular-nums">{fmt(cart.total)}₫</span>
              </div>
              <Button className="w-full h-12 text-white border-0" style={{ background: gradient }} onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                Đặt hàng <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thông tin đặt hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Họ tên *</Label>
              <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SĐT *</Label>
                <Input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ nhận hàng</Label>
              <Textarea rows={2} value={form.customer_address} onChange={e => setForm({ ...form, customer_address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Mã giảm giá</Label>
              <div className="flex gap-2">
                <Input placeholder="Nhập mã" value={voucherCode}
                  onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherInfo(null); }} />
                <Button type="button" variant="outline" disabled={validatingVoucher || !voucherCode.trim()}
                  onClick={applyVoucher}>
                  {validatingVoucher ? "..." : "Áp dụng"}
                </Button>
              </div>
              {voucherInfo && (
                <p className={`text-xs ${voucherInfo.valid ? "text-emerald-600" : "text-destructive"}`}>
                  {voucherInfo.valid ? `✓ Giảm ${fmt(voucherInfo.discount || 0)}₫` : voucherInfo.error}
                </p>
              )}
            </div>

            <div className="rounded-xl border p-3 space-y-1.5 text-sm bg-muted/30">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Đơn hàng</p>
              {cart.items.map(it => (
                <div key={it.product_id} className="flex justify-between">
                  <span className="truncate flex-1">{it.name} × {it.quantity}</span>
                  <span className="tabular-nums">{fmt(it.price * it.quantity)}₫</span>
                </div>
              ))}
              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>Tạm tính</span><span className="tabular-nums">{fmt(cart.total)}₫</span>
              </div>
              {voucherInfo?.valid && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Giảm giá</span><span className="tabular-nums">-{fmt(voucherInfo.discount || 0)}₫</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Tổng</span>
                <span className="text-primary tabular-nums">{fmt(Math.max(0, cart.total - (voucherInfo?.valid ? (voucherInfo.discount || 0) : 0)))}₫</span>
              </div>
            </div>


            <Button className="w-full h-11 text-white border-0" style={{ background: gradient }}
              disabled={submitting} onClick={submitOrder}>
              {submitting ? "Đang gửi..." : "Xác nhận đặt hàng"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={!!successOrder} onOpenChange={() => setSuccessOrder(null)}>
        <DialogContent className="max-w-sm text-center">
          <div className="space-y-3 py-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <h2 className="text-xl font-bold">Đặt hàng thành công!</h2>
            <div className="rounded-xl bg-muted/40 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Mã đơn</p>
              <p className="font-mono font-bold text-lg">{successOrder?.code}</p>
              <p className="text-2xl font-bold text-primary tabular-nums">{fmt(successOrder?.total || 0)}₫</p>
            </div>
            <p className="text-sm text-muted-foreground">Cửa hàng sẽ liên hệ bạn để xác nhận và hướng dẫn thanh toán.</p>
            <Button className="w-full" onClick={() => setSuccessOrder(null)}>Tiếp tục mua hàng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StorePage;
