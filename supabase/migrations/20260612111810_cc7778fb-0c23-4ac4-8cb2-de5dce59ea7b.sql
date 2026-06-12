
ALTER TABLE public.merchant_subscriptions
  ADD COLUMN IF NOT EXISTS tx_quota_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tx_quota_limit INTEGER,
  ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + INTERVAL '1 month');

ALTER TABLE public.topup_callbacks
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_topup_callbacks_retry
  ON public.topup_callbacks(next_retry_at) WHERE status = 'failed';

-- Record quota usage
CREATE OR REPLACE FUNCTION public.record_topup_quota_usage(p_merchant_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_sub public.merchant_subscriptions%ROWTYPE; v_over BOOLEAN := false;
BEGIN
  SELECT * INTO v_sub FROM public.merchant_subscriptions WHERE merchant_id = p_merchant_id;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'no_subscription'); END IF;

  IF v_sub.quota_reset_at IS NOT NULL AND v_sub.quota_reset_at <= now() THEN
    UPDATE public.merchant_subscriptions
      SET tx_quota_used = 0,
          quota_reset_at = date_trunc('month', now()) + INTERVAL '1 month'
      WHERE id = v_sub.id;
    v_sub.tx_quota_used := 0;
  END IF;

  IF v_sub.tx_quota_limit IS NOT NULL AND v_sub.tx_quota_used >= v_sub.tx_quota_limit THEN
    v_over := true;
  END IF;

  UPDATE public.merchant_subscriptions
    SET tx_quota_used = tx_quota_used + 1, updated_at = now()
    WHERE id = v_sub.id;

  RETURN json_build_object('ok', NOT v_over, 'used', v_sub.tx_quota_used + 1,
    'limit', v_sub.tx_quota_limit, 'over_quota', v_over);
END $$;

-- Dashboard
CREATE OR REPLACE FUNCTION public.get_topup_rental_dashboard()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_mid UUID; r JSON;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_mid IS NULL THEN RETURN '{}'::json; END IF;
  SELECT json_build_object(
    'subscription', (SELECT json_build_object(
        'plan_id', plan_id, 'status', status, 'expires_at', expires_at,
        'tx_quota_used', tx_quota_used, 'tx_quota_limit', tx_quota_limit,
        'quota_reset_at', quota_reset_at,
        'topup_callback_url', topup_callback_url,
        'has_secret', topup_secret IS NOT NULL
      ) FROM public.merchant_subscriptions WHERE merchant_id = v_mid),
    'callbacks_total', (SELECT COUNT(*) FROM public.topup_callbacks WHERE merchant_id = v_mid),
    'callbacks_success', (SELECT COUNT(*) FROM public.topup_callbacks WHERE merchant_id = v_mid AND status = 'success'),
    'callbacks_failed', (SELECT COUNT(*) FROM public.topup_callbacks WHERE merchant_id = v_mid AND status = 'failed'),
    'callbacks_pending_retry', (SELECT COUNT(*) FROM public.topup_callbacks
        WHERE merchant_id = v_mid AND status = 'failed' AND retry_count < 5),
    'today_topups', (SELECT COUNT(*) FROM public.balance_topups
        WHERE merchant_id = v_mid AND created_at::date = CURRENT_DATE),
    'today_amount', COALESCE((SELECT SUM(amount) FROM public.balance_topups
        WHERE merchant_id = v_mid AND created_at::date = CURRENT_DATE), 0)
  ) INTO r;
  RETURN r;
END $$;

-- Regen secret
CREATE OR REPLACE FUNCTION public.regenerate_topup_secret()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_mid UUID; v_secret TEXT;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_mid IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;
  v_secret := 'whsec_' || encode(gen_random_bytes(24), 'hex');
  UPDATE public.merchant_subscriptions
    SET topup_secret = v_secret, updated_at = now()
    WHERE merchant_id = v_mid;
  IF NOT FOUND THEN RAISE EXCEPTION 'No subscription'; END IF;
  RETURN v_secret;
END $$;

-- Manual retry
CREATE OR REPLACE FUNCTION public.retry_topup_callback(p_callback_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_mid UUID;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  UPDATE public.topup_callbacks
    SET status = 'failed', next_retry_at = now()
    WHERE id = p_callback_id AND merchant_id = v_mid;
END $$;

-- List callbacks
CREATE OR REPLACE FUNCTION public.list_topup_callbacks(p_limit INT DEFAULT 50, p_status TEXT DEFAULT NULL)
RETURNS SETOF public.topup_callbacks LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_mid UUID;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  RETURN QUERY SELECT * FROM public.topup_callbacks
    WHERE merchant_id = v_mid AND (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC LIMIT p_limit;
END $$;
