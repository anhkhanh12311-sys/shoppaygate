
-- 1) Safe view of merchants (no bank account number, no bank name/account name)
CREATE OR REPLACE VIEW public.merchants_safe
WITH (security_invoker = true) AS
SELECT
  id,
  auth_user_id,
  business_name,
  email,
  phone,
  webhook_url,
  webhook_enabled,
  balance,
  topup_code,
  created_at,
  updated_at
FROM public.merchants;

GRANT SELECT ON public.merchants_safe TO authenticated, anon;

-- 2) Idempotency table for incoming SePay webhook events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'sepay',
  event_key TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_source_key_unique UNIQUE (source, event_key)
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage webhook_events"
ON public.webhook_events
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

-- 3) Lock down SECURITY DEFINER admin functions
DO $$
DECLARE
  fn TEXT;
  sigs TEXT[] := ARRAY[
    'public.admin_grant_role(uuid, app_role)',
    'public.admin_revoke_role(uuid, app_role)',
    'public.admin_adjust_balance(uuid, numeric, text)',
    'public.admin_set_merchant_webhook(uuid, text, boolean)',
    'public.admin_upsert_setting(text, jsonb, boolean, text)',
    'public.admin_upsert_merchant_callback(uuid, text, text)',
    'public.get_admin_stats()',
    'public.get_top_merchants(integer)',
    'public.get_daily_revenue(integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY sigs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;
