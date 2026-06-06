
-- Public read for receipt-logos (logos shown on public bill pages)
CREATE POLICY "Public read receipt logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipt-logos');

-- Authenticated users can upload to their own folder (first folder segment = merchant_id)
CREATE POLICY "Merchant owner can upload receipt logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipt-logos'
    AND public.is_merchant_owner((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Merchant owner can update receipt logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipt-logos'
    AND public.is_merchant_owner((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Merchant owner can delete receipt logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipt-logos'
    AND public.is_merchant_owner((storage.foldername(name))[1]::uuid)
  );
