import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Sparkles,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Smartphone,
   Loader2,
   RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentInfo {
  id: string;
  code: string;
  amount: number;
  description: string | null;
  status: string;
  merchant: {
    business_name: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const bankNames: Record<string, string> = {
  VCB: "Vietcombank",
  TCB: "Techcombank",
  MB: "MB Bank",
  ACB: "ACB",
  VPB: "VPBank",
  TPB: "TPBank",
  BIDV: "BIDV",
  VTB: "VietinBank",
  AGRI: "Agribank",
  SHB: "SHB",
  MSB: "MSB",
  OCB: "OCB",
  EIB: "Eximbank",
};

const PaymentPage = () => {
  const { code } = useParams<{ code: string }>();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
   const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed" | "failed">("pending");
   const [isChecking, setIsChecking] = useState(false);
   const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPayment = async () => {
      if (!code) {
        setError("Link thanh toán không hợp lệ");
        setLoading(false);
        return;
      }

      const { data: paymentLink, error: linkError } = await supabase
        .from("payment_links")
        .select("*, merchants(*)")
        .eq("code", code)
        .eq("status", "active")
        .maybeSingle();

      if (linkError || !paymentLink) {
        setError("Link thanh toán không tồn tại hoặc đã hết hạn");
        setLoading(false);
        return;
      }

      const merchant = paymentLink.merchants as {
        business_name: string;
        bank_name: string;
        bank_account_number: string;
        bank_account_name: string;
      };

      setPaymentInfo({
        id: paymentLink.id,
        code: paymentLink.code,
        amount: paymentLink.amount,
        description: paymentLink.description,
        status: paymentLink.status,
        merchant: {
          business_name: merchant.business_name,
          bank_name: merchant.bank_name,
          bank_account_number: merchant.bank_account_number,
          bank_account_name: merchant.bank_account_name,
        },
      });
       setPaymentStatus(paymentLink.status === "completed" ? "completed" : "pending");
      setLoading(false);
    };

    fetchPayment();
  }, [code]);
 
   // Subscribe to realtime updates for payment status
   useEffect(() => {
     if (!paymentInfo) return;
 
     const channel = supabase
       .channel(`payment-${paymentInfo.id}`)
       .on(
         "postgres_changes",
         {
           event: "UPDATE",
           schema: "public",
           table: "payment_links",
           filter: `id=eq.${paymentInfo.id}`,
         },
         (payload) => {
           console.log("Payment link updated:", payload);
           if (payload.new.status === "completed") {
             setPaymentStatus("completed");
             toast({
               title: "Thanh toán thành công!",
               description: "Cảm ơn bạn đã thanh toán",
             });
           }
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [paymentInfo, toast]);
 
   // Auto-check for payment status periodically
   useEffect(() => {
     if (!paymentInfo || paymentStatus === "completed") return;
 
     const checkPayment = async () => {
       setIsChecking(true);
       try {
         // Check if payment link status has been updated
         const { data: updatedLink } = await supabase
           .from("payment_links")
           .select("status")
           .eq("id", paymentInfo.id)
           .single();
 
         if (updatedLink?.status === "completed") {
           setPaymentStatus("completed");
           toast({
             title: "Thanh toán thành công!",
             description: "Cảm ơn bạn đã thanh toán",
           });
         }
         setLastChecked(new Date());
       } catch (err) {
         console.error("Error checking payment:", err);
       }
       setIsChecking(false);
     };
 
     // Check immediately on mount
     checkPayment();
 
     // Then check every 10 seconds
     const interval = setInterval(checkPayment, 10000);
 
     return () => clearInterval(interval);
   }, [paymentInfo, paymentStatus, toast]);
 
   const manualCheck = async () => {
     if (!paymentInfo || isChecking) return;
     
     setIsChecking(true);
     try {
       // Call the edge function to check with SePay
       const { data, error } = await supabase.functions.invoke("check-pending-transactions", {
         body: { payment_link_id: paymentInfo.id },
       });
 
       if (error) {
         console.error("Error calling check function:", error);
       }
 
       // Also refresh local status
       const { data: updatedLink } = await supabase
         .from("payment_links")
         .select("status")
         .eq("id", paymentInfo.id)
         .single();
 
       if (updatedLink?.status === "completed") {
         setPaymentStatus("completed");
         toast({
           title: "Thanh toán thành công!",
           description: "Cảm ơn bạn đã thanh toán",
         });
       } else {
         toast({
           title: "Chưa nhận được thanh toán",
           description: "Vui lòng thử lại sau khi đã chuyển khoản",
         });
       }
       setLastChecked(new Date());
     } catch (err) {
       console.error("Error checking payment:", err);
     }
     setIsChecking(false);
   };

  const transferContent = paymentInfo ? `${paymentInfo.code}` : "";

  // Generate VietQR URL
  const getVietQRUrl = () => {
    if (!paymentInfo) return "";
    const bankCode = paymentInfo.merchant.bank_name;
    const accountNo = paymentInfo.merchant.bank_account_number;
    const amount = paymentInfo.amount;
    const content = encodeURIComponent(transferContent);
    return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${content}&accountName=${encodeURIComponent(paymentInfo.merchant.bank_account_name)}`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Đã sao chép",
      description: `${label} đã được sao chép`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-64 w-64 mx-auto" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
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
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Về trang chủ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero py-8 px-4">
      <div className="container max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              PayGate
            </span>
          </Link>
        </motion.div>

        {/* Payment Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center border-b pb-6">
              <CardDescription className="text-sm">Thanh toán cho</CardDescription>
              <CardTitle className="text-2xl">{paymentInfo.merchant.business_name}</CardTitle>
              {paymentInfo.description && (
                <p className="text-muted-foreground mt-2">{paymentInfo.description}</p>
              )}
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
                  <img
                    src={getVietQRUrl()}
                    alt="VietQR Code"
                    className="w-64 h-64 object-contain"
                    onError={(e) => {
                      // Fallback to simple QR if VietQR fails
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
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
                    <p className="font-medium">
                      {bankNames[paymentInfo.merchant.bank_name] || paymentInfo.merchant.bank_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Số tài khoản</p>
                    <p className="font-medium font-mono">{paymentInfo.merchant.bank_account_number}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(paymentInfo.merchant.bank_account_number, "Số tài khoản")
                    }
                  >
                    {copied === "Số tài khoản" ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Chủ tài khoản</p>
                    <p className="font-medium">{paymentInfo.merchant.bank_account_name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(paymentInfo.merchant.bank_account_name, "Tên chủ TK")
                    }
                  >
                    {copied === "Tên chủ TK" ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Nội dung chuyển khoản</p>
                    <p className="font-medium font-mono text-primary">{transferContent}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(transferContent, "Nội dung CK")}
                  >
                    {copied === "Nội dung CK" ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Status */}
             {paymentStatus === "completed" ? (
               <motion.div
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="bg-success/10 border border-success/30 rounded-xl p-6 text-center"
               >
                 <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
                 <h3 className="text-lg font-bold text-success mb-1">
                   Thanh toán thành công!
                 </h3>
                 <p className="text-sm text-muted-foreground">
                   Cảm ơn bạn đã thanh toán
                 </p>
               </motion.div>
             ) : (
               <div className="space-y-3">
                 <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                   {isChecking ? (
                     <>
                       <Loader2 className="h-4 w-4 animate-spin" />
                       <span>Đang kiểm tra giao dịch...</span>
                     </>
                   ) : (
                     <>
                       <Clock className="h-4 w-4" />
                       <span>Đang chờ thanh toán...</span>
                     </>
                   )}
                 </div>
                 
                 <Button
                   variant="outline"
                   className="w-full"
                   onClick={manualCheck}
                   disabled={isChecking}
                 >
                   {isChecking ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   ) : (
                     <RefreshCw className="mr-2 h-4 w-4" />
                   )}
                   Kiểm tra thanh toán
                 </Button>
                 
                 {lastChecked && (
                   <p className="text-center text-xs text-muted-foreground">
                     Kiểm tra lần cuối: {format(lastChecked, "HH:mm:ss", { locale: vi })}
                   </p>
                 )}
               </div>
             )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Thanh toán được xử lý an toàn qua{" "}
          <span className="font-medium">PayGate</span>
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;
