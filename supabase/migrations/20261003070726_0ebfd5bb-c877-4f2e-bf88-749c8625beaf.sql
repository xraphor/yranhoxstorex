CREATE POLICY "copilot_media_admin_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'copilot-media' AND public.is_store_admin());

CREATE POLICY "copilot_media_admin_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'copilot-media' AND public.is_store_admin());

CREATE POLICY "copilot_media_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'copilot-media' AND public.is_store_admin())
WITH CHECK (bucket_id = 'copilot-media' AND public.is_store_admin());

CREATE POLICY "copilot_media_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'copilot-media' AND public.is_store_admin());