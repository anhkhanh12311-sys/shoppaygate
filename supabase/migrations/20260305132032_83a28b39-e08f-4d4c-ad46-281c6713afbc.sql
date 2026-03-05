
-- Performance indexes for large datasets
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id_created ON public.transactions (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_paid_at ON public.transactions (paid_at DESC) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_links_merchant_id_status ON public.payment_links (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_links_code ON public.payment_links (code);
CREATE INDEX IF NOT EXISTS idx_payment_links_created ON public.payment_links (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchants_auth_user_id ON public.merchants (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_banks_merchant_id ON public.merchant_banks (merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_stores_slug ON public.merchant_stores (slug);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- Function: count transactions for a merchant with optional status filter
CREATE OR REPLACE FUNCTION public.count_merchant_transactions(p_merchant_id uuid, p_status text DEFAULT NULL)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.transactions
  WHERE merchant_id = p_merchant_id
  AND (p_status IS NULL OR status = p_status);
$$;

-- Function: count payment links for a merchant with optional status/type filter
CREATE OR REPLACE FUNCTION public.count_merchant_payment_links(p_merchant_id uuid, p_status text DEFAULT NULL, p_is_static boolean DEFAULT NULL)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.payment_links
  WHERE merchant_id = p_merchant_id
  AND (p_status IS NULL OR status = p_status)
  AND (p_is_static IS NULL OR is_static = p_is_static);
$$;

-- Admin: get system-wide stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_merchants', (SELECT COUNT(*) FROM public.merchants),
    'total_transactions', (SELECT COUNT(*) FROM public.transactions),
    'completed_transactions', (SELECT COUNT(*) FROM public.transactions WHERE status = 'completed'),
    'pending_transactions', (SELECT COUNT(*) FROM public.transactions WHERE status = 'pending'),
    'total_revenue', COALESCE((SELECT SUM(amount) FROM public.transactions WHERE status = 'completed'), 0),
    'today_revenue', COALESCE((SELECT SUM(amount) FROM public.transactions WHERE status = 'completed' AND paid_at::date = CURRENT_DATE), 0),
    'week_revenue', COALESCE((SELECT SUM(amount) FROM public.transactions WHERE status = 'completed' AND paid_at >= NOW() - INTERVAL '7 days'), 0),
    'month_revenue', COALESCE((SELECT SUM(amount) FROM public.transactions WHERE status = 'completed' AND paid_at >= NOW() - INTERVAL '30 days'), 0),
    'total_payment_links', (SELECT COUNT(*) FROM public.payment_links),
    'active_payment_links', (SELECT COUNT(*) FROM public.payment_links WHERE status = 'active'),
    'total_stores', (SELECT COUNT(*) FROM public.merchant_stores WHERE is_active = true),
    'new_merchants_today', (SELECT COUNT(*) FROM public.merchants WHERE created_at::date = CURRENT_DATE),
    'new_merchants_week', (SELECT COUNT(*) FROM public.merchants WHERE created_at >= NOW() - INTERVAL '7 days')
  ) INTO result;
  RETURN result;
END;
$$;

-- Admin: get daily revenue for chart (last 30 days)
CREATE OR REPLACE FUNCTION public.get_daily_revenue(p_days integer DEFAULT 30)
RETURNS TABLE(day date, revenue numeric, tx_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    d::date AS day,
    COALESCE(SUM(t.amount), 0) AS revenue,
    COUNT(t.id) AS tx_count
  FROM generate_series(CURRENT_DATE - (p_days - 1), CURRENT_DATE, '1 day') d
  LEFT JOIN public.transactions t ON t.paid_at::date = d::date AND t.status = 'completed'
  GROUP BY d::date
  ORDER BY d::date;
$$;

-- Admin: get top merchants by revenue
CREATE OR REPLACE FUNCTION public.get_top_merchants(p_limit integer DEFAULT 10)
RETURNS TABLE(merchant_id uuid, business_name text, email text, total_revenue numeric, tx_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    m.id AS merchant_id,
    m.business_name,
    m.email,
    COALESCE(SUM(t.amount), 0) AS total_revenue,
    COUNT(t.id) AS tx_count
  FROM public.merchants m
  LEFT JOIN public.transactions t ON t.merchant_id = m.id AND t.status = 'completed'
  GROUP BY m.id, m.business_name, m.email
  ORDER BY total_revenue DESC
  LIMIT p_limit;
$$;
