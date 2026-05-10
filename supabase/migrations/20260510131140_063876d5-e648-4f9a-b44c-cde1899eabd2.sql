
-- Helpers used inside RLS policies (need to be callable by anon + authenticated)
DO $$
DECLARE fn TEXT; sigs TEXT[] := ARRAY[
  'public.has_role(uuid, app_role)',
  'public.is_merchant_owner(uuid)',
  'public.get_merchant_id_for_auth_user()'
]; BEGIN
  FOREACH fn IN ARRAY sigs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', fn);
  END LOOP;
END $$;

-- User-callable SECURITY DEFINER functions: authenticated only
DO $$
DECLARE fn TEXT; sigs TEXT[] := ARRAY[
  'public.get_my_merchant_secrets()',
  'public.update_my_merchant_secrets(text, text, text, boolean, boolean, boolean)',
  'public.subscribe_to_plan(text, text)',
  'public.subscribe_to_plan_paid(text, text)',
  'public.update_topup_config(text, text)',
  'public.count_merchant_payment_links(uuid, text, boolean)',
  'public.count_merchant_transactions(uuid, text)'
]; BEGIN
  FOREACH fn IN ARRAY sigs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

-- Service-only SECURITY DEFINER functions (called from edge functions)
DO $$
DECLARE fn TEXT; sigs TEXT[] := ARRAY[
  'public.credit_merchant_balance(uuid, numeric, text, text, text, text)',
  'public.insert_transaction_from_webhook(uuid, uuid, numeric, text, text, text, timestamptz)'
]; BEGIN
  FOREACH fn IN ARRAY sigs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
