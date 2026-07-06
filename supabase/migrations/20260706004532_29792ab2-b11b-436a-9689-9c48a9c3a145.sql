
CREATE OR REPLACE FUNCTION public.get_mismatched_transactions(p_merchant_id uuid, p_limit integer DEFAULT 100)
RETURNS TABLE(
  transaction_id uuid,
  amount numeric,
  transfer_content text,
  bank_reference text,
  expected_code text,
  payment_link_id uuid,
  status text,
  paid_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.amount,
    t.transfer_content,
    t.bank_reference,
    pl.code,
    t.payment_link_id,
    t.status,
    t.paid_at,
    t.created_at
  FROM public.transactions t
  JOIN public.payment_links pl ON pl.id = t.payment_link_id
  WHERE t.merchant_id = p_merchant_id
    AND public.is_merchant_owner(t.merchant_id)
    AND pl.code IS NOT NULL
    AND (
      t.transfer_content IS NULL
      OR position(UPPER(pl.code) in UPPER(COALESCE(t.transfer_content,''))) = 0
    )
  ORDER BY t.created_at DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_mismatched_transactions(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mismatched_transactions(uuid, integer) TO authenticated, service_role;
