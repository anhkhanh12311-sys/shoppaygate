-- 1. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_logs (actor_id, actor_email, action, target_type, target_id, description, metadata)
  VALUES (auth.uid(), v_email, p_action, p_target_type, p_target_id, p_description, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.log_admin_action(text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text,text,text,text,jsonb) TO authenticated, service_role;

-- 2. AUTO SPLIT ON PAID TRANSACTION
CREATE OR REPLACE FUNCTION public.apply_split_on_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule public.split_rules;
  v_recipient jsonb;
  v_share numeric;
  v_breakdown jsonb := '[]'::jsonb;
BEGIN
  IF NEW.status NOT IN ('paid','completed','success') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.split_executions WHERE transaction_id = NEW.id) THEN RETURN NEW; END IF;

  SELECT * INTO v_rule FROM public.split_rules
  WHERE merchant_id = NEW.merchant_id AND active = true
    AND (payment_link_id = NEW.payment_link_id OR is_default = true)
  ORDER BY (payment_link_id = NEW.payment_link_id) DESC NULLS LAST
  LIMIT 1;

  IF v_rule.id IS NULL THEN RETURN NEW; END IF;

  FOR v_recipient IN SELECT * FROM jsonb_array_elements(v_rule.recipients) LOOP
    v_share := ROUND(NEW.amount * COALESCE((v_recipient->>'percent')::numeric, 0) / 100.0, 0);
    v_breakdown := v_breakdown || jsonb_build_object(
      'bank_id', v_recipient->>'bank_id',
      'label', v_recipient->>'label',
      'percent', (v_recipient->>'percent'),
      'amount', v_share
    );
  END LOOP;

  INSERT INTO public.split_executions (merchant_id, transaction_id, split_rule_id, amount_total, breakdown, status)
  VALUES (NEW.merchant_id, NEW.id, v_rule.id, NEW.amount, v_breakdown, 'applied');

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_apply_split_on_transaction ON public.transactions;
CREATE TRIGGER trg_apply_split_on_transaction
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_split_on_transaction();

-- 3. INVOICE OVERDUE SWEEP
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  WITH upd AS (
    UPDATE public.invoices
    SET status = 'overdue',
        reminder_count = reminder_count + 1,
        last_reminder_at = now(),
        updated_at = now()
    WHERE status IN ('sent','pending','draft')
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION public.mark_overdue_invoices() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_overdue_invoices() TO service_role;

-- 4. ADMIN READ RPCs
CREATE OR REPLACE FUNCTION public.admin_sales_overview()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN json_build_object(
    'orders_total', (SELECT count(*) FROM public.orders),
    'orders_paid', (SELECT count(*) FROM public.orders WHERE status IN ('paid','shipping','completed')),
    'orders_revenue', (SELECT COALESCE(sum(total),0) FROM public.orders WHERE status IN ('paid','shipping','completed')),
    'products_total', (SELECT count(*) FROM public.products),
    'products_active', (SELECT count(*) FROM public.products WHERE is_active),
    'vouchers_total', (SELECT count(*) FROM public.vouchers),
    'vouchers_active', (SELECT count(*) FROM public.vouchers WHERE is_active),
    'invoices_total', (SELECT count(*) FROM public.invoices),
    'invoices_unpaid', (SELECT count(*) FROM public.invoices WHERE status <> 'paid'),
    'subs_active', (SELECT count(*) FROM public.customer_subscriptions WHERE status = 'active'),
    'split_total', (SELECT COALESCE(sum(amount_total),0) FROM public.split_executions)
  );
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_orders(p_status text DEFAULT NULL, p_search text DEFAULT NULL, p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, order_code text, merchant_id uuid, business_name text, customer_name text, customer_phone text, total numeric, status text, channel text, created_at timestamptz, paid_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT o.id, o.order_code, o.merchant_id, m.business_name, o.customer_name, o.customer_phone,
         o.total, o.status::text, o.channel, o.created_at, o.paid_at
  FROM public.orders o
  LEFT JOIN public.merchants m ON m.id = o.merchant_id
  WHERE (p_status IS NULL OR o.status::text = p_status)
    AND (p_search IS NULL OR p_search = '' OR o.order_code ILIKE '%'||p_search||'%'
         OR o.customer_name ILIKE '%'||p_search||'%' OR o.customer_phone ILIKE '%'||p_search||'%'
         OR m.business_name ILIKE '%'||p_search||'%')
  ORDER BY o.created_at DESC
  LIMIT COALESCE(p_limit, 100);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_order_status(p_order_id uuid, p_status order_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.orders SET status = p_status, updated_at = now(),
    paid_at = CASE WHEN p_status = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END
  WHERE id = p_order_id;
  PERFORM public.log_admin_action('order.status', 'order', p_order_id::text, 'Đổi trạng thái đơn hàng', jsonb_build_object('status', p_status));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_products(p_search text DEFAULT NULL, p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, merchant_id uuid, business_name text, name text, price numeric, sale_price numeric, stock integer, unlimited_stock boolean, sold_count integer, is_active boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.merchant_id, m.business_name, p.name, p.price, p.sale_price, p.stock,
         p.unlimited_stock, p.sold_count, p.is_active, p.created_at
  FROM public.products p LEFT JOIN public.merchants m ON m.id = p.merchant_id
  WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%'||p_search||'%' OR m.business_name ILIKE '%'||p_search||'%')
  ORDER BY p.created_at DESC LIMIT COALESCE(p_limit, 100);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_vouchers(p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, merchant_id uuid, business_name text, code text, name text, type voucher_type, value numeric, used_count integer, usage_limit integer, is_active boolean, expires_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT v.id, v.merchant_id, m.business_name, v.code, v.name, v.type, v.value,
         v.used_count, v.usage_limit, v.is_active, v.expires_at, v.created_at
  FROM public.vouchers v LEFT JOIN public.merchants m ON m.id = v.merchant_id
  ORDER BY v.created_at DESC LIMIT COALESCE(p_limit, 100);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_voucher(p_voucher_id uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.vouchers SET is_active = p_active, updated_at = now() WHERE id = p_voucher_id;
  PERFORM public.log_admin_action('voucher.toggle', 'voucher', p_voucher_id::text, 'Bật/tắt voucher', jsonb_build_object('active', p_active));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_invoices(p_status text DEFAULT NULL, p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, merchant_id uuid, business_name text, invoice_number text, customer_name text, total numeric, status text, due_date date, reminder_count integer, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT i.id, i.merchant_id, m.business_name, i.invoice_number, i.customer_name, i.total,
         i.status, i.due_date, i.reminder_count, i.created_at
  FROM public.invoices i LEFT JOIN public.merchants m ON m.id = i.merchant_id
  WHERE (p_status IS NULL OR i.status = p_status)
  ORDER BY i.created_at DESC LIMIT COALESCE(p_limit, 100);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_subscriptions(p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, merchant_id uuid, business_name text, customer_name text, plan_name text, price numeric, interval_unit text, interval_count integer, next_charge_at timestamptz, last_charged_at timestamptz, status text, total_charged numeric, charge_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT s.id, s.merchant_id, m.business_name, s.customer_name, s.plan_name, s.price,
         s.interval_unit, s.interval_count, s.next_charge_at, s.last_charged_at, s.status,
         s.total_charged, s.charge_count
  FROM public.customer_subscriptions s LEFT JOIN public.merchants m ON m.id = s.merchant_id
  ORDER BY s.next_charge_at ASC LIMIT COALESCE(p_limit, 100);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_charge_subscription(p_sub_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_code := public.subscription_charge(p_sub_id);
  PERFORM public.log_admin_action('subscription.charge', 'subscription', p_sub_id::text, 'Thu tiền đăng ký định kỳ thủ công', jsonb_build_object('code', v_code));
  RETURN v_code;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_split_executions(p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, merchant_id uuid, business_name text, transaction_id uuid, amount_total numeric, breakdown jsonb, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT e.id, e.merchant_id, m.business_name, e.transaction_id, e.amount_total, e.breakdown, e.status, e.created_at
  FROM public.split_executions e LEFT JOIN public.merchants m ON m.id = e.merchant_id
  ORDER BY e.created_at DESC LIMIT COALESCE(p_limit, 100);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_cron_jobs()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, cron AS $$
DECLARE v json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT json_agg(x) INTO v FROM (
    SELECT j.jobid, j.jobname, j.schedule, j.active,
           (SELECT r.status FROM cron.job_run_details r WHERE r.jobid = j.jobid ORDER BY r.start_time DESC LIMIT 1) AS last_status,
           (SELECT r.start_time FROM cron.job_run_details r WHERE r.jobid = j.jobid ORDER BY r.start_time DESC LIMIT 1) AS last_run,
           (SELECT r.return_message FROM cron.job_run_details r WHERE r.jobid = j.jobid ORDER BY r.start_time DESC LIMIT 1) AS last_message
    FROM cron.job j ORDER BY j.jobid
  ) x;
  RETURN COALESCE(v, '[]'::json);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_audit_logs(p_limit integer DEFAULT 100)
RETURNS SETOF public.audit_logs LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT COALESCE(p_limit, 100);
END; $$;

REVOKE ALL ON FUNCTION public.admin_sales_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_orders(text,text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_order_status(uuid,order_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_products(text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_vouchers(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_toggle_voucher(uuid,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_invoices(text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_subscriptions(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_charge_subscription(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_split_executions(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_cron_jobs() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_audit_logs(integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_sales_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_orders(text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(uuid,order_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_products(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_vouchers(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_voucher(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_invoices(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_subscriptions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_charge_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_split_executions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs(integer) TO authenticated;