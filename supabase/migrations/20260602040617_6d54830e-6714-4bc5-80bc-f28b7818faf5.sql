
-- ============================================================================
-- SECURITY FIXES
-- ============================================================================

-- 1) MERCHANT BANKS: remove blanket public SELECT; expose via RPC instead
DROP POLICY IF EXISTS "Public can view merchant banks for payments" ON public.merchant_banks;

-- 2) PAYMENT LINKS: remove blanket public-by-status SELECT; expose via RPC by exact code
DROP POLICY IF EXISTS "Public can view active payment links by code" ON public.payment_links;

-- 3) Public RPC: fetch a single payment link by code, plus minimal merchant + bank info.
--    Returns nothing if code not found. Safe to call anonymously.
CREATE OR REPLACE FUNCTION public.get_public_payment_link(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  amount numeric,
  description text,
  status text,
  is_static boolean,
  is_topup boolean,
  merchant_id uuid,
  merchant_business_name text,
  bank_name text,
  bank_account_number text,
  bank_account_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pl AS (
    SELECT * FROM public.payment_links
    WHERE code = p_code AND status IN ('active', 'completed')
    LIMIT 1
  ),
  bank AS (
    SELECT b.bank_name, b.bank_account_number, b.bank_account_name
    FROM public.merchant_banks b, pl
    WHERE b.merchant_id = pl.merchant_id
    ORDER BY b.is_default DESC, b.created_at ASC
    LIMIT 1
  )
  SELECT
    pl.id, pl.code, pl.amount, pl.description, pl.status,
    pl.is_static, pl.is_topup, pl.merchant_id,
    m.business_name AS merchant_business_name,
    bank.bank_name, bank.bank_account_number, bank.bank_account_name
  FROM pl
  JOIN public.merchants m ON m.id = pl.merchant_id
  LEFT JOIN bank ON TRUE;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_payment_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_link(text) TO anon, authenticated;

-- 4) Public RPC: check status of a payment link by code (for polling on public payment page)
CREATE OR REPLACE FUNCTION public.get_public_payment_status(p_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.payment_links WHERE code = p_code LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_payment_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_status(text) TO anon, authenticated;

-- 5) MERCHANTS: prevent privilege escalation via direct UPDATE.
--    Block non-admins from changing balance, topup_code, auth_user_id, email, webhook_url/enabled.
CREATE OR REPLACE FUNCTION public.prevent_merchant_privileged_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and service_role bypass
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Service role / no JWT context (edge functions using SR key) – allow
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    RAISE EXCEPTION 'Not allowed to modify balance';
  END IF;
  IF NEW.topup_code IS DISTINCT FROM OLD.topup_code THEN
    RAISE EXCEPTION 'Not allowed to modify topup_code';
  END IF;
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Not allowed to change account owner';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Not allowed to change account email';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Not allowed to change merchant id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchants_prevent_privileged_update ON public.merchants;
CREATE TRIGGER merchants_prevent_privileged_update
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.prevent_merchant_privileged_update();
