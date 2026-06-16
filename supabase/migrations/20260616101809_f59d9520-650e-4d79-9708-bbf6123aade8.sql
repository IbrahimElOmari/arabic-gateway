-- Storage policies voor curriculum-media bucket
CREATE POLICY "curriculum_media_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'curriculum-media'
    AND public.can_access_curriculum(auth.uid())
  );

CREATE POLICY "curriculum_media_admin_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'curriculum-media'
    AND public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "curriculum_media_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'curriculum-media' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'curriculum-media' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "curriculum_media_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'curriculum-media' AND public.has_role(auth.uid(),'admin'));
