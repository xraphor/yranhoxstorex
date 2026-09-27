CREATE POLICY "Sellers upload own product images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'sellers' AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.user_id = auth.uid() AND s.status = 'active'));