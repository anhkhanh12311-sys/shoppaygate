
-- Subscription plans (catalog)
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  monthly_tx_limit INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited
  fee_percent NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage plans" ON public.subscription_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_subscription_plans_updated
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Merchant subscriptions
CREATE TABLE public.merchant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, expired, cancelled
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  tx_used INTEGER NOT NULL DEFAULT 0,
  topup_callback_url TEXT,
  topup_secret TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id)
);

ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own subscription" ON public.merchant_subscriptions
  FOR SELECT USING (is_merchant_owner(merchant_id));
CREATE POLICY "Merchants update own subscription" ON public.merchant_subscriptions
  FOR UPDATE USING (is_merchant_owner(merchant_id));
CREATE POLICY "Merchants insert own subscription" ON public.merchant_subscriptions
  FOR INSERT WITH CHECK (is_merchant_owner(merchant_id));
CREATE POLICY "Admins manage subscriptions" ON public.merchant_subscriptions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_merchant_subscriptions_updated
  BEFORE UPDATE ON public.merchant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Topup callback logs
CREATE TABLE public.topup_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  transaction_id UUID,
  customer_ref TEXT, -- ID của user trong hệ thống của merchant
  amount NUMERIC NOT NULL,
  callback_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT,
  http_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

ALTER TABLE public.topup_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own callbacks" ON public.topup_callbacks
  FOR SELECT USING (is_merchant_owner(merchant_id));
CREATE POLICY "Admins manage callbacks" ON public.topup_callbacks
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_topup_callbacks_merchant ON public.topup_callbacks(merchant_id, created_at DESC);

-- Seed plans
INSERT INTO public.subscription_plans (code, name, description, price_monthly, price_yearly, monthly_tx_limit, fee_percent, features, sort_order) VALUES
('free', 'Dùng thử', 'Trải nghiệm cổng thanh toán cơ bản', 0, 0, 50, 0, '["50 giao dịch/tháng", "QR động cơ bản", "Webhook chuẩn"]'::jsonb, 1),
('starter', 'Khởi nghiệp', 'Phù hợp shop nhỏ, website mới', 199000, 1990000, 1000, 0, '["1.000 giao dịch/tháng", "Auto-bank callback", "Hỗ trợ email", "Lịch sử giao dịch"]'::jsonb, 2),
('pro', 'Chuyên nghiệp', 'Cho website nạp tiền tự động lưu lượng vừa', 499000, 4990000, 10000, 0, '["10.000 giao dịch/tháng", "Auto-bank realtime", "AI Insights", "Webhook retry tự động", "Hỗ trợ ưu tiên"]'::jsonb, 3),
('business', 'Doanh nghiệp', 'Lưu lượng lớn, không giới hạn', 1499000, 14990000, 0, 0, '["Không giới hạn giao dịch", "Multi-bank", "Sub-account nhân viên", "API key riêng", "SLA 99.9%", "Hỗ trợ 24/7"]'::jsonb, 4);

-- RPC: subscribe / change plan
CREATE OR REPLACE FUNCTION public.subscribe_to_plan(p_plan_code TEXT, p_billing_cycle TEXT DEFAULT 'monthly')
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_merchant_id UUID;
  v_plan_id UUID;
  v_sub_id UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT id INTO v_merchant_id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_merchant_id IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;

  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE code = p_plan_code AND is_active = true;
  IF v_plan_id IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

  IF p_billing_cycle = 'yearly' THEN
    v_expires := now() + INTERVAL '1 year';
  ELSE
    v_expires := now() + INTERVAL '1 month';
  END IF;

  INSERT INTO public.merchant_subscriptions (merchant_id, plan_id, status, billing_cycle, started_at, expires_at, tx_used)
  VALUES (v_merchant_id, v_plan_id, CASE WHEN p_plan_code='free' THEN 'trial' ELSE 'active' END, p_billing_cycle, now(), v_expires, 0)
  ON CONFLICT (merchant_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    billing_cycle = EXCLUDED.billing_cycle,
    started_at = EXCLUDED.started_at,
    expires_at = EXCLUDED.expires_at,
    tx_used = 0,
    updated_at = now()
  RETURNING id INTO v_sub_id;

  RETURN v_sub_id;
END; $$;

-- RPC: update topup config
CREATE OR REPLACE FUNCTION public.update_topup_config(p_callback_url TEXT, p_secret TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_merchant_id UUID;
BEGIN
  SELECT id INTO v_merchant_id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_merchant_id IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;

  UPDATE public.merchant_subscriptions
  SET topup_callback_url = p_callback_url,
      topup_secret = p_secret,
      updated_at = now()
  WHERE merchant_id = v_merchant_id;
END; $$;
