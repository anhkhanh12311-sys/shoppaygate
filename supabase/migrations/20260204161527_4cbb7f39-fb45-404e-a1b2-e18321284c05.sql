-- Create merchants table
CREATE TABLE public.merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  sepay_api_key TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id)
);

-- Create payment_links table
CREATE TABLE public.payment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed')),
  is_static BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_link_id UUID NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  transfer_content TEXT,
  bank_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_payment_links_merchant_id ON public.payment_links(merchant_id);
CREATE INDEX idx_payment_links_code ON public.payment_links(code);
CREATE INDEX idx_transactions_merchant_id ON public.transactions(merchant_id);
CREATE INDEX idx_transactions_payment_link_id ON public.transactions(payment_link_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- Security definer function to check if user is merchant owner
CREATE OR REPLACE FUNCTION public.is_merchant_owner(merchant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.merchants
    WHERE id = merchant_id
      AND auth_user_id = auth.uid()
  )
$$;

-- Security definer function to get merchant id from auth user
CREATE OR REPLACE FUNCTION public.get_merchant_id_for_auth_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- RLS Policies for merchants
CREATE POLICY "Users can view their own merchant profile"
ON public.merchants
FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own merchant profile"
ON public.merchants
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own merchant profile"
ON public.merchants
FOR UPDATE
USING (auth.uid() = auth_user_id);

-- RLS Policies for payment_links
CREATE POLICY "Merchants can view their own payment links"
ON public.payment_links
FOR SELECT
USING (public.is_merchant_owner(merchant_id));

CREATE POLICY "Public can view active payment links by code"
ON public.payment_links
FOR SELECT
USING (status = 'active');

CREATE POLICY "Merchants can create their own payment links"
ON public.payment_links
FOR INSERT
WITH CHECK (public.is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can update their own payment links"
ON public.payment_links
FOR UPDATE
USING (public.is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can delete their own payment links"
ON public.payment_links
FOR DELETE
USING (public.is_merchant_owner(merchant_id));

-- RLS Policies for transactions
CREATE POLICY "Merchants can view their own transactions"
ON public.transactions
FOR SELECT
USING (public.is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can create transactions"
ON public.transactions
FOR INSERT
WITH CHECK (public.is_merchant_owner(merchant_id));

CREATE POLICY "System can insert transactions via webhook"
ON public.transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Merchants can update their own transactions"
ON public.transactions
FOR UPDATE
USING (public.is_merchant_owner(merchant_id));

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for merchants updated_at
CREATE TRIGGER update_merchants_updated_at
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create merchant profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchants (auth_user_id, email, business_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'business_name', 'Cửa hàng của tôi'));
  RETURN NEW;
END;
$$;

-- Trigger to auto-create merchant on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();