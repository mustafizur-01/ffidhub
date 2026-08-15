CREATE TABLE IF NOT EXISTS public.app_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  version_code integer NOT NULL DEFAULT 1,
  apk_path text,
  apk_external_url text,
  release_notes text,
  min_android text DEFAULT '7.0',
  size_mb numeric,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_releases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_releases TO authenticated;
GRANT ALL ON public.app_releases TO service_role;

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published releases" ON public.app_releases;
CREATE POLICY "Anyone can view published releases"
ON public.app_releases FOR SELECT
USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage releases" ON public.app_releases;
CREATE POLICY "Admins manage releases"
ON public.app_releases FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read app builds" ON storage.objects;
CREATE POLICY "Anyone can read app builds"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-builds');

DROP POLICY IF EXISTS "Admins can upload app builds" ON storage.objects;
CREATE POLICY "Admins can upload app builds"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update app builds" ON storage.objects;
CREATE POLICY "Admins can update app builds"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete app builds" ON storage.objects;
CREATE POLICY "Admins can delete app builds"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_releases (version, version_code, release_notes, min_android, is_published)
SELECT 'v1.4.0', 140, 'VIP theme personalization, VIP Lounge, faster listings and escrow fixes.', '7.0', true
WHERE NOT EXISTS (SELECT 1 FROM public.app_releases);