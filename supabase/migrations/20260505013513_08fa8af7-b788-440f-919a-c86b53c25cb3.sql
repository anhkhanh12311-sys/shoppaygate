
-- 1. Create merchant_secrets table
CREATE TABLE public.merchant_secrets (
  merchant_id UUID PRIMARY KEY REFERENCES public.merchants(id) ON DELETE CASCADE,
  sepay_api_key TEXT,
  webhook_secret TEXT,
  webhook_api_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_secrets ENABLE ROW LEVEL SECURITY;

-- Only admin can directly read; merchants must use RPC
CREATE POLICY "Admins can manage all secrets"
ON public.merchant_secrets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Migrate existing data
INSERT INTO public.merchant_secrets (merchant_id, sepay_api_key, webhook_secret, webhook_api_key, updated_at)
SELECT id, sepay_api_key, webhook_secret, webhook_api_key, now()
FROM public.merchants
WHERE sepay_api_key IS NOT NULL OR webhook_secret IS NOT NULL OR webhook_api_key IS NOT NULL;

-- 3. RPC: read own secrets
CREATE OR REPLACE FUNCTION public.get_my_merchant_secrets()
RETURNS TABLE(
  sepay_api_key text,
  webhook_secret text,
  webhook_api_key text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_id UUID;
BEGIN
  SELECT id INTO v_merchant_id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'No merchant for current user';
  END IF;
  RETURN QUERY
  SELECT s.sepay_api_key, s.webhook_secret, s.webhook_api_key
  FROM public.merchant_secrets s
  WHERE s.merchant_id = v_merchant_id;
END;
$$;

-- 4. RPC: update own secrets (per-field; null = leave unchanged, use clear flags to nullify)
CREATE OR REPLACE FUNCTION public.update_my_merchant_secrets(
  p_sepay_api_key text DEFAULT NULL,
  p_webhook_secret text DEFAULT NULL,
  p_webhook_api_key text DEFAULT NULL,
  p_clear_sepay boolean DEFAULT false,
  p_clear_webhook_secret boolean DEFAULT false,
  p_clear_webhook_api_key boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_id UUID;
BEGIN
  SELECT id INTO v_merchant_id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'No merchant for current user';
  END IF;

  INSERT INTO public.merchant_secrets (merchant_id) VALUES (v_merchant_id)
  ON CONFLICT (merchant_id) DO NOTHING;

  UPDATE public.merchant_secrets SET
    sepay_api_key = CASE
      WHEN p_clear_sepay THEN NULL
      WHEN p_sepay_api_key IS NOT NULL THEN p_sepay_api_key
      ELSE sepay_api_key END,
    webhook_secret = CASE
      WHEN p_clear_webhook_secret THEN NULL
      WHEN p_webhook_secret IS NOT NULL THEN p_webhook_secret
      ELSE webhook_secret END,
    webhook_api_key = CASE
      WHEN p_clear_webhook_api_key THEN NULL
      WHEN p_webhook_api_key IS NOT NULL THEN p_webhook_api_key
      ELSE webhook_api_key END,
    updated_at = now()
  WHERE merchant_id = v_merchant_id;
END;
$$;

-- 5. Drop sensitive columns from merchants now that data is migrated
ALTER TABLE public.merchants
  DROP COLUMN sepay_api_key,
  DROP COLUMN webhook_secret,
  DROP COLUMN webhook_api_key;

-- 6. Add DELETE policy for merchants (GDPR right to erasure)
CREATE POLICY "Users can delete their own merchant profile"
ON public.merchants FOR DELETE
USING (auth.uid() = auth_user_id);

-- 7. Harden insert_transaction_from_webhook with defense-in-depth validation
CREATE OR REPLACE FUNCTION public.insert_transaction_from_webhook(
  p_payment_link_id uuid,
  p_merchant_id uuid,
  p_amount numeric,
  p_transfer_content text,
  p_bank_reference text,
  p_status text,
  p_paid_at timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_link_ok BOOLEAN;
BEGIN
  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF p_amount > 10000000000 THEN
    RAISE EXCEPTION 'Amount exceeds maximum';
  END IF;

  -- Validate status
  IF p_status NOT IN ('pending', 'completed', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  -- Validate payment link ownership
  SELECT EXISTS (
    SELECT 1 FROM public.payment_links
    WHERE id = p_payment_link_id AND merchant_id = p_merchant_id
  ) INTO v_link_ok;
  IF NOT v_link_ok THEN
    RAISE EXCEPTION 'Payment link / merchant mismatch';
  END IF;

  INSERT INTO public.transactions (
    payment_link_id, merchant_id, amount, transfer_content,
    bank_reference, status, paid_at
  ) VALUES (
    p_payment_link_id, p_merchant_id, p_amount,
    LEFT(COALESCE(p_transfer_content, ''), 1000),
    LEFT(COALESCE(p_bank_reference, ''), 200),
    p_status, p_paid_at
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;
