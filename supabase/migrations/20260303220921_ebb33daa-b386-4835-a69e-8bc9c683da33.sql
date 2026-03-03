-- Allow admin/owner to upload files to configs bucket
CREATE POLICY "Admins can upload to configs bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'configs' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);

CREATE POLICY "Admins can update configs bucket files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'configs' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);

CREATE POLICY "Admins can delete configs bucket files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'configs' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
);
