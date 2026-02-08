
-- Admin can view all merchants
CREATE POLICY "Admins can view all merchants"
ON public.merchants
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all payment links
CREATE POLICY "Admins can view all payment links"
ON public.payment_links
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
