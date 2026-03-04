import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ExternalLink, CreditCard, Clock, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [links, setLinks] = useState<PaymentLinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchStore = async () => {
      const { data: storeData, error } = await supabase
        .from("merchant_stores")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !storeData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStore(storeData);

      // Fetch active payment links for this merchant
      const { data: linksData } = await supabase
        .from("payment_links")
        .select("id, code, amount, description, status, is_static, created_at")
        .eq("merchant_id", storeData.merchant_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setLinks(linksData || []);
      setLoading(false);
    };

    fetchStore();
  }, [slug]);

  const copyLink = (code: string, id: string) => {
    const url = `${window.location.origin}/pay/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Đã sao chép link thanh toán!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className="container max-w-4xl py-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <Store className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Cửa hàng không tồn tại</h1>
          <p className="text-muted-foreground">Đường dẫn này không khả dụng hoặc cửa hàng đã ngừng hoạt động.</p>
          <Link to="/">
            <Button>Về trang chủ</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const gradientStyle = {
    background: `linear-gradient(135deg, ${store.primary_color} 0%, ${store.secondary_color} 100%)`,
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-48 sm:h-64 overflow-hidden"
        style={store.banner_url ? undefined : gradientStyle}
      >
        {store.banner_url && (
          <img
            src={store.banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </motion.div>

      {/* Store Info */}
      <div className="container max-w-4xl -mt-16 relative z-10 px-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border"
        >
          <div className="flex items-start gap-4">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.store_name}
                className="h-16 w-16 rounded-xl object-cover border-2 shadow-sm"
                style={{ borderColor: store.primary_color }}
              />
            ) : (
              <div
                className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-sm"
                style={gradientStyle}
              >
                {store.store_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">{store.store_name}</h1>
              {store.description && (
                <p className="text-muted-foreground mt-1">{store.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className="text-white"
                  style={gradientStyle}
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  {links.length} link thanh toán
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Payment Links */}
        <div className="mt-8 mb-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" style={{ color: store.primary_color }} />
            Danh sách thanh toán
          </h2>

          {links.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Chưa có link thanh toán nào</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {links.map((link, index) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-all group overflow-hidden">
                    <div className="h-1" style={gradientStyle} />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {link.description || `Thanh toán #${link.code}`}
                          </p>
                          <p
                            className="text-xl font-bold mt-1"
                            style={{ color: store.primary_color }}
                          >
                            {formatAmount(link.amount)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {link.is_static ? "QR tĩnh" : "Một lần"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {link.code}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyLink(link.code, link.id)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedId === link.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Link to={`/pay/${link.code}`}>
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0 text-white"
                              style={gradientStyle}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {store.footer_text && (
          <div className="text-center py-6 text-sm text-muted-foreground border-t">
            {store.footer_text}
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;
