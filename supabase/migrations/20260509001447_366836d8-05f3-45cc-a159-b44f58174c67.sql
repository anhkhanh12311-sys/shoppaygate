
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public settings"
  ON public.system_settings FOR SELECT
  USING (is_public = true);

CREATE POLICY "Admins manage all settings"
  ON public.system_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_upsert_setting(
  p_key TEXT, p_value JSONB, p_is_public BOOLEAN DEFAULT NULL, p_description TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin';
  END IF;
  INSERT INTO public.system_settings (key, value, is_public, description, updated_by, updated_at)
  VALUES (p_key, p_value, COALESCE(p_is_public, false), p_description, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    is_public = COALESCE(p_is_public, public.system_settings.is_public),
    description = COALESCE(p_description, public.system_settings.description),
    updated_by = auth.uid(),
    updated_at = now();
END; $$;

INSERT INTO public.system_settings (key, value, is_public, description) VALUES
  ('topup_bank', jsonb_build_object(
      'bank_name', 'MBBank',
      'bank_account_number', '0000000000',
      'bank_account_name', 'CONG TY PAYGATE',
      'content_prefix', 'NAP',
      'note', 'Vui lòng chuyển khoản đúng nội dung để được cộng tiền tự động.'
    ), true, 'Thông tin tài khoản nhận nạp tiền hệ thống'),
  ('api_branding', jsonb_build_object(
      'brand_name', 'PayGate',
      'api_version', 'v2',
      'support_email', 'support@paygate.vn',
      'doc_url', ''
    ), true, 'Thông tin thương hiệu hiển thị trong tài liệu API')
ON CONFLICT (key) DO NOTHING;
