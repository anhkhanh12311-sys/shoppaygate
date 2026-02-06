
-- Create merchant_banks table for multiple bank accounts
CREATE TABLE public.merchant_banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_banks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Merchants can view their own banks"
ON public.merchant_banks FOR SELECT
USING (is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can create their own banks"
ON public.merchant_banks FOR INSERT
WITH CHECK (is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can update their own banks"
ON public.merchant_banks FOR UPDATE
USING (is_merchant_owner(merchant_id));

CREATE POLICY "Merchants can delete their own banks"
ON public.merchant_banks FOR DELETE
USING (is_merchant_owner(merchant_id));

-- Trigger for updated_at
CREATE TRIGGER update_merchant_banks_updated_at
BEFORE UPDATE ON public.merchant_banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one default bank per merchant
CREATE OR REPLACE FUNCTION public.ensure_single_default_bank()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.merchant_banks
    SET is_default = false
    WHERE merchant_id = NEW.merchant_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_default_bank
BEFORE INSERT OR UPDATE ON public.merchant_banks
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_bank();
