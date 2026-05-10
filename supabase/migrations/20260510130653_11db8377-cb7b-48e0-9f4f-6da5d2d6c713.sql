-- Admin upsert callback config for any merchant (also creates a 'free' plan subscription if none)
CREATE OR REPLACE FUNCTION public.admin_upsert_merchant_callback(
  p_merchant_id UUID,
  p_callback_url TEXT,
  p_secret TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin';
  END IF;

  -- Ensure subscription row exists; if none, attach to 'free' plan if available, else any plan
  IF NOT EXISTS (SELECT 1 FROM public.merchant_subscriptions WHERE merchant_id = p_merchant_id) THEN
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE code = 'free' AND is_active = true LIMIT 1;
    IF v_plan_id IS NULL THEN
      SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_active = true ORDER BY sort_order LIMIT 1;
    END IF;
    IF v_plan_id IS NOT NULL THEN
      INSERT INTO public.merchant_subscriptions (merchant_id, plan_id, status, billing_cycle, started_at, tx_used)
      VALUES (p_merchant_id, v_plan_id, 'trial', 'monthly', now(), 0);
    END IF;
  END IF;

  UPDATE public.merchant_subscriptions
  SET topup_callback_url = NULLIF(p_callback_url, ''),
      topup_secret       = NULLIF(p_secret, ''),
      updated_at = now()
  WHERE merchant_id = p_merchant_id;
END;
$$;

-- Admin set merchant.webhook_url + webhook_enabled (payment.completed event)
CREATE OR REPLACE FUNCTION public.admin_set_merchant_webhook(
  p_merchant_id UUID,
  p_webhook_url TEXT,
  p_enabled BOOLEAN
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin';
  END IF;
  UPDATE public.merchants
  SET webhook_url = NULLIF(p_webhook_url, ''),
      webhook_enabled = COALESCE(p_enabled, false),
      updated_at = now()
  WHERE id = p_merchant_id;
END;
$$;