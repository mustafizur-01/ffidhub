UPDATE public.app_releases
SET apk_path = 'releases/v1.4.0-202609021745.apk',
    apk_external_url = NULL,
    size_mb = 4.3,
    is_published = true
WHERE version_code = 140;