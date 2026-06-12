
-- Mở rộng merchant_banks
ALTER TABLE public.merchant_banks
  ADD COLUMN IF NOT EXISTS daily_limit NUMERIC,
  ADD COLUMN IF NOT EXISTS current_daily_received NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS auto_route_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sepay_account_id TEXT,
  ADD COLUMN IF NOT EXISTS sepay_api_key TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS selected_bank_id UUID REFERENCES public.merchant_banks(id) ON DELETE SET NULL;

-- Pick best bank
CREATE OR REPLACE FUNCTION public.pick_best_bank(p_merchant_id UUID, p_amount NUMERIC DEFAULT 0)
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.merchant_banks
  WHERE merchant_id = p_merchant_id
    AND auto_route_enabled = true
    AND (
      daily_limit IS NULL OR
      (CASE WHEN last_reset_date < CURRENT_DATE THEN 0 ELSE current_daily_received END) + p_amount <= daily_limit
    )
  ORDER BY priority ASC, COALESCE(last_used_at, 'epoch'::timestamptz) ASC, is_default DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.merchant_banks
    WHERE merchant_id = p_merchant_id
    ORDER BY is_default DESC, created_at ASC LIMIT 1;
  END IF;
  RETURN v_id;
END $$;

-- Record bank usage (called from edge function on successful tx)
CREATE OR REPLACE FUNCTION public.record_bank_usage(p_bank_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.merchant_banks
  SET current_daily_received = CASE WHEN last_reset_date < CURRENT_DATE THEN p_amount
                                    ELSE current_daily_received + p_amount END,
      last_reset_date = CURRENT_DATE,
      last_used_at = now()
  WHERE id = p_bank_id;
END $$;

-- Link bank to SePay
CREATE OR REPLACE FUNCTION public.link_bank_sepay(
  p_bank_id UUID, p_sepay_api_key TEXT, p_sepay_account_id TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_mid UUID;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_mid IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;
  UPDATE public.merchant_banks
  SET sepay_api_key = NULLIF(p_sepay_api_key,''),
      sepay_account_id = NULLIF(p_sepay_account_id,''),
      updated_at = now()
  WHERE id = p_bank_id AND merchant_id = v_mid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank not found or access denied'; END IF;
END $$;

-- Update bank routing config
CREATE OR REPLACE FUNCTION public.update_bank_routing(
  p_bank_id UUID, p_priority INTEGER, p_daily_limit NUMERIC, p_auto_route BOOLEAN
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_mid UUID;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_mid IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;
  UPDATE public.merchant_banks
  SET priority = COALESCE(p_priority, priority),
      daily_limit = p_daily_limit,
      auto_route_enabled = COALESCE(p_auto_route, auto_route_enabled),
      updated_at = now()
  WHERE id = p_bank_id AND merchant_id = v_mid;
END $$;

-- Stats
CREATE OR REPLACE FUNCTION public.get_bank_routing_stats()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_mid UUID; r JSON;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_mid IS NULL THEN RETURN '{}'::json; END IF;
  SELECT json_build_object(
    'total_banks', (SELECT COUNT(*) FROM public.merchant_banks WHERE merchant_id = v_mid),
    'active_routing', (SELECT COUNT(*) FROM public.merchant_banks WHERE merchant_id = v_mid AND auto_route_enabled = true),
    'linked_sepay', (SELECT COUNT(*) FROM public.merchant_banks WHERE merchant_id = v_mid AND sepay_api_key IS NOT NULL),
    'today_received', COALESCE((SELECT SUM(CASE WHEN last_reset_date = CURRENT_DATE THEN current_daily_received ELSE 0 END)
        FROM public.merchant_banks WHERE merchant_id = v_mid),0)
  ) INTO r;
  RETURN r;
END $$;
