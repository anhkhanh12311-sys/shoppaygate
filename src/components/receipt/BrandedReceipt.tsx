import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Phone, MapPin, Globe, Facebook, Instagram, MessageCircle } from "lucide-react";
import type { ReceiptSettings } from "@/hooks/useReceiptSettings";

export interface ReceiptTransaction {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at?: string;
  bank_reference?: string | null;
  transfer_content?: string | null;
  payment_method?: string;
  cashier_name?: string | null;
}

interface Props {
  settings: ReceiptSettings;
  transaction: ReceiptTransaction;
  variant?: "screen" | "print";
  className?: string;
}

const fmtVnd = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + " ₫";

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("vi-VN", { hour12: false });
};

// QR helper
const useQr = (text?: string | null) => {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let cancel = false;
    if (!text) { setSrc(""); return; }
    QRCode.toDataURL(text, { width: 256, margin: 1, errorCorrectionLevel: "M" })
      .then((d) => { if (!cancel) setSrc(d); })
      .catch(() => { if (!cancel) setSrc(""); });
    return () => { cancel = true; };
  }, [text]);
  return src;
};

const LogoFallback = ({ name, color }: { name?: string | null; color: string }) => (
  <div
    className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
    style={{ backgroundColor: color }}
  >
    {(name?.trim()?.[0] || "S").toUpperCase()}
  </div>
);

export const BrandedReceipt = forwardRef<HTMLDivElement, Props>(
  ({ settings, transaction, variant = "screen", className = "" }, ref) => {
    const zaloQr = useQr(settings.qr_zalo_enabled ? settings.qr_zalo_url : null);
    const mapsQr = useQr(settings.qr_maps_enabled ? settings.qr_maps_url : null);
    const [logoOk, setLogoOk] = useState(true);

    const isCompleted = transaction.status === "completed";
    const expiryDate = transaction.paid_at
      ? new Date(new Date(transaction.paid_at).getTime() + (settings.voucher_expiry_days || 30) * 86400000)
      : null;

    return (
      <div
        ref={ref}
        className={`font-receipt bg-white text-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-100 ${className}`}
        style={{ maxWidth: 420 }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-6 text-white relative"
          style={{
            background: `linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.secondary_color} 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            {settings.logo_url && logoOk ? (
              <img
                src={settings.logo_url}
                alt="logo"
                className="h-14 w-14 rounded-full object-cover bg-white p-1 shrink-0"
                onError={() => setLogoOk(false)}
                crossOrigin="anonymous"
              />
            ) : (
              <LogoFallback name={settings.shop_name} color={settings.secondary_color} />
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-lg leading-tight truncate">
                {settings.shop_name || "Cửa hàng"}
              </h2>
              {settings.slogan && (
                <p className="text-xs opacity-90 truncate">{settings.slogan}</p>
              )}
            </div>
          </div>
          {settings.greeting && (
            <p className="text-sm mt-4 opacity-95">{settings.greeting},</p>
          )}
        </div>

        {/* Amount box */}
        <div className="px-5 -mt-4 relative z-10">
          <div
            className="rounded-2xl p-4 text-center shadow-lg border border-white"
            style={{
              background: `linear-gradient(135deg, ${settings.primary_color}15 0%, ${settings.secondary_color}15 100%)`,
            }}
          >
            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">
              {isCompleted ? "Đã thanh toán" : "Trạng thái"}
            </p>
            <p
              className="text-3xl font-extrabold mt-1"
              style={{ color: settings.primary_color }}
            >
              {fmtVnd(transaction.amount)}
            </p>
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                isCompleted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {isCompleted ? "✓ Thành công" : "Đang xử lý"}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-2 text-sm">
          <Row k="Thời gian" v={fmtDate(transaction.paid_at || transaction.created_at)} />
          <Row k="Mã giao dịch" v={transaction.bank_reference || transaction.id.slice(0, 12).toUpperCase()} mono />
          <Row k="Nội dung" v={transaction.transfer_content || "—"} />
          <Row k="Hình thức" v={transaction.payment_method || "Chuyển khoản QR"} />
          {transaction.cashier_name && <Row k="Thu ngân" v={transaction.cashier_name} />}
        </div>

        {/* Voucher */}
        {settings.voucher_enabled && settings.voucher_text && (
          <div className="px-5 pb-4">
            <div
              className="rounded-xl p-3 border-2 border-dashed"
              style={{ borderColor: settings.primary_color, backgroundColor: `${settings.primary_color}08` }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: settings.primary_color }}>
                    🎁 Ưu đãi
                  </p>
                  <p className="font-semibold text-sm truncate">{settings.voucher_text}</p>
                  {expiryDate && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      HSD: {expiryDate.toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </div>
                {settings.voucher_code && (
                  <span
                    className="px-3 py-1.5 rounded-lg font-mono font-bold text-sm text-white shrink-0"
                    style={{ backgroundColor: settings.primary_color }}
                  >
                    {settings.voucher_code}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QR row */}
        {(zaloQr || mapsQr) && (
          <div className="px-5 pb-4 flex items-center justify-around gap-4">
            {zaloQr && (
              <div className="text-center">
                <img src={zaloQr} alt="Zalo" className="h-20 w-20 mx-auto rounded-lg border" />
                <p className="text-[10px] font-semibold mt-1 text-gray-600">Kết bạn Zalo</p>
              </div>
            )}
            {mapsQr && (
              <div className="text-center">
                <img src={mapsQr} alt="Maps" className="h-20 w-20 mx-auto rounded-lg border" />
                <p className="text-[10px] font-semibold mt-1 text-gray-600">Tìm đường</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-dashed border-gray-200 bg-gray-50 space-y-1.5 text-xs text-gray-600">
          {settings.hotline && (
            <div className="flex items-center gap-2"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{settings.hotline}</span></div>
          )}
          {settings.address && (
            <div className="flex items-center gap-2"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{settings.address}</span></div>
          )}
          {settings.website && (
            <div className="flex items-center gap-2"><Globe className="h-3 w-3 shrink-0" /><span className="truncate">{settings.website}</span></div>
          )}
          {(settings.social_links?.facebook || settings.social_links?.instagram || settings.social_links?.zalo) && (
            <div className="flex items-center gap-3 pt-1">
              {settings.social_links?.facebook && <Facebook className="h-4 w-4" style={{ color: settings.primary_color }} />}
              {settings.social_links?.instagram && <Instagram className="h-4 w-4" style={{ color: settings.primary_color }} />}
              {settings.social_links?.zalo && <MessageCircle className="h-4 w-4" style={{ color: settings.primary_color }} />}
            </div>
          )}
          {settings.closing && (
            <p
              className="text-center font-semibold pt-3 text-sm"
              style={{ color: settings.primary_color }}
            >
              {settings.closing}
            </p>
          )}
        </div>
      </div>
    );
  }
);

BrandedReceipt.displayName = "BrandedReceipt";

const Row = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex justify-between items-start gap-3">
    <span className="text-gray-500 shrink-0">{k}</span>
    <span className={`text-right break-all ${mono ? "font-mono" : ""}`}>{v}</span>
  </div>
);
