
CREATE OR REPLACE FUNCTION public.get_merchant_signal_health(p_merchant_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'webhook_hits_24h', (
      SELECT COUNT(*) FROM public.webhook_events
       WHERE payload->>'accountNumber' IN
         (SELECT bank_account_number FROM public.merchant_banks WHERE merchant_id = p_merchant_id)
         AND created_at > now() - interval '24 hours'
    ),
    'last_webhook_at', (
      SELECT MAX(created_at) FROM public.webhook_events
       WHERE payload->>'accountNumber' IN
         (SELECT bank_account_number FROM public.merchant_banks WHERE merchant_id = p_merchant_id)
    ),
    'banks_total', (SELECT COUNT(*) FROM public.merchant_banks WHERE merchant_id = p_merchant_id),
    'banks_with_sepay_key', (
      SELECT COUNT(*) FROM public.merchant_banks
       WHERE merchant_id = p_merchant_id AND sepay_api_key IS NOT NULL
    ),
    'legacy_secret_key', COALESCE(
      (SELECT sepay_api_key IS NOT NULL FROM public.merchant_secrets WHERE merchant_id = p_merchant_id),
      false
    ),
    'has_webhook_api_key', COALESCE(
      (SELECT webhook_api_key IS NOT NULL FROM public.merchant_secrets WHERE merchant_id = p_merchant_id),
      false
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_merchant_signal_health(uuid) TO anon, authenticated, service_role;
