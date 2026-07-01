import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Sparkles, Copy, Check, Clock, CheckCircle2, AlertCircle,
  ArrowLeft, Smartphone, Loader2, RefreshCw, PartyPopper, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  bank: {
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
  } | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const bankNames: Record<string, string> = {
  VCB: "Vietcombank", TCB: "Techcombank", MB: "MB Bank", ACB: "ACB",
  VPB: "VPBank", TPB: "TPBank", BIDV: "BIDV", VTB: "VietinBank",
  AGRI: "Agribank", SHB: "SHB", MSB: "MSB", OCB: "OCB", EIB: "Eximbank",
};

// Confetti particle component
const Confetti = () => (
  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    {Array.from({ length: 40 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-3 h-3 rounded-sm"
        style={{
          left: `${Math.random() * 100}%`,
          backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"][i % 6],
        }}
        initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
        animate={{
          y: window.innerHeight + 20,
          opacity: [1, 1, 0],
          rotate: Math.random() * 720 - 360,
          x: Math.random() * 200 - 100,
          scale: [1, 0.8, 0.5],
        }}
        transition={{
          duration: 2 + Math.random() * 2,
          delay: Math.random() * 0.5,
          ease: "easeOut",
        }}
      />
    ))}
  </div>
);

const PaymentPage = () => {
  const { code } = useParams<{ code: string }>();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed" | "failed">("pending");
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [signal, setSignal] = useState<{
    webhook_hits_24h: number;
    banks_with_sepay_key: number;
    legacy_secret_key: boolean;
    last_webhook_at: string | null;
  } | null>(null);
  const { toast } = useToast();

  const markCompleted = () => {
    setPaymentStatus("completed");
    setShowConfetti(true);
    toast({ title: "🎉 Thanh toán thành công!", description: "Cảm ơn bạn đã thanh toán" });
    setTimeout(() => setShowConfetti(false), 4000);
  };

  useEffect(() => {
    const fetchPayment = async () => {
      if (!code) { setError("Link thanh toán không hợp lệ"); setLoading(false); return; }

      const { data: rows, error: rpcErr } = await supabase
        .rpc("get_public_payment_link", { p_code: code });

      const row = Array.isArray(rows) ? rows[0] : null;
      if (rpcErr || !row) {
        setError("Link thanh toán không tồn tại hoặc đã hết hạn");
        setLoading(false);
        return;
      }

      const bankInfo = row.bank_account_number
        ? {
            bank_name: row.bank_name,
            bank_account_number: row.bank_account_number,
            bank_account_name: row.bank_account_name,
          }
        : null;

      setPaymentInfo({
        id: row.id, code: row.code, amount: row.amount,
        description: row.description, status: row.status,
        merchant_id: row.merchant_id,
        merchant: { business_name: row.merchant_business_name },
        bank: bankInfo,
      });
      setPaymentStatus(row.status === "completed" ? "completed" : "pending");
      setLoading(false);
    };
    fetchPayment();
  }, [code]);


  // Realtime subscription
  useEffect(() => {
    if (!paymentInfo || paymentStatus === "completed") return;
    const channel = supabase
      .channel(`payment-${paymentInfo.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "payment_links",
        filter: `id=eq.${paymentInfo.id}`,
      }, (payload) => {
        if (payload.new.status === "completed") markCompleted();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [paymentInfo, paymentStatus]);

  // Also listen for new transactions
  useEffect(() => {
    if (!paymentInfo || paymentStatus === "completed") return;
    const channel = supabase
      .channel(`tx-${paymentInfo.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "transactions",
        filter: `payment_link_id=eq.${paymentInfo.id}`,
      }, (payload) => {
        if ((payload.new as any).status === "completed") markCompleted();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [paymentInfo, paymentStatus]);

  // Signal health probe (once + refresh every 30s while pending)
  useEffect(() => {
    if (!paymentInfo || paymentStatus === "completed") return;
    let stop = false;
    const load = async () => {
      const { data } = await supabase.rpc("get_merchant_signal_health", {
        p_merchant_id: paymentInfo.merchant_id,
      });
      if (!stop && data) setSignal(data as any);
    };
    load();
    const t = setInterval(load, 30000);
    return () => { stop = true; clearInterval(t); };
  }, [paymentInfo, paymentStatus]);

  // Ultra-fast auto-check: aggressive polling + active SePay pull
  useEffect(() => {
    if (!paymentInfo || paymentStatus === "completed") return;
    // Aggressive at start (giây đầu), giãn dần để giữ tải hợp lý
    const intervals = [2000, 2000, 3000, 3000, 4000, 5000, 7000, 10000, 15000, 20000];
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let count = 0;

    const check = async () => {
      if (cancelled) return;
      setIsChecking(true);
      try {
        // 1) Check status via public RPC (webhook có thể đã ghi)
        const { data: st } = await supabase
          .rpc("get_public_payment_status", { p_code: paymentInfo.code });
        if (st === "completed") { markCompleted(); return; }


        // 2) Mỗi 2 lần, chủ động pull SePay API qua edge function
        if (count % 2 === 0) {
          supabase.functions.invoke("check-pending-transactions", {
            body: { merchant_id: paymentInfo.merchant_id, payment_link_id: paymentInfo.id },
          }).catch(() => {});
        }
        setLastChecked(new Date());
        count++;
        setCheckCount(count);
      } catch {}
      setIsChecking(false);
      if (cancelled) return;
      const delay = intervals[Math.min(count, intervals.length - 1)];
      timeoutId = setTimeout(check, delay);
    };

    // Lần check đầu tiên ngay sau 1s — người dùng gần như không phải chờ
    timeoutId = setTimeout(check, 1000);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [paymentInfo, paymentStatus]);

  const manualCheck = async () => {
    if (!paymentInfo || isChecking) return;
    setIsChecking(true);
    try {
      await supabase.functions.invoke("check-pending-transactions", {
        body: { payment_link_id: paymentInfo.id },
      });
      const { data: st } = await supabase
        .rpc("get_public_payment_status", { p_code: paymentInfo.code });

      if (st === "completed") {
        markCompleted();
      } else {
        toast({ title: "Chưa nhận được thanh toán", description: "Hệ thống sẽ tiếp tục kiểm tra tự động" });
      }
      setLastChecked(new Date());
    } catch {}
    setIsChecking(false);
  };

  const transferContent = paymentInfo ? paymentInfo.code : "";
  const bank = paymentInfo?.bank;

  const getVietQRUrl = () => {
    if (!paymentInfo || !bank) return "";
    return `https://img.vietqr.io/image/${bank.bank_name}-${bank.bank_account_number}-compact2.png?amount=${paymentInfo.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bank.bank_account_name)}`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Đã sao chép", description: `${label} đã được sao chép` });
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader><Skeleton className="h-8 w-48 mx-auto" /></CardHeader>
          <CardContent className="space-y-4"><Skeleton className="h-64 w-64 mx-auto" /><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error || !paymentInfo) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Không tìm thấy link thanh toán</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Về trang chủ</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already completed (no bank needed)
  if (paymentStatus === "completed" && !bank) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="py-12 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
              </motion.div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Đã thanh toán thành công!</h2>
              <p className="text-3xl font-bold mb-2">{formatCurrency(paymentInfo.amount)}</p>
              <p className="text-muted-foreground">Thanh toán cho {paymentInfo.merchant.business_name}</p>
              <Badge className="mt-4 bg-green-500/20 text-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" /> Đã xác thực
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Chưa cấu hình ngân hàng</h2>
            <p className="text-muted-foreground mb-6">Người bán chưa thiết lập thông tin ngân hàng</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero py-8 px-4">
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>
      <div className="container max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">PayGate</span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center border-b pb-6">
              <CardDescription className="text-sm">Thanh toán cho</CardDescription>
              <CardTitle className="text-2xl">{paymentInfo.merchant.business_name}</CardTitle>
              {paymentInfo.description && <p className="text-muted-foreground mt-2">{paymentInfo.description}</p>}
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Amount */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Số tiền</p>
                <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  {formatCurrency(paymentInfo.amount)}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-inner">
                  <img src={getVietQRUrl()} alt="VietQR" className="w-64 h-64 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Hướng dẫn thanh toán
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Mở ứng dụng ngân hàng hoặc ví điện tử</li>
                  <li>Quét mã QR ở trên</li>
                  <li>Kiểm tra thông tin và xác nhận thanh toán</li>
                </ol>
              </div>

              {/* Bank info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Ngân hàng</p>
                    <p className="font-medium">{bankNames[bank.bank_name] || bank.bank_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Số tài khoản</p>
                    <p className="font-medium font-mono">{bank.bank_account_number}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bank.bank_account_number, "STK")}>
                    {copied === "STK" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Chủ tài khoản</p>
                    <p className="font-medium">{bank.bank_account_name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bank.bank_account_name, "CTK")}>
                    {copied === "CTK" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Nội dung chuyển khoản</p>
                    <p className="font-medium font-mono text-primary">{transferContent}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(transferContent, "NDCK")}>
                    {copied === "NDCK" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Payment status */}
              <AnimatePresence mode="wait">
                {paymentStatus === "completed" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", delay: 0.1 }}
                    >
                      <PartyPopper className="h-14 w-14 mx-auto text-green-500 mb-3" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-green-600 mb-1">Thanh toán thành công!</h3>
                    <p className="text-sm text-muted-foreground mb-3">Giao dịch đã được xác thực tự động</p>
                    <Badge className="bg-green-500/20 text-green-600">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Xác thực bởi hệ thống
                    </Badge>
                  </motion.div>
                ) : (
                  <motion.div key="pending" className="space-y-3">
                    {/* Auto-check progress */}
                    <div className="relative rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Trạng thái</span>
                        <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                          <Clock className="h-3 w-3 mr-1" /> Đang chờ
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isChecking ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Đang kiểm tra...</>
                        ) : (
                          <><div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Tự động kiểm tra</>
                        )}
                        {lastChecked && (
                          <span className="ml-auto">Lần cuối: {format(lastChecked, "HH:mm:ss", { locale: vi })}</span>
                        )}
                      </div>
                    </div>

                    <Button variant="outline" className="w-full" onClick={manualCheck} disabled={isChecking}>
                      {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Kiểm tra ngay
                    </Button>

                    {signal && (
                      <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Webhook SePay 24h qua</span>
                          <Badge
                            variant="outline"
                            className={
                              signal.webhook_hits_24h > 0
                                ? "text-green-600 border-green-500/40"
                                : "text-amber-600 border-amber-500/40"
                            }
                          >
                            {signal.webhook_hits_24h > 0 ? `${signal.webhook_hits_24h} sự kiện` : "Chưa có"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Nguồn dự phòng (poll API)</span>
                          <Badge
                            variant="outline"
                            className={
                              signal.banks_with_sepay_key + (signal.legacy_secret_key ? 1 : 0) > 0
                                ? "text-green-600 border-green-500/40"
                                : "text-red-600 border-red-500/40"
                            }
                          >
                            {signal.banks_with_sepay_key + (signal.legacy_secret_key ? 1 : 0)} key
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Số lần đã kiểm tra</span>
                          <span className="font-medium">{checkCount}</span>
                        </div>
                        {signal.webhook_hits_24h === 0 &&
                          signal.banks_with_sepay_key === 0 &&
                          !signal.legacy_secret_key && (
                            <div className="mt-2 flex gap-2 rounded-md bg-amber-500/10 p-2 text-amber-700 dark:text-amber-400">
                              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span>
                                Cửa hàng chưa cấu hình tự động đối soát SePay. Sau khi chuyển khoản,
                                vui lòng chờ nhân viên xác nhận thủ công.
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Thanh toán được xử lý an toàn qua <span className="font-medium">PayGate</span>
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;
