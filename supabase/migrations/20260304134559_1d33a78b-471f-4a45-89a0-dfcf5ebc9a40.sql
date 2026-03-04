
-- Create merchant_stores table
CREATE TABLE public.merchant_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  store_name text NOT NULL,
  description text,
  logo_url text,
  banner_url text,
  primary_color text DEFAULT '#7c3aed',
  secondary_color text DEFAULT '#e91e8c',
  footer_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(merchant_id)
);

-- Enable RLS
ALTER TABLE public.merchant_stores ENABLE ROW LEVEL SECURITY;

-- Merchants can manage their own store
CREATE POLICY "Merchants can view their own store"
  ON public.merchant_stores FOR SELECT
  USING (is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can create their own store"
  ON public.merchant_stores FOR INSERT
  WITH CHECK (is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can update their own store"
  ON public.merchant_stores FOR UPDATE
  USING (is_merchant_owner(merchant_id));

-- Public can view active stores
CREATE POLICY "Public can view active stores"
  ON public.merchant_stores FOR SELECT
  USING (is_active = true);

-- Admins full access
CREATE POLICY "Admins can manage all stores"
  ON public.merchant_stores FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_merchant_stores_updated_at
  BEFORE UPDATE ON public.merchant_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_stores;
