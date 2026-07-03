-- Enable cron infrastructure
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Admin overview of SePay signal across all merchants
CREATE OR REPLACE FUNCTION public.get_admin_sepay_overview()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin';
  END IF;
  SELECT json_build_object(
    'total_merchants', (SELECT COUNT(*) FROM public.merchants),
    'merchants_with_bank_key', (
      SELECT COUNT(DISTINCT merchant_id) FROM public.merchant_banks WHERE sepay_api_key IS NOT NULL
    ),
    'merchants_with_secret_key', (
      SELECT COUNT(*) FROM public.merchant_secrets WHERE sepay_api_key IS NOT NULL
    ),
    'merchants_no_signal', (
      SELECT COUNT(*) FROM public.merchants m
      WHERE NOT EXISTS (SELECT 1 FROM public.merchant_banks WHERE merchant_id = m.id AND sepay_api_key IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM public.merchant_secrets WHERE merchant_id = m.id AND sepay_api_key IS NOT NULL)
    ),
    'webhook_hits_24h', (SELECT COUNT(*) FROM public.webhook_events WHERE created_at > now() - interval '24 hours'),
    'webhook_hits_1h', (SELECT COUNT(*) FROM public.webhook_events WHERE created_at > now() - interval '1 hour'),
    'pending_links', (SELECT COUNT(*) FROM public.payment_links WHERE status = 'active'),
    'pending_links_1h', (
      SELECT COUNT(*) FROM public.payment_links WHERE status = 'active' AND created_at > now() - interval '1 hour'
    ),
    'last_webhook_at', (SELECT MAX(created_at) FROM public.webhook_events),
    'per_merchant', (
      SELECT COALESCE(json_agg(x ORDER BY x->>'business_name'), '[]'::json) FROM (
        SELECT json_build_object(
          'merchant_id', m.id,
          'business_name', m.business_name,
          'email', m.email,
          'banks_total', (SELECT COUNT(*) FROM public.merchant_banks WHERE merchant_id = m.id),
          'banks_with_key', (SELECT COUNT(*) FROM public.merchant_banks WHERE merchant_id = m.id AND sepay_api_key IS NOT NULL),
          'has_secret', COALESCE((SELECT sepay_api_key IS NOT NULL FROM public.merchant_secrets WHERE merchant_id = m.id), false),
          'webhook_24h', (
            SELECT COUNT(*) FROM public.webhook_events
             WHERE payload->>'accountNumber' IN
               (SELECT bank_account_number FROM public.merchant_banks WHERE merchant_id = m.id)
             AND created_at > now() - interval '24 hours'
          ),
          'pending_links', (SELECT COUNT(*) FROM public.payment_links WHERE merchant_id = m.id AND status = 'active')
        ) AS x
        FROM public.merchants m
      ) sub
    )
  ) INTO r;
  RETURN r;
END $$;

GRANT EXECUTE ON FUNCTION public.get_admin_sepay_overview() TO authenticated;

-- Cron job status for admin
CREATE OR REPLACE FUNCTION public.get_admin_cron_health()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin';
  END IF;
  SELECT json_build_object(
    'jobs', COALESCE((
      SELECT json_agg(json_build_object(
        'jobid', jobid, 'jobname', jobname, 'schedule', schedule, 'active', active
      )) FROM cron.job
    ), '[]'::json),
    'recent_runs', COALESCE((
      SELECT json_agg(x) FROM (
        SELECT jobid, status, return_message,
               start_time, end_time
        FROM cron.job_run_details
        ORDER BY start_time DESC LIMIT 20
      ) x
    ), '[]'::json)
  ) INTO r;
  RETURN r;
END $$;

GRANT EXECUTE ON FUNCTION public.get_admin_cron_health() TO authenticated;