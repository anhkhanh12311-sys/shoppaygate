-- Create merchant_staff table
CREATE TABLE public.merchant_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  permissions JSONB NOT NULL DEFAULT '{"view_transactions":true,"create_payment_links":false,"manage_store":false,"view_reports":false,"manage_staff":false}'::jsonb,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, email)
);

-- Enable RLS
ALTER TABLE public.merchant_staff ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Merchants can view their own staff"
ON public.merchant_staff FOR SELECT
USING (is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can invite staff"
ON public.merchant_staff FOR INSERT
WITH CHECK (is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can update their own staff"
ON public.merchant_staff FOR UPDATE
USING (is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can remove their own staff"
ON public.merchant_staff FOR DELETE
USING (is_merchant_owner(merchant_id));

CREATE POLICY "Admins can manage all staff"
ON public.merchant_staff FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_merchant_staff_updated_at
BEFORE UPDATE ON public.merchant_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();