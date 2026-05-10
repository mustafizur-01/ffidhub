-- Remove broad public SELECT policy so clients cannot list all files in the bucket.
-- Public bucket files remain accessible directly via their public URL without needing a SELECT policy.
DROP POLICY IF EXISTS "Tournament covers are publicly accessible" ON storage.objects;

-- Tighten upload/update policies to authenticated role only (not anon/public)
DROP POLICY IF EXISTS "Authenticated users can upload tournament covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update tournament covers" ON storage.objects;

CREATE POLICY "Authenticated users can upload tournament covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tournament-covers');

CREATE POLICY "Users can update their own tournament covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'tournament-covers' AND owner = auth.uid())
WITH CHECK (bucket_id = 'tournament-covers' AND owner = auth.uid());

CREATE POLICY "Users can delete their own tournament covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'tournament-covers' AND owner = auth.uid());