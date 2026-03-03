import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, ExternalLink, Loader2, Clock, CheckCircle2, PartyPopper, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [checkCount, setCheckCount] = useState(0);
  const { toast } = useToast();

  const vietQRUrl = bankName && bankAccountNumber
    ? `https://img.vietqr.io/image/${bankName}-${bankAccountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(bankAccountName)}`
    : null;

  const markCompleted = () => {
    setPaymentStatus("completed");
    toast({ title: "🎉 Thanh toán thành công!", description: `Đã nhận ${formatCurrency(amount)}` });
  };

  // Smart auto-check with escalating intervals
  useEffect(() => {
    if (paymentStatus === "completed") return;
    const intervals = [5000, 5000, 8000, 8000, 10000, 15000, 20000, 30000];
    let timeoutId: ReturnType<typeof setTimeout>;

    const check = async () => {
      setIsChecking(true);
      try {
        const { data } = await supabase
          .from("payment_links").select("status").eq("code", code).maybeSingle();
        if (data?.status === "completed") { markCompleted(); return; }
        setCheckCount(c => c + 1);
      } catch {}
      setIsChecking(false);
      const delay = intervals[Math.min(checkCount, intervals.length - 1)];
      timeoutId = setTimeout(check, delay);
    };

    timeoutId = setTimeout(check, 3000);
    return () => clearTimeout(timeoutId);
  }, [code, paymentStatus, checkCount]);

  // Realtime: payment_links
  useEffect(() => {
    const channel = supabase
      .channel(`link-${code}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "payment_links",
        filter: `code=eq.${code}`,
      }, (payload) => {
        if (payload.new.status === "completed") markCompleted();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [code, amount]);

  // Realtime: transactions INSERT
  useEffect(() => {
    const channel = supabase
      .channel(`tx-link-${code}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "transactions",
      }, (payload) => {
        const tx = payload.new as any;
        if (tx.status === "completed" && tx.transfer_content?.includes(code)) {
          markCompleted();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [code]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Đã sao chép", description: "Link đã được sao chép" });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <Card className={paymentStatus === "completed"
        ? "border-green-500/50 bg-green-500/5 shadow-lg shadow-green-500/10"
        : "border-primary/30 bg-primary/5"
      }>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {paymentStatus === "completed" ? (
                <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-green-600">
                  <PartyPopper className="h-5 w-5" /> Đã thanh toán thành công!
                </motion.div>
              ) : (
                <motion.div key="pending" className="flex items-center gap-2 text-primary">
                  <Check className="h-5 w-5" /> {isStatic ? "QR Code đã tạo!" : "Link đã tạo!"}
                </motion.div>
              )}
            </AnimatePresence>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code */}
          {vietQRUrl ? (
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-xl shadow-inner">
                <img src={vietQRUrl} alt="VietQR" className="w-52 h-52 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-xl">
                <QRCodeSVG value={url} size={200} />
              </div>
            </div>
          )}

          {/* Status indicator */}
          <AnimatePresence mode="wait">
            {paymentStatus === "completed" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-green-500/10 border border-green-500/30"
              >
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Xác thực tự động thành công</span>
              </motion.div>
            ) : (
              <motion.div key="checking" className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                {isChecking ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra...</>
                ) : (
                  <><div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Tự động kiểm tra realtime</>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
