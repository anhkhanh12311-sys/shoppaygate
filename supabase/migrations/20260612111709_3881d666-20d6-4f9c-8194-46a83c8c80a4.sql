
-- Enum loại voucher
DO $$ BEGIN
  CREATE TYPE public.voucher_type AS ENUM ('percent','fixed','freeship');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- VOUCHERS
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT,
  type public.voucher_type NOT NULL DEFAULT 'percent',
  value NUMERIC NOT NULL DEFAULT 0,
  min_order NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant manages own vouchers" ON public.vouchers
FOR ALL TO authenticated
USING (merchant_id = public.get_merchant_id_for_auth_user())
WITH CHECK (merchant_id = public.get_merchant_id_for_auth_user());

CREATE TRIGGER trg_vouchers_updated
BEFORE UPDATE ON public.vouchers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vouchers_merchant ON public.vouchers(merchant_id);
CREATE INDEX idx_vouchers_active ON public.vouchers(merchant_id, is_active);

-- VOUCHER REDEMPTIONS
CREATE TABLE public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_phone TEXT,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.voucher_redemptions TO authenticated;
GRANT ALL ON public.voucher_redemptions TO service_role;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant view own redemptions" ON public.voucher_redemptions
FOR SELECT TO authenticated
USING (merchant_id = public.get_merchant_id_for_auth_user());

CREATE INDEX idx_redemptions_voucher ON public.voucher_redemptions(voucher_id);
CREATE INDEX idx_redemptions_merchant ON public.voucher_redemptions(merchant_id);

-- ORDERS: thêm cột discount + voucher
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_code TEXT;

-- RPC: validate voucher (public)
CREATE OR REPLACE FUNCTION public.validate_voucher(
  p_merchant_id UUID, p_code TEXT, p_subtotal NUMERIC, p_shipping_fee NUMERIC DEFAULT 0
) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v public.vouchers%ROWTYPE; v_discount NUMERIC := 0;
BEGIN
  SELECT * INTO v FROM public.vouchers
    WHERE merchant_id = p_merchant_id AND UPPER(code) = UPPER(p_code) AND is_active = true
    LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('valid', false, 'error', 'Mã không tồn tại'); END IF;
  IF v.starts_at IS NOT NULL AND v.starts_at > now() THEN
    RETURN json_build_object('valid', false, 'error', 'Mã chưa đến thời gian sử dụng'); END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'Mã đã hết hạn'); END IF;
  IF v.usage_limit IS NOT NULL AND v.used_count >= v.usage_limit THEN
    RETURN json_build_object('valid', false, 'error', 'Mã đã hết lượt sử dụng'); END IF;
  IF p_subtotal < COALESCE(v.min_order,0) THEN
    RETURN json_build_object('valid', false, 'error',
      'Đơn tối thiểu ' || v.min_order::TEXT); END IF;

  IF v.type = 'percent' THEN
    v_discount := p_subtotal * v.value / 100;
    IF v.max_discount IS NOT NULL THEN v_discount := LEAST(v_discount, v.max_discount); END IF;
  ELSIF v.type = 'fixed' THEN
    v_discount := LEAST(v.value, p_subtotal);
  ELSIF v.type = 'freeship' THEN
    v_discount := COALESCE(p_shipping_fee, 0);
  END IF;

  RETURN json_build_object(
    'valid', true, 'voucher_id', v.id, 'code', v.code, 'type', v.type,
    'discount', ROUND(v_discount), 'name', v.name
  );
END $$;

-- RPC: voucher stats
CREATE OR REPLACE FUNCTION public.get_voucher_stats()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_mid UUID; r JSON;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_mid IS NULL THEN RETURN json_build_object('total',0,'active',0,'redemptions',0,'total_discount',0); END IF;
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM public.vouchers WHERE merchant_id = v_mid),
    'active', (SELECT COUNT(*) FROM public.vouchers WHERE merchant_id = v_mid AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())),
    'redemptions', (SELECT COUNT(*) FROM public.voucher_redemptions WHERE merchant_id = v_mid),
    'total_discount', COALESCE((SELECT SUM(discount_amount) FROM public.voucher_redemptions WHERE merchant_id = v_mid),0)
  ) INTO r;
  RETURN r;
END $$;

-- Cập nhật public_create_order để hỗ trợ voucher
CREATE OR REPLACE FUNCTION public.public_create_order(
  p_merchant_id uuid, p_customer_name text, p_customer_phone text,
  p_customer_email text, p_customer_address text, p_note text,
  p_shipping_fee numeric, p_items jsonb, p_voucher_code text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id UUID; v_subtotal NUMERIC := 0; v_item JSONB;
  v_product public.products%ROWTYPE; v_qty INTEGER; v_unit NUMERIC; v_line NUMERIC;
  v_code TEXT; v_voucher JSON; v_discount NUMERIC := 0; v_voucher_id UUID;
  v_total NUMERIC; v_ship NUMERIC := COALESCE(p_shipping_fee,0);
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Giỏ hàng trống'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::uuid AND merchant_id = p_merchant_id AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sản phẩm không tồn tại'; END IF;
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, 1));
    IF NOT v_product.unlimited_stock AND v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Sản phẩm "%" không đủ tồn kho', v_product.name;
    END IF;
    v_unit := COALESCE(v_product.sale_price, v_product.price);
    v_subtotal := v_subtotal + v_unit * v_qty;
  END LOOP;

  IF p_voucher_code IS NOT NULL AND p_voucher_code <> '' THEN
    v_voucher := public.validate_voucher(p_merchant_id, p_voucher_code, v_subtotal, v_ship);
    IF (v_voucher->>'valid')::boolean THEN
      v_discount := COALESCE((v_voucher->>'discount')::numeric, 0);
      v_voucher_id := (v_voucher->>'voucher_id')::uuid;
    ELSE
      RAISE EXCEPTION '%', v_voucher->>'error';
    END IF;
  END IF;

  v_total := GREATEST(0, v_subtotal + v_ship - v_discount);

  INSERT INTO public.orders (
    merchant_id, customer_name, customer_phone, customer_email,
    customer_address, note, subtotal, shipping_fee, discount,
    voucher_id, voucher_code, total, status
  ) VALUES (
    p_merchant_id, p_customer_name, p_customer_phone, p_customer_email,
    p_customer_address, p_note, v_subtotal, v_ship, v_discount,
    v_voucher_id, p_voucher_code, v_total, 'pending'
  ) RETURNING id, order_code INTO v_order_id, v_code;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, 1));
    v_unit := COALESCE(v_product.sale_price, v_product.price);
    v_line := v_unit * v_qty;
    INSERT INTO public.order_items (order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
    VALUES (v_order_id, v_product.id, v_product.name, v_product.image_url, v_unit, v_qty, v_line);
    IF NOT v_product.unlimited_stock THEN
      UPDATE public.products SET stock = stock - v_qty, sold_count = sold_count + v_qty WHERE id = v_product.id;
    ELSE
      UPDATE public.products SET sold_count = sold_count + v_qty WHERE id = v_product.id;
    END IF;
  END LOOP;

  IF v_voucher_id IS NOT NULL THEN
    UPDATE public.vouchers SET used_count = used_count + 1 WHERE id = v_voucher_id;
    INSERT INTO public.voucher_redemptions (voucher_id, merchant_id, order_id, customer_phone, discount_amount)
    VALUES (v_voucher_id, p_merchant_id, v_order_id, p_customer_phone, v_discount);
  END IF;

  RETURN json_build_object('order_id', v_order_id, 'order_code', v_code, 'total', v_total, 'discount', v_discount);
END $$;
