CREATE POLICY "Clients can read published app builds"
ON storage.objects
FOR SELECT
TO public, authenticated
USING (
  bucket_id = 'app-builds'
  AND EXISTS (
    SELECT 1
    FROM public.app_releases r
    WHERE r.is_published = true
      AND r.apk_path = storage.objects.name
  )
);