
CREATE TYPE public.customer_tag AS ENUM ('new', 'regular', 'vip', 'blocked');

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  tag public.customer_tag NOT NULL DEFAULT 'new',
  notes TEXT,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  tx_count INTEGER NOT NULL DEFAULT 0,
  last_paid_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_merchant ON public.customers(merchant_id);
CREATE INDEX idx_customers_phone ON public.customers(merchant_id, phone);
CREATE INDEX idx_customers_email ON public.customers(merchant_id, email);
CREATE UNIQUE INDEX uniq_customer_phone ON public.customers(merchant_id, phone) WHERE phone IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant manages own customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.is_merchant_owner(merchant_id))
  WITH CHECK (public.is_merchant_owner(merchant_id));

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Upsert customer from a transaction-like event
CREATE OR REPLACE FUNCTION public.upsert_customer_manual(
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_tag public.customer_tag DEFAULT 'new',
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_merchant_id UUID;
  v_id UUID;
BEGIN
  SELECT id INTO v_merchant_id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_merchant_id IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;

  IF p_phone IS NOT NULL AND p_phone <> '' THEN
    SELECT id INTO v_id FROM public.customers
      WHERE merchant_id = v_merchant_id AND phone = p_phone LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.customers (merchant_id, full_name, phone, email, tag, notes)
    VALUES (v_merchant_id, p_full_name, NULLIF(p_phone,''), NULLIF(p_email,''), COALESCE(p_tag,'new'), p_notes)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.customers SET
      full_name = COALESCE(NULLIF(p_full_name,''), full_name),
      email = COALESCE(NULLIF(p_email,''), email),
      tag = COALESCE(p_tag, tag),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_customer_stats()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_merchant_id UUID;
  result JSON;
BEGIN
  SELECT id INTO v_merchant_id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_merchant_id IS NULL THEN RETURN json_build_object('total',0,'vip',0,'new_month',0,'total_spent',0); END IF;

  SELECT json_build_object(
    'total', COUNT(*),
    'vip', COUNT(*) FILTER (WHERE tag = 'vip'),
    'new_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())),
    'total_spent', COALESCE(SUM(total_spent),0)
  ) INTO result
  FROM public.customers WHERE merchant_id = v_merchant_id;
  RETURN result;
END $$;

-- Sync from existing completed transactions: parse phone from transfer_content (10-11 digits)
CREATE OR REPLACE FUNCTION public.sync_customers_from_transactions()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_merchant_id UUID;
  v_count INTEGER := 0;
  r RECORD;
  v_phone TEXT;
  v_cust_id UUID;
BEGIN
  SELECT id INTO v_merchant_id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_merchant_id IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;

  FOR r IN
    SELECT id, amount, transfer_content, paid_at
    FROM public.transactions
    WHERE merchant_id = v_merchant_id AND status = 'completed'
    ORDER BY paid_at ASC
  LOOP
    v_phone := substring(COALESCE(r.transfer_content,'') from '(0[0-9]{9,10})');
    IF v_phone IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_cust_id FROM public.customers
      WHERE merchant_id = v_merchant_id AND phone = v_phone LIMIT 1;

    IF v_cust_id IS NULL THEN
      INSERT INTO public.customers (merchant_id, phone, source, total_spent, tx_count, last_paid_at)
      VALUES (v_merchant_id, v_phone, 'auto', r.amount, 1, r.paid_at)
      RETURNING id INTO v_cust_id;
      v_count := v_count + 1;
    ELSE
      UPDATE public.customers SET
        total_spent = total_spent + r.amount,
        tx_count = tx_count + 1,
        last_paid_at = GREATEST(COALESCE(last_paid_at, r.paid_at), r.paid_at),
        tag = CASE
          WHEN total_spent + r.amount >= 5000000 THEN 'vip'::customer_tag
          WHEN tx_count + 1 >= 3 THEN 'regular'::customer_tag
          ELSE tag END,
        updated_at = now()
      WHERE id = v_cust_id;
    END IF;
  END LOOP;
  RETURN v_count;
END $$;
