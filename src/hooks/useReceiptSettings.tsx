import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";

export interface ReceiptSettings {
  id?: string;
  merchant_id: string;
  logo_url: string | null;
  shop_name: string | null;
  slogan: string | null;
  primary_color: string;
  secondary_color: string;
  hotline: string | null;
  address: string | null;
  website: string | null;
  social_links: { facebook?: string; instagram?: string; tiktok?: string; zalo?: string };
  greeting: string | null;
  closing: string | null;
  voucher_enabled: boolean;
  voucher_text: string | null;
  voucher_code: string | null;
  voucher_max_uses: number | null;
  voucher_expiry_days: number;
  qr_zalo_enabled: boolean;
  qr_zalo_url: string | null;
  qr_maps_enabled: boolean;
  qr_maps_url: string | null;
  auto_open_share: boolean;
}

const defaults = (merchantId: string, businessName?: string): ReceiptSettings => ({
  merchant_id: merchantId,
  logo_url: null,
  shop_name: businessName || "Cửa hàng của tôi",
  slogan: "Cảm ơn quý khách đã mua hàng!",
  primary_color: "#7C3AED",
  secondary_color: "#3B82F6",
  hotline: null,
  address: null,
  website: null,
  social_links: {},
  greeting: "Kính chào quý khách",
  closing: "Hẹn gặp lại quý khách lần sau!",
  voucher_enabled: false,
  voucher_text: "Giảm 10% cho đơn hàng tiếp theo",
  voucher_code: "WELCOME10",
  voucher_max_uses: null,
  voucher_expiry_days: 30,
  qr_zalo_enabled: false,
  qr_zalo_url: null,
  qr_maps_enabled: false,
  qr_maps_url: null,
  auto_open_share: false,
});

export const useReceiptSettings = () => {
  const { merchant } = useMerchant();
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!merchant) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("shop_receipt_settings" as any)
      .select("*")
      .eq("merchant_id", merchant.id)
      .maybeSingle();

    if (data) {
      setSettings(data as unknown as ReceiptSettings);
    } else {
      setSettings(defaults(merchant.id, merchant.business_name));
    }
    setLoading(false);
  }, [merchant]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const save = async (next: ReceiptSettings) => {
    if (!merchant) return { error: new Error("No merchant") };
    setSaving(true);
    const payload = { ...next, merchant_id: merchant.id };
    const { error } = await supabase
      .from("shop_receipt_settings" as any)
      .upsert(payload, { onConflict: "merchant_id" });
    setSaving(false);
    if (!error) await fetchSettings();
    return { error };
  };

  const uploadLogo = async (file: File): Promise<{ url?: string; error?: Error }> => {
    if (!merchant) return { error: new Error("No merchant") };
    const ext = file.name.split(".").pop() || "png";
    const path = `${merchant.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("receipt-logos").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    if (error) return { error: new Error(error.message) };
    const { data } = supabase.storage.from("receipt-logos").getPublicUrl(path);
    return { url: data.publicUrl };
  };

  return { settings, setSettings, loading, saving, save, uploadLogo, refetch: fetchSettings };
};
