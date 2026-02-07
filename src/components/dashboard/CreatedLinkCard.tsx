import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreatedLinkCardProps {
  url: string;
  code: string;
  amount: number;
  isStatic: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const CreatedLinkCard = ({
  url, code, amount, isStatic, bankName, bankAccountNumber, bankAccountName,
}: CreatedLinkCardProps) => {
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed">("pending");
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  // VietQR URL for instant QR display
  const vietQRUrl = bankName && bankAccountNumber
    ? `https://img.vietqr.io/image/${bankName}-${bankAccountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(bankAccountName)}`
    : null;

  // Auto-poll for transaction status
  useEffect(() => {
    if (paymentStatus === "completed") return;

    const checkStatus = async () => {
      setIsChecking(true);
      const { data } = await supabase
        .from("payment_links")
        .select("status")
        .eq("code", code)
        .maybeSingle();

      if (data?.status === "completed") {
        setPaymentStatus("completed");
        toast({ title: "🎉 Thanh toán thành công!", description: `Đã nhận ${formatCurrency(amount)}` });
      }
      setIsChecking(false);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, [code, paymentStatus, amount, toast]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`link-${code}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "payment_links",
        filter: `code=eq.${code}`,
      }, (payload) => {
        if (payload.new.status === "completed") {
          setPaymentStatus("completed");
          toast({ title: "🎉 Thanh toán thành công!", description: `Đã nhận ${formatCurrency(amount)}` });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [code, amount, toast]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Đã sao chép", description: "Link đã được sao chép vào clipboard" });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <Card className={`border-success/50 ${paymentStatus === "completed" ? "bg-success/10" : "bg-success/5"}`}>
        <CardHeader>
          <CardTitle className="text-success flex items-center gap-2">
            {paymentStatus === "completed" ? (
              <><CheckCircle2 className="h-5 w-5" /> Đã thanh toán!</>
            ) : (
              <><Check className="h-5 w-5" /> {isStatic ? "QR Code đã tạo!" : "Link đã tạo!"}</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code display */}
          {vietQRUrl && (
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-xl shadow-inner">
                <img
                  src={vietQRUrl}
                  alt="VietQR"
                  className="w-52 h-52 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const fallback = document.createElement("div");
                      fallback.className = "flex items-center justify-center w-52 h-52";
                      const qrContainer = document.createElement("div");
                      parent.appendChild(qrContainer);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Fallback QR if no VietQR */}
          {!vietQRUrl && (
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-xl">
                <QRCodeSVG value={url} size={200} />
              </div>
            </div>
          )}

          {/* Payment status indicator */}
          {paymentStatus === "pending" && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              {isChecking ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra giao dịch...</>
              ) : (
                <><Clock className="h-4 w-4" /> Tự động kiểm tra mỗi 8 giây</>
              )}
            </div>
          )}

          {/* Link */}
          <div className="p-3 bg-background rounded-lg border">
            <p className="text-sm break-all font-mono">{url}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={copyToClipboard}>
              {copied ? <><Check className="mr-2 h-4 w-4" /> Đã sao chép</> : <><Copy className="mr-2 h-4 w-4" /> Sao chép</>}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => window.open(url, "_blank")}>
              <ExternalLink className="mr-2 h-4 w-4" /> Mở link
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CreatedLinkCard;
