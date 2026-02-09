
-- Allow admins to delete merchants
CREATE POLICY "Admins can delete merchants"
ON public.merchants
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update merchants
CREATE POLICY "Admins can update all merchants"
ON public.merchants
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete transactions
CREATE POLICY "Admins can delete transactions"
ON public.transactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete payment_links
CREATE POLICY "Admins can delete payment links"
ON public.payment_links
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete merchant_banks
CREATE POLICY "Admins can delete merchant banks"
ON public.merchant_banks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
