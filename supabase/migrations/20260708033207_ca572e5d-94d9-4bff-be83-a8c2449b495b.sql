
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  plan_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  interval_unit TEXT NOT NULL DEFAULT 'month' CHECK (interval_unit IN ('day','week','month','year')),
  interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count > 0),
  next_charge_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_charged_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','failed')),
  total_charged NUMERIC NOT NULL DEFAULT 0,
  charge_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cust_subs_merchant ON public.customer_subscriptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_cust_subs_next ON public.customer_subscriptions(next_charge_at) WHERE status = 'active';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_subscriptions TO authenticated;
GRANT ALL ON public.customer_subscriptions TO service_role;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant owns subs" ON public.customer_subscriptions
  FOR ALL TO authenticated
  USING (is_merchant_owner(merchant_id))
  WITH CHECK (is_merchant_owner(merchant_id));

CREATE TABLE IF NOT EXISTS public.split_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  payment_link_id UUID REFERENCES public.payment_links(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_split_merchant ON public.split_rules(merchant_id);
CREATE INDEX IF NOT EXISTS idx_split_link ON public.split_rules(payment_link_id) WHERE payment_link_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.split_rules TO authenticated;
GRANT ALL ON public.split_rules TO service_role;
ALTER TABLE public.split_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant owns split rules" ON public.split_rules
  FOR ALL TO authenticated
  USING (is_merchant_owner(merchant_id))
  WITH CHECK (is_merchant_owner(merchant_id));

CREATE TABLE IF NOT EXISTS public.split_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  split_rule_id UUID REFERENCES public.split_rules(id) ON DELETE SET NULL,
  amount_total NUMERIC NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_split_exec_merchant ON public.split_executions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_split_exec_tx ON public.split_executions(transaction_id);
GRANT SELECT ON public.split_executions TO authenticated;
GRANT ALL ON public.split_executions TO service_role;
ALTER TABLE public.split_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant reads split executions" ON public.split_executions
  FOR SELECT TO authenticated
  USING (is_merchant_owner(merchant_id));

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'VND',
  due_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  payment_link_id UUID REFERENCES public.payment_links(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON public.invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON public.invoices(due_date) WHERE status IN ('sent','overdue');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant owns invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (is_merchant_owner(merchant_id))
  WITH CHECK (is_merchant_owner(merchant_id));

CREATE OR REPLACE FUNCTION public.compute_next_charge(
  p_from TIMESTAMPTZ, p_unit TEXT, p_count INT
) RETURNS TIMESTAMPTZ LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_unit
    WHEN 'day'   THEN p_from + (p_count || ' day')::interval
    WHEN 'week'  THEN p_from + (p_count || ' week')::interval
    WHEN 'month' THEN p_from + (p_count || ' month')::interval
    WHEN 'year'  THEN p_from + (p_count || ' year')::interval
    ELSE p_from + (p_count || ' month')::interval
  END
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'INV-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('invoice_number_seq')::text, 5, '0')
$$;

CREATE OR REPLACE FUNCTION public.save_invoice(
  p_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT,
  p_items JSONB,
  p_tax_percent NUMERIC,
  p_discount NUMERIC,
  p_due_date DATE,
  p_notes TEXT,
  p_status TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_merchant UUID;
  v_subtotal NUMERIC := 0;
  v_tax NUMERIC := 0;
  v_total NUMERIC := 0;
  v_id UUID;
  it JSONB;
BEGIN
  SELECT id INTO v_merchant FROM merchants WHERE user_id = auth.uid() LIMIT 1;
  IF v_merchant IS NULL THEN RAISE EXCEPTION 'no_merchant'; END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(coalesce(p_items,'[]'::jsonb))
  LOOP
    v_subtotal := v_subtotal + coalesce((it->>'quantity')::numeric,0) * coalesce((it->>'unit_price')::numeric,0);
  END LOOP;
  v_tax := round(v_subtotal * coalesce(p_tax_percent,0) / 100, 2);
  v_total := v_subtotal + v_tax - coalesce(p_discount,0);
  IF v_total < 0 THEN v_total := 0; END IF;

  IF p_id IS NULL THEN
    INSERT INTO invoices(
      merchant_id, invoice_number, customer_name, customer_email, customer_phone, customer_address,
      items, subtotal, tax_percent, tax_amount, discount, total, due_date, notes, status
    ) VALUES (
      v_merchant, generate_invoice_number(), p_customer_name, p_customer_email, p_customer_phone, p_customer_address,
      coalesce(p_items,'[]'::jsonb), v_subtotal, coalesce(p_tax_percent,0), v_tax, coalesce(p_discount,0), v_total,
      p_due_date, p_notes, coalesce(p_status,'draft')
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE invoices SET
      customer_name = p_customer_name,
      customer_email = p_customer_email,
      customer_phone = p_customer_phone,
      customer_address = p_customer_address,
      items = coalesce(p_items,'[]'::jsonb),
      subtotal = v_subtotal,
      tax_percent = coalesce(p_tax_percent,0),
      tax_amount = v_tax,
      discount = coalesce(p_discount,0),
      total = v_total,
      due_date = p_due_date,
      notes = p_notes,
      status = coalesce(p_status, status),
      updated_at = now()
    WHERE id = p_id AND merchant_id = v_merchant
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invoice_create_payment_link(p_invoice_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_merchant UUID;
  v_inv invoices%ROWTYPE;
  v_bank merchant_banks%ROWTYPE;
  v_code TEXT;
  v_link_id UUID;
BEGIN
  SELECT id INTO v_merchant FROM merchants WHERE user_id = auth.uid() LIMIT 1;
  IF v_merchant IS NULL THEN RAISE EXCEPTION 'no_merchant'; END IF;

  SELECT * INTO v_inv FROM invoices WHERE id = p_invoice_id AND merchant_id = v_merchant;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invoice_not_found'; END IF;

  SELECT * INTO v_bank FROM merchant_banks
    WHERE merchant_id = v_merchant
    ORDER BY is_default DESC, priority ASC LIMIT 1;
  IF v_bank.id IS NULL THEN RAISE EXCEPTION 'no_bank_configured'; END IF;

  v_code := 'PG-INV' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  INSERT INTO payment_links(
    merchant_id, code, amount, description, status, bank_id
  ) VALUES (
    v_merchant, v_code, v_inv.total,
    'Hóa đơn ' || v_inv.invoice_number || ' — ' || v_inv.customer_name,
    'pending', v_bank.id
  ) RETURNING id INTO v_link_id;

  UPDATE invoices SET
    payment_link_id = v_link_id,
    status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
    sent_at = coalesce(sent_at, now()),
    updated_at = now()
  WHERE id = p_invoice_id;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.invoice_mark_reminder(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_merchant UUID;
BEGIN
  SELECT id INTO v_merchant FROM merchants WHERE user_id = auth.uid() LIMIT 1;
  IF v_merchant IS NULL THEN RAISE EXCEPTION 'no_merchant'; END IF;
  UPDATE invoices SET
    reminder_count = reminder_count + 1,
    last_reminder_at = now(),
    updated_at = now()
  WHERE id = p_invoice_id AND merchant_id = v_merchant;
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_split(p_rule_id UUID, p_amount NUMERIC)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_merchant UUID;
  v_rule split_rules%ROWTYPE;
  r JSONB;
  out_arr JSONB := '[]'::jsonb;
  pct NUMERIC;
  amt NUMERIC;
BEGIN
  SELECT id INTO v_merchant FROM merchants WHERE user_id = auth.uid() LIMIT 1;
  IF v_merchant IS NULL THEN RAISE EXCEPTION 'no_merchant'; END IF;
  SELECT * INTO v_rule FROM split_rules WHERE id = p_rule_id AND merchant_id = v_merchant;
  IF v_rule.id IS NULL THEN RAISE EXCEPTION 'rule_not_found'; END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(v_rule.recipients,'[]'::jsonb))
  LOOP
    pct := coalesce((r->>'percent')::numeric, 0);
    amt := round(p_amount * pct / 100, 0);
    out_arr := out_arr || jsonb_build_object(
      'label', r->>'label',
      'account_number', r->>'account_number',
      'bank_name', r->>'bank_name',
      'account_name', r->>'account_name',
      'percent', pct,
      'amount', amt
    );
  END LOOP;

  RETURN jsonb_build_object('rule_id', v_rule.id, 'total', p_amount, 'breakdown', out_arr);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_due_subscriptions(p_limit INT DEFAULT 100)
RETURNS SETOF customer_subscriptions LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM customer_subscriptions
  WHERE status = 'active' AND next_charge_at <= now()
  ORDER BY next_charge_at ASC
  LIMIT p_limit
$$;

CREATE OR REPLACE FUNCTION public.subscription_charge(p_sub_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub customer_subscriptions%ROWTYPE;
  v_bank merchant_banks%ROWTYPE;
  v_code TEXT;
BEGIN
  SELECT * INTO v_sub FROM customer_subscriptions WHERE id = p_sub_id;
  IF v_sub.id IS NULL OR v_sub.status <> 'active' THEN RETURN NULL; END IF;

  SELECT * INTO v_bank FROM merchant_banks
    WHERE merchant_id = v_sub.merchant_id
    ORDER BY is_default DESC, priority ASC LIMIT 1;
  IF v_bank.id IS NULL THEN
    UPDATE customer_subscriptions SET status='failed', updated_at=now() WHERE id = p_sub_id;
    RETURN NULL;
  END IF;

  v_code := 'PG-SUB' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  INSERT INTO payment_links(merchant_id, code, amount, description, status, bank_id)
  VALUES (
    v_sub.merchant_id, v_code, v_sub.price,
    v_sub.plan_name || ' — ' || v_sub.customer_name, 'pending', v_bank.id
  );

  UPDATE customer_subscriptions SET
    last_charged_at = now(),
    charge_count = charge_count + 1,
    total_charged = total_charged + v_sub.price,
    next_charge_at = compute_next_charge(v_sub.next_charge_at, v_sub.interval_unit, v_sub.interval_count),
    updated_at = now()
  WHERE id = p_sub_id;

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_next_charge(TIMESTAMPTZ, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_invoice(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invoice_create_payment_link(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invoice_mark_reminder(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_split(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_due_subscriptions(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_charge(UUID) TO service_role;
