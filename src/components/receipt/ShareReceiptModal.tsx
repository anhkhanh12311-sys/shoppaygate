import { useRef, useState } from "react";
import { MessageCircle, Mail, Link2, Printer, Copy, Check, Download, Loader2, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { BrandedReceipt, type ReceiptTransaction } from "@/components/receipt/BrandedReceipt";
import type { ReceiptSettings } from "@/hooks/useReceiptSettings";
import { useBillShares } from "@/hooks/useBillShares";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: ReceiptSettings;
  transaction: ReceiptTransaction;
}

export const ShareReceiptModal = ({ open, onOpenChange, settings, transaction }: Props) => {
  const { logShare } = useBillShares();
  const billRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const billUrl = `${window.location.origin}/bill/${transaction.id}`;
  const shopName = settings.shop_name || "Cửa hàng";
  const amount = new Intl.NumberFormat("vi-VN").format(transaction.amount) + "đ";
  const defaultMsg = `Cảm ơn quý khách đã thanh toán ${amount} tại ${shopName}!\nXem hoá đơn: ${billUrl}`;

  const [smsText, setSmsText] = useState(defaultMsg);
  const [phone, setPhone] = useState("");

  const copy = async (text: string, channel: "link" | "zalo") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      await logShare(channel, transaction.id);
      toast({ title: "Đã sao chép" });
    } catch {
      toast({ title: "Không sao chép được", variant: "destructive" });
    }
  };

  const openZalo = async () => {
    await logShare("zalo", transaction.id);
    window.location.href = `zalo://`;
  };

  const sendSms = async () => {
    if (!phone) {
      toast({ title: "Nhập số điện thoại", variant: "destructive" });
      return;
    }
    await logShare("sms", transaction.id, phone);
    window.location.href = `sms:${phone}?body=${encodeURIComponent(smsText)}`;
  };

  const downloadImage = async () => {
    if (!billRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(billRef.current, { useCORS: true, backgroundColor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      link.download = `bill-${transaction.id.slice(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Đã tải ảnh bill" });
    } catch (e) {
      toast({ title: "Tải ảnh thất bại", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const printBill = async () => {
    await logShare("print", transaction.id);
    window.print();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto no-print">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" /> Chia sẻ hoá đơn
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="link" className="text-xs"><Link2 className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="zalo" className="text-xs"><MessageCircle className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
              <TabsTrigger value="email" disabled className="text-xs"><Mail className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="print" className="text-xs"><Printer className="h-4 w-4" /></TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">Link bill duy nhất, có thể chia sẻ bất kỳ đâu:</p>
              <div className="flex gap-2">
                <Input value={billUrl} readOnly className="font-mono text-xs" />
                <Button onClick={() => copy(billUrl, "link")} variant="outline">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={downloadImage} disabled={downloading} variant="outline" className="w-full">
                {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Tải bill về máy (PNG)
              </Button>
            </TabsContent>

            <TabsContent value="zalo" className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">Sao chép tin nhắn rồi gửi cho khách trên Zalo:</p>
              <Textarea value={defaultMsg} readOnly rows={4} className="text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => copy(defaultMsg, "zalo")} variant="outline">
                  {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy
                </Button>
                <Button onClick={openZalo} className="gradient-primary text-white">
                  <MessageCircle className="h-4 w-4 mr-2" /> Mở Zalo
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-3 mt-4">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại khách" />
              <Textarea value={smsText} onChange={(e) => setSmsText(e.target.value)} rows={4} />
              <Button onClick={sendSms} className="w-full gradient-primary text-white">Gửi SMS</Button>
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Email (sắp ra mắt)</p>
                <p className="text-xs">Tính năng đang phát triển</p>
              </div>
            </TabsContent>

            <TabsContent value="print" className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">In bill ra giấy nhiệt khổ 80mm:</p>
              <Button onClick={printBill} className="w-full gradient-primary text-white">
                <Printer className="h-4 w-4 mr-2" /> In ngay
              </Button>
            </TabsContent>
          </Tabs>

          {/* Hidden bill for capture */}
          <div className="absolute -left-[9999px] top-0 pointer-events-none">
            <BrandedReceipt ref={billRef} settings={settings} transaction={transaction} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Print container — visible only during @media print */}
      <div className="print-receipt hidden print:block">
        <BrandedReceipt settings={settings} transaction={transaction} variant="print" />
      </div>
    </>
  );
};
