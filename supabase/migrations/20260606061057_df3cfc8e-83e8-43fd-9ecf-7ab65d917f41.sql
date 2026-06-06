
-- 1) shop_receipt_settings
CREATE TABLE public.shop_receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE,
  logo_url TEXT,
  shop_name TEXT,
  slogan TEXT,
  primary_color TEXT NOT NULL DEFAULT '#7C3AED',
  secondary_color TEXT NOT NULL DEFAULT '#3B82F6',
  hotline TEXT,
  address TEXT,
  website TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  greeting TEXT,
  closing TEXT,
  voucher_enabled BOOLEAN NOT NULL DEFAULT false,
  voucher_text TEXT,
  voucher_code TEXT,
  voucher_max_uses INT,
  voucher_expiry_days INT NOT NULL DEFAULT 30,
  qr_zalo_enabled BOOLEAN NOT NULL DEFAULT false,
  qr_zalo_url TEXT,
  qr_maps_enabled BOOLEAN NOT NULL DEFAULT false,
  qr_maps_url TEXT,
  auto_open_share BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_receipt_settings TO authenticated;
GRANT ALL ON public.shop_receipt_settings TO service_role;

ALTER TABLE public.shop_receipt_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view receipt settings"
  ON public.shop_receipt_settings FOR SELECT TO authenticated
  USING (public.is_merchant_owner(merchant_id));

CREATE POLICY "Owner can insert receipt settings"
  ON public.shop_receipt_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_merchant_owner(merchant_id));

CREATE POLICY "Owner can update receipt settings"
  ON public.shop_receipt_settings FOR UPDATE TO authenticated
  USING (public.is_merchant_owner(merchant_id))
  WITH CHECK (public.is_merchant_owner(merchant_id));

CREATE POLICY "Owner can delete receipt settings"
  ON public.shop_receipt_settings FOR DELETE TO authenticated
  USING (public.is_merchant_owner(merchant_id));

CREATE TRIGGER trg_shop_receipt_settings_updated
  BEFORE UPDATE ON public.shop_receipt_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) bill_shares
CREATE TABLE public.bill_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  transaction_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('zalo','sms','email','link','print')),
  recipient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bill_shares_merchant_created ON public.bill_shares(merchant_id, created_at DESC);
CREATE INDEX idx_bill_shares_channel ON public.bill_shares(merchant_id, channel);

GRANT SELECT, INSERT ON public.bill_shares TO authenticated;
GRANT ALL ON public.bill_shares TO service_role;

ALTER TABLE public.bill_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view bill shares"
  ON public.bill_shares FOR SELECT TO authenticated
  USING (public.is_merchant_owner(merchant_id));

CREATE POLICY "Owner can insert bill shares"
  ON public.bill_shares FOR INSERT TO authenticated
  WITH CHECK (public.is_merchant_owner(merchant_id));

-- 3) Public RPC for /bill/:id page (returns safe subset)
CREATE OR REPLACE FUNCTION public.get_public_receipt_settings(p_merchant_id UUID)
RETURNS TABLE (
  logo_url TEXT, shop_name TEXT, slogan TEXT,
  primary_color TEXT, secondary_color TEXT,
  hotline TEXT, address TEXT, website TEXT,
  social_links JSONB,
  greeting TEXT, closing TEXT,
  voucher_enabled BOOLEAN, voucher_text TEXT, voucher_code TEXT,
  voucher_expiry_days INT,
  qr_zalo_enabled BOOLEAN, qr_zalo_url TEXT,
  qr_maps_enabled BOOLEAN, qr_maps_url TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    logo_url, shop_name, slogan,
    primary_color, secondary_color,
    hotline, address, website,
    social_links,
    greeting, closing,
    voucher_enabled, voucher_text, voucher_code,
    voucher_expiry_days,
    qr_zalo_enabled, qr_zalo_url,
    qr_maps_enabled, qr_maps_url
  FROM public.shop_receipt_settings
  WHERE merchant_id = p_merchant_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_receipt_settings(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_receipt_settings(UUID) TO anon, authenticated;

-- 4) Public RPC to fetch transaction + merchant + settings for /bill/:id
CREATE OR REPLACE FUNCTION public.get_public_bill(p_transaction_id UUID)
RETURNS TABLE (
  tx_id UUID, amount NUMERIC, transfer_content TEXT, bank_reference TEXT,
  status TEXT, paid_at TIMESTAMPTZ, payment_code TEXT,
  merchant_id UUID, merchant_business_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id, t.amount, t.transfer_content, t.bank_reference,
    t.status, t.paid_at,
    pl.code,
    m.id, m.business_name
  FROM public.transactions t
  LEFT JOIN public.payment_links pl ON pl.id = t.payment_link_id
  JOIN public.merchants m ON m.id = t.merchant_id
  WHERE t.id = p_transaction_id AND t.status = 'completed'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_bill(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_bill(UUID) TO anon, authenticated;
