
-- Allow public read of merchant_banks for payment pages (only bank display info)
CREATE POLICY "Public can view merchant banks for payments"
  ON public.merchant_banks
  FOR SELECT
  USING (true);
