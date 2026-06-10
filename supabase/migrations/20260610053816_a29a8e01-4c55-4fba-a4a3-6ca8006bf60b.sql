
-- ============== PRODUCTS ==============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  category TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC,
  image_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  stock INTEGER NOT NULL DEFAULT 0,
  unlimited_stock BOOLEAN NOT NULL DEFAULT false,
  sku TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_merchant ON public.products(merchant_id);
CREATE INDEX idx_products_active ON public.products(merchant_id, is_active);
CREATE INDEX idx_products_category ON public.products(merchant_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Merchant manages own products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_merchant_owner(merchant_id))
  WITH CHECK (public.is_merchant_owner(merchant_id));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== ORDERS ==============
CREATE TYPE public.order_status AS ENUM ('pending','paid','shipping','completed','cancelled','refunded');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT UNIQUE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  note TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping_fee NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'qr',
  payment_link_id UUID REFERENCES public.payment_links(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'storefront',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_merchant ON public.orders(merchant_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(merchant_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant manages own orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_merchant_owner(merchant_id))
  WITH CHECK (public.is_merchant_owner(merchant_id));

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_order_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_code IS NULL THEN
    NEW.order_code := 'OD' || UPPER(SUBSTRING(REPLACE(NEW.id::text,'-','') FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_set_order_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_code();

-- ============== ORDER ITEMS ==============
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant views own order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND public.is_merchant_owner(o.merchant_id)
  ));

CREATE POLICY "Merchant manages own order items" ON public.order_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND public.is_merchant_owner(o.merchant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND public.is_merchant_owner(o.merchant_id)
  ));

-- ============== RPCs ==============

-- Public: list active products by store slug
CREATE OR REPLACE FUNCTION public.get_public_store_products(p_slug TEXT)
RETURNS TABLE (
  id UUID, name TEXT, description TEXT, category TEXT,
  price NUMERIC, sale_price NUMERIC, image_url TEXT,
  stock INTEGER, unlimited_stock BOOLEAN, is_featured BOOLEAN,
  sold_count INTEGER, merchant_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.description, p.category,
         p.price, p.sale_price, p.image_url,
         p.stock, p.unlimited_stock, p.is_featured,
         p.sold_count, p.merchant_id
  FROM public.products p
  JOIN public.merchant_stores ms ON ms.merchant_id = p.merchant_id
  WHERE ms.slug = p_slug AND ms.is_active = true AND p.is_active = true
  ORDER BY p.is_featured DESC, p.sort_order ASC, p.created_at DESC;
$$;

-- Public: increment view count
CREATE OR REPLACE FUNCTION public.increment_product_view(p_product_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.products SET view_count = view_count + 1 WHERE id = p_product_id;
$$;

-- Public: create order from storefront
CREATE OR REPLACE FUNCTION public.public_create_order(
  p_merchant_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_customer_address TEXT,
  p_note TEXT,
  p_shipping_fee NUMERIC,
  p_items JSONB  -- [{product_id, quantity}]
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id UUID;
  v_subtotal NUMERIC := 0;
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_qty INTEGER;
  v_unit NUMERIC;
  v_line NUMERIC;
  v_code TEXT;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Giỏ hàng trống';
  END IF;

  -- Pre-validate stock + compute total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::uuid
        AND merchant_id = p_merchant_id
        AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sản phẩm không tồn tại'; END IF;
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    IF v_qty < 1 THEN v_qty := 1; END IF;
    IF NOT v_product.unlimited_stock AND v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Sản phẩm "%" không đủ tồn kho', v_product.name;
    END IF;
    v_unit := COALESCE(v_product.sale_price, v_product.price);
    v_subtotal := v_subtotal + v_unit * v_qty;
  END LOOP;

  -- Create order
  INSERT INTO public.orders (
    merchant_id, customer_name, customer_phone, customer_email,
    customer_address, note, subtotal, shipping_fee, total, status
  ) VALUES (
    p_merchant_id, p_customer_name, p_customer_phone, p_customer_email,
    p_customer_address, p_note,
    v_subtotal, COALESCE(p_shipping_fee,0),
    v_subtotal + COALESCE(p_shipping_fee,0), 'pending'
  ) RETURNING id, order_code INTO v_order_id, v_code;

  -- Insert items + decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_unit := COALESCE(v_product.sale_price, v_product.price);
    v_line := v_unit * v_qty;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_image,
      unit_price, quantity, line_total
    ) VALUES (
      v_order_id, v_product.id, v_product.name, v_product.image_url,
      v_unit, v_qty, v_line
    );

    IF NOT v_product.unlimited_stock THEN
      UPDATE public.products
        SET stock = stock - v_qty, sold_count = sold_count + v_qty
        WHERE id = v_product.id;
    ELSE
      UPDATE public.products
        SET sold_count = sold_count + v_qty
        WHERE id = v_product.id;
    END IF;
  END LOOP;

  RETURN json_build_object('order_id', v_order_id, 'order_code', v_code, 'total', v_subtotal + COALESCE(p_shipping_fee,0));
END $$;

-- Public: get order summary (for thank-you page)
CREATE OR REPLACE FUNCTION public.get_public_order(p_order_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items JSON;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT json_agg(json_build_object(
    'product_name', product_name, 'product_image', product_image,
    'unit_price', unit_price, 'quantity', quantity, 'line_total', line_total
  )) INTO v_items FROM public.order_items WHERE order_id = p_order_id;
  RETURN json_build_object(
    'id', v_order.id, 'order_code', v_order.order_code,
    'customer_name', v_order.customer_name, 'customer_phone', v_order.customer_phone,
    'total', v_order.total, 'subtotal', v_order.subtotal, 'shipping_fee', v_order.shipping_fee,
    'status', v_order.status, 'created_at', v_order.created_at,
    'merchant_id', v_order.merchant_id, 'items', COALESCE(v_items, '[]'::json)
  );
END $$;

-- Dashboard stats
CREATE OR REPLACE FUNCTION public.get_store_stats()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_merchant_id UUID; v_result JSON;
BEGIN
  SELECT id INTO v_merchant_id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_merchant_id IS NULL THEN RETURN json_build_object('products',0,'orders_today',0,'revenue_today',0,'pending_orders',0); END IF;
  SELECT json_build_object(
    'products', (SELECT COUNT(*) FROM public.products WHERE merchant_id = v_merchant_id AND is_active = true),
    'orders_today', (SELECT COUNT(*) FROM public.orders WHERE merchant_id = v_merchant_id AND created_at::date = CURRENT_DATE),
    'revenue_today', COALESCE((SELECT SUM(total) FROM public.orders WHERE merchant_id = v_merchant_id AND status IN ('paid','completed','shipping') AND created_at::date = CURRENT_DATE),0),
    'pending_orders', (SELECT COUNT(*) FROM public.orders WHERE merchant_id = v_merchant_id AND status = 'pending'),
    'total_revenue', COALESCE((SELECT SUM(total) FROM public.orders WHERE merchant_id = v_merchant_id AND status IN ('paid','completed','shipping')),0),
    'low_stock', (SELECT COUNT(*) FROM public.products WHERE merchant_id = v_merchant_id AND is_active = true AND unlimited_stock = false AND stock <= 3)
  ) INTO v_result;
  RETURN v_result;
END $$;

-- ============== STORAGE POLICIES for product-images ==============
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Merchant upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Merchant delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Merchant update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );
