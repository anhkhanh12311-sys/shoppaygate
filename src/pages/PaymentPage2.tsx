import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, Clock, CheckCircle2, AlertCircle, ArrowLeft,
  Smartphone, Loader2, RefreshCw, ShieldCheck, QrCode, Building2,
  Wallet, CreditCard, Sparkles, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentInfo {
  id: string;
  code: string;
  amount: number;
  description: string | null;
  status: string;
  merchant_id: string;
  merchant: { business_name: string };
  bank: { bank_name: string; bank_account_number: string; bank_account_name: string } | null;
}

interface Brand {
  logo_url: string | null;
  shop_name: string | null;
  slogan: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  hotline: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const bankNames: Record<string, string> = {
  VCB: "Vietcombank", TCB: "Techcombank", MB: "MB Bank", ACB: "ACB",
  VPB: "VPBank", TPB: "TPBank", BIDV: "BIDV", VTB: "VietinBank",
  AGRI: "Agribank", SHB: "SHB", MSB: "MSB", OCB: "OCB", EIB: "Eximbank",
};

const PaymentPage2 = () => {
  const { code } = useParams<{ code: string }>();
  const { toast } = useToast();

  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"pending" | "verifying" | "completed">("pending");
  const [copied, setCopied] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60);

  // Fetch link + brand
  useEffect(() => {
    if (!code) { setError("Link không hợp lệ"); setLoading(false); return; }
    (async () => {
      const { data: rows } = await supabase.rpc("get_public_payment_link", { p_code: code });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) { setError("Link không tồn tại hoặc đã hết hạn"); setLoading(false); return; }

      const bankInfo = row.bank_account_number
        ? { bank_name: row.bank_name, bank_account_number: row.bank_account_number, bank_account_name: row.bank_account_name }
        : null;

      const paymentInfo: PaymentInfo = {
        id: row.id, code: row.code, amount: row.amount,
        description: row.description, status: row.status,
        merchant_id: row.merchant_id,
        merchant: { business_name: row.merchant_business_name },
        bank: bankInfo,
      };
      setInfo(paymentInfo);
      setStatus(row.status === "completed" ? "completed" : "pending");

      // Brand
      const { data: brandRows } = await supabase.rpc("get_public_receipt_settings", {
        p_merchant_id: row.merchant_id,
      });
      const b = Array.isArray(brandRows) ? brandRows[0] : null;
      if (b) setBrand(b as Brand);
      setLoading(false);
    })();
  }, [code]);

  // Countdown
  useEffect(() => {
    if (status === "completed") return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [status]);

  const markCompleted = () => {
    setStatus("completed");
    toast({ title: "🎉 Thanh toán thành công!", description: "Cảm ơn bạn." });
  };

  // Realtime — payment_links + transactions
  useEffect(() => {
    if (!info || status === "completed") return;
    const ch = supabase
      .channel(`pay2-${info.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "payment_links", filter: `id=eq.${info.id}`,
      }, (p) => { if (p.new.status === "completed") markCompleted(); })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "transactions", filter: `payment_link_id=eq.${info.id}`,
      }, (p) => { if ((p.new as any).status === "completed") markCompleted(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [info, status]);

  // Polling
  useEffect(() => {
    if (!info || status === "completed") return;
    const delays = [2000, 3000, 4000, 5000, 7000, 10000, 15000];
    let cancelled = false;
    let count = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (cancelled) return;
      setIsChecking(true);
      try {
        const { data: st } = await supabase.rpc("get_public_payment_status", { p_code: info.code });
        if (st === "completed") { markCompleted(); return; }
        if (count % 2 === 0) {
          supabase.functions.invoke("check-pending-transactions", {
            body: { merchant_id: info.merchant_id, payment_link_id: info.id },
          }).catch(() => {});
          setStatus((s) => (s === "completed" ? s : "verifying"));
          setTimeout(() => setStatus((s) => (s === "verifying" ? "pending" : s)), 1500);
        }
        count++;
      } catch {}
      setIsChecking(false);
      if (!cancelled) t = setTimeout(tick, delays[Math.min(count, delays.length - 1)]);
    };
    t = setTimeout(tick, 1500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [info, status]);

  const bank = info?.bank;
  const transferContent = info?.code ?? "";

  const qrUrl = useMemo(() => {
    if (!info || !bank) return "";
    return `https://img.vietqr.io/image/${bank.bank_name}-${bank.bank_account_number}-compact2.png?amount=${info.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bank.bank_account_name)}`;
  }, [info, bank, transferContent]);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const manualCheck = async () => {
    if (!info || isChecking) return;
    setIsChecking(true);
    try {
      await supabase.functions.invoke("check-pending-transactions", {
        body: { payment_link_id: info.id },
      });
      const { data: st } = await supabase.rpc("get_public_payment_status", { p_code: info.code });
      if (st === "completed") markCompleted();
      else toast({ title: "Chưa nhận được", description: "Hệ thống vẫn đang tự động kiểm tra." });
    } catch {}
    setIsChecking(false);
  };

  const brandName = brand?.shop_name || info?.merchant.business_name || "Cửa hàng";
  const primary = brand?.primary_color || "#3E7BFA";
  const secondary = brand?.secondary_color || "#22D3EE";
  const mm = Math.floor(countdown / 60).toString().padStart(2, "0");
  const ss = (countdown % 60).toString().padStart(2, "0");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Card className="max-w-md text-center bg-slate-900 border-slate-800">
          <CardContent className="py-10">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Không tìm thấy link</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Link to="/"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Về trang chủ</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{
        background: `radial-gradient(1200px 600px at 10% -10%, ${primary}22, transparent 60%), radial-gradient(900px 500px at 100% 100%, ${secondary}22, transparent 60%), #0b1220`,
        color: "#e2e8f0",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Brand header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brandName} className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <p className="font-bold text-lg leading-tight">{brandName}</p>
              {brand?.slogan && <p className="text-xs text-slate-400">{brand.slogan}</p>}
            </div>
          </div>
          <StatusPill status={status} countdown={countdown === 0 ? "hết hạn" : `${mm}:${ss}`} />
        </div>

        {/* 2-column layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: QR + tabs */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl">
            <CardContent className="p-6">
              <Tabs defaultValue="qr" className="w-full">
                <TabsList className="grid grid-cols-4 bg-slate-800/60 mb-4">
                  <TabsTrigger value="qr" className="text-xs"><QrCode className="h-3.5 w-3.5 mr-1" />VietQR</TabsTrigger>
                  <TabsTrigger value="bank" className="text-xs"><Building2 className="h-3.5 w-3.5 mr-1" />CK thủ công</TabsTrigger>
                  <TabsTrigger value="wallet" className="text-xs" disabled><Wallet className="h-3.5 w-3.5 mr-1" />Ví</TabsTrigger>
                  <TabsTrigger value="card" className="text-xs" disabled><CreditCard className="h-3.5 w-3.5 mr-1" />Thẻ</TabsTrigger>
                </TabsList>

                <TabsContent value="qr" className="mt-0">
                  {bank ? (
                    <div className="flex justify-center">
                      <div className="p-3 bg-white rounded-2xl">
                        <img src={qrUrl} alt="VietQR"
                          className="w-64 h-64 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 py-16">Chưa cấu hình ngân hàng</p>
                  )}
                  <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    Mở app ngân hàng → quét QR → xác nhận
                  </p>
                </TabsContent>

                <TabsContent value="bank" className="mt-0 space-y-2">
                  {bank ? (
                    <>
                      <Row label="Ngân hàng" value={bankNames[bank.bank_name] || bank.bank_name} />
                      <Row label="Số tài khoản" value={bank.bank_account_number}
                        onCopy={() => copy(bank.bank_account_number, "STK")} copied={copied === "STK"} mono />
                      <Row label="Chủ tài khoản" value={bank.bank_account_name}
                        onCopy={() => copy(bank.bank_account_name, "CTK")} copied={copied === "CTK"} />
                      <Row label="Số tiền" value={fmt(info.amount)}
                        onCopy={() => copy(String(info.amount), "AMT")} copied={copied === "AMT"} highlight />
                      <Row label="Nội dung CK" value={transferContent}
                        onCopy={() => copy(transferContent, "NDCK")} copied={copied === "NDCK"} mono highlight />
                    </>
                  ) : <p className="text-center text-slate-400 py-8">Chưa cấu hình ngân hàng</p>}
                </TabsContent>

                <TabsContent value="wallet"><p className="text-center text-slate-400 py-16 text-sm">MoMo / ZaloPay — sắp ra mắt</p></TabsContent>
                <TabsContent value="card"><p className="text-center text-slate-400 py-16 text-sm">Thẻ nội địa / quốc tế — sắp ra mắt</p></TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Right: Summary + status */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Thanh toán cho</p>
                <p className="text-lg font-bold">{brandName}</p>
                {info.description && <p className="text-sm text-slate-400 mt-1">{info.description}</p>}
              </div>

              <div className="border-y border-slate-800 py-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Số tiền</p>
                <p className="text-4xl font-bold font-mono" style={{ color: primary }}>
                  {fmt(info.amount)}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <Info label="Mã đơn" value={info.code} mono />
                <Info label="Hết hạn sau" value={countdown === 0 ? "Đã hết hạn" : `${mm}:${ss}`} />
                {brand?.hotline && <Info label="Hotline" value={brand.hotline} />}
              </div>

              <AnimatePresence mode="wait">
                {status === "completed" ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl p-5 text-center"
                    style={{ background: `${primary}22`, border: `1px solid ${primary}44` }}
                  >
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2" style={{ color: primary }} />
                    <p className="font-bold text-lg" style={{ color: primary }}>Đã thanh toán thành công</p>
                    <Badge className="mt-2 border-0" style={{ background: `${primary}33`, color: primary }}>
                      <ShieldCheck className="h-3 w-3 mr-1" /> Đã xác thực
                    </Badge>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    <Button onClick={manualCheck} disabled={isChecking} className="w-full rounded-xl h-12"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, color: "white" }}>
                      {isChecking
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang kiểm tra…</>
                        : <><RefreshCw className="h-4 w-4 mr-2" /> Kiểm tra ngay</>}
                    </Button>
                    <p className="text-center text-xs text-slate-500">
                      Hệ thống tự động cập nhật khi nhận được tiền
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Bảo mật bởi <span className="font-semibold" style={{ color: primary }}>PayGate</span> · Payment Page 2.0
        </p>
      </div>
    </div>
  );
};

const StatusPill = ({ status, countdown }: { status: "pending" | "verifying" | "completed"; countdown: string }) => {
  const map = {
    pending: { text: "Chờ thanh toán", color: "bg-slate-700/60 text-slate-200", icon: Clock, pulse: false },
    verifying: { text: "Đang xác minh", color: "bg-amber-500/20 text-amber-300", icon: Radio, pulse: true },
    completed: { text: "Đã thanh toán", color: "bg-emerald-500/20 text-emerald-300", icon: CheckCircle2, pulse: false },
  }[status];
  const Icon = map.icon;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${map.color}`}>
      <Icon className={`h-3.5 w-3.5 ${map.pulse ? "animate-pulse" : ""}`} />
      {map.text}
      {status !== "completed" && <span className="opacity-70 font-mono">· {countdown}</span>}
    </div>
  );
};

const Row = ({ label, value, onCopy, copied, mono, highlight }: {
  label: string; value: string; onCopy?: () => void; copied?: boolean; mono?: boolean; highlight?: boolean;
}) => (
  <div className={`flex items-center justify-between p-3 rounded-lg ${highlight ? "bg-primary/10 border border-primary/20" : "bg-slate-800/40"}`}>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
    {onCopy && (
      <Button variant="ghost" size="icon" onClick={onCopy} className="h-8 w-8 shrink-0">
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </Button>
    )}
  </div>
);

const Info = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-400">{label}</span>
    <span className={mono ? "font-mono" : ""}>{value}</span>
  </div>
);

export default PaymentPage2;
