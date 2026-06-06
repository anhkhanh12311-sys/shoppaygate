import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import html2canvas from "html2canvas";
import { Download, Printer, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BrandedReceipt } from "@/components/receipt/BrandedReceipt";
import type { ReceiptSettings } from "@/hooks/useReceiptSettings";
import { toast } from "@/hooks/use-toast";

const BillPublic = () => {
  const { id } = useParams<{ id: string }>();
  const billRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState<any>(null);
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: tx } = await supabase.rpc("get_public_bill" as any, { p_transaction_id: id });
      const row = Array.isArray(tx) ? tx[0] : tx;
      if (!row) { setLoading(false); return; }
      setBill(row);
      const { data: s } = await supabase.rpc("get_public_receipt_settings" as any, { p_merchant_id: row.merchant_id });
      const sRow = Array.isArray(s) ? s[0] : s;
      setSettings({
        merchant_id: row.merchant_id,
        logo_url: sRow?.logo_url ?? null,
        shop_name: sRow?.shop_name ?? row.merchant_business_name,
        slogan: sRow?.slogan ?? null,
        primary_color: sRow?.primary_color ?? "#7C3AED",
        secondary_color: sRow?.secondary_color ?? "#3B82F6",
        hotline: sRow?.hotline ?? null,
        address: sRow?.address ?? null,
        website: sRow?.website ?? null,
        social_links: sRow?.social_links ?? {},
        greeting: sRow?.greeting ?? null,
        closing: sRow?.closing ?? "Cảm ơn quý khách!",
        voucher_enabled: sRow?.voucher_enabled ?? false,
        voucher_text: sRow?.voucher_text ?? null,
        voucher_code: sRow?.voucher_code ?? null,
        voucher_max_uses: null,
        voucher_expiry_days: sRow?.voucher_expiry_days ?? 30,
        qr_zalo_enabled: sRow?.qr_zalo_enabled ?? false,
        qr_zalo_url: sRow?.qr_zalo_url ?? null,
        qr_maps_enabled: sRow?.qr_maps_enabled ?? false,
        qr_maps_url: sRow?.qr_maps_url ?? null,
        auto_open_share: false,
      });
      setLoading(false);
    })();
  }, [id]);

  const downloadImage = async () => {
    if (!billRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(billRef.current, { useCORS: true, backgroundColor: "#fff", scale: 2 });
      const a = document.createElement("a");
      a.download = `bill-${id?.slice(0, 8)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch {
      toast({ title: "Tải ảnh thất bại", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 flex items-center justify-center p-4">
        <Skeleton className="h-[600px] w-full max-w-md rounded-2xl" />
      </div>
    );
  }

  if (!bill || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-2xl font-bold mb-2">Không tìm thấy bill</p>
          <p className="text-muted-foreground mb-4">Hoá đơn không tồn tại hoặc đã bị xoá.</p>
          <Link to="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Về trang chủ</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 py-8"
      style={{
        background: `linear-gradient(160deg, ${settings.primary_color}10 0%, ${settings.secondary_color}10 100%)`,
      }}
    >
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between no-print">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">PayGate</span>
          </Link>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="print-receipt">
          <BrandedReceipt
            ref={billRef}
            settings={settings}
            transaction={{
              id: bill.tx_id,
              amount: Number(bill.amount),
              status: bill.status,
              paid_at: bill.paid_at,
              bank_reference: bill.bank_reference,
              transfer_content: bill.transfer_content,
            }}
          />
        </div>

        <p className="text-xs text-center text-muted-foreground no-print">
          Hoá đơn điện tử · Powered by <Link to="/" className="font-semibold text-primary">PayGate</Link>
        </p>
      </div>
    </div>
  );
};

export default BillPublic;
