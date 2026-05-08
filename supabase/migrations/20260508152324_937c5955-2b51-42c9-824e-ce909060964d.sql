
-- 1. Add balance + topup_code to merchants
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS topup_code TEXT UNIQUE;

-- Backfill topup_code for existing merchants
UPDATE public.merchants
SET topup_code = 'NAP' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8))
WHERE topup_code IS NULL;

-- Generate topup_code on new merchants
CREATE OR REPLACE FUNCTION public.set_topup_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.topup_code IS NULL THEN
    NEW.topup_code := 'NAP' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_topup_code ON public.merchants;
CREATE TRIGGER trg_set_topup_code
  BEFORE INSERT ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.set_topup_code();

-- 2. payment_links flag for topup links
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS is_topup BOOLEAN NOT NULL DEFAULT false;

-- 3. Plan purchase history
CREATE TABLE IF NOT EXISTS public.plan_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  plan_code TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  paid_from TEXT NOT NULL DEFAULT 'balance', -- balance, free, admin
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own purchases" ON public.plan_purchases
  FOR SELECT USING (is_merchant_owner(merchant_id));
CREATE POLICY "Admins manage purchases" ON public.plan_purchases
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Balance topup history
CREATE TABLE IF NOT EXISTS public.balance_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  bank_reference TEXT,
  transfer_content TEXT,
  source TEXT NOT NULL DEFAULT 'sepay', -- sepay, admin, manual
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own topups" ON public.balance_topups
  FOR SELECT USING (is_merchant_owner(merchant_id));
CREATE POLICY "Admins manage topups" ON public.balance_topups
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_balance_topups_merchant ON public.balance_topups(merchant_id, created_at DESC);

-- 5. Grant admin to anhbanlike@gmail.com (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'anhbanlike@gmail.com'
ON CONFLICT DO NOTHING;

-- 6. RPC: admin grant / revoke role
CREATE OR REPLACE FUNCTION public.admin_grant_role(p_user_id UUID, p_role app_role)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin can grant roles';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role)
  ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(p_user_id UUID, p_role app_role)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin can revoke roles';
  END IF;
  -- Prevent removing the very last admin
  IF p_role = 'admin'::app_role AND
     (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin'::app_role) <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last admin';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
END; $$;

-- 7. RPC: credit balance (called by webhook via service role) -- idempotent helper
CREATE OR REPLACE FUNCTION public.credit_merchant_balance(
  p_merchant_id UUID, p_amount NUMERIC, p_bank_reference TEXT,
  p_transfer_content TEXT, p_source TEXT DEFAULT 'sepay', p_note TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  -- Prevent duplicate by bank_reference
  IF p_bank_reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.balance_topups WHERE bank_reference = p_bank_reference
  ) THEN
    RETURN NULL;
  END IF;

  UPDATE public.merchants SET balance = balance + p_amount WHERE id = p_merchant_id;

  INSERT INTO public.balance_topups (merchant_id, amount, bank_reference, transfer_content, source, note)
  VALUES (p_merchant_id, p_amount, p_bank_reference, p_transfer_content, p_source, p_note)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- 8. RPC: subscribe to plan paid from balance
CREATE OR REPLACE FUNCTION public.subscribe_to_plan_paid(
  p_plan_code TEXT, p_billing_cycle TEXT DEFAULT 'monthly'
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_merchant_id UUID;
  v_balance NUMERIC;
  v_plan public.subscription_plans%ROWTYPE;
  v_price NUMERIC;
  v_expires TIMESTAMPTZ;
  v_sub_id UUID;
BEGIN
  SELECT id, balance INTO v_merchant_id, v_balance
    FROM public.merchants WHERE auth_user_id = auth.uid();
  IF v_merchant_id IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;

  SELECT * INTO v_plan FROM public.subscription_plans
    WHERE code = p_plan_code AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;

  v_price := CASE WHEN p_billing_cycle = 'yearly' THEN v_plan.price_yearly ELSE v_plan.price_monthly END;
  v_expires := CASE WHEN p_billing_cycle = 'yearly' THEN now() + INTERVAL '1 year' ELSE now() + INTERVAL '1 month' END;

  IF v_price > 0 AND v_balance < v_price THEN
    RAISE EXCEPTION 'Số dư không đủ. Cần %, hiện có %', v_price, v_balance;
  END IF;

  IF v_price > 0 THEN
    UPDATE public.merchants SET balance = balance - v_price WHERE id = v_merchant_id;
  END IF;

  INSERT INTO public.merchant_subscriptions (merchant_id, plan_id, status, billing_cycle, started_at, expires_at, tx_used)
  VALUES (v_merchant_id, v_plan.id, CASE WHEN p_plan_code='free' THEN 'trial' ELSE 'active' END,
          p_billing_cycle, now(), v_expires, 0)
  ON CONFLICT (merchant_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    billing_cycle = EXCLUDED.billing_cycle,
    started_at = EXCLUDED.started_at,
    expires_at = EXCLUDED.expires_at,
    tx_used = 0,
    updated_at = now()
  RETURNING id INTO v_sub_id;

  INSERT INTO public.plan_purchases (merchant_id, plan_id, plan_code, billing_cycle, amount_paid, paid_from, expires_at)
  VALUES (v_merchant_id, v_plan.id, v_plan.code, p_billing_cycle, v_price,
          CASE WHEN v_price = 0 THEN 'free' ELSE 'balance' END, v_expires);

  RETURN json_build_object('subscription_id', v_sub_id, 'balance_left',
    (SELECT balance FROM public.merchants WHERE id = v_merchant_id));
END; $$;

-- 9. RPC: admin adjust balance manually
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_merchant_id UUID, p_amount NUMERIC, p_note TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin';
  END IF;
  UPDATE public.merchants SET balance = GREATEST(0, balance + p_amount)
    WHERE id = p_merchant_id RETURNING balance INTO v_new;

  INSERT INTO public.balance_topups (merchant_id, amount, source, note)
  VALUES (p_merchant_id, p_amount, 'admin', COALESCE(p_note, 'Admin adjust'));
  RETURN v_new;
END; $$;
