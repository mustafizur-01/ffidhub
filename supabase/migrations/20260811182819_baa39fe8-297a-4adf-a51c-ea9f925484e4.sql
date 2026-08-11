CREATE TABLE IF NOT EXISTS public.ai_image_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  source text not null default 'unknown',
  prompt text,
  success boolean not null default true,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.ai_image_generations TO authenticated;
GRANT ALL ON public.ai_image_generations TO service_role;

ALTER TABLE public.ai_image_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all ai image generations" ON public.ai_image_generations;
CREATE POLICY "Admins can view all ai image generations"
ON public.ai_image_generations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own ai image generations" ON public.ai_image_generations;
CREATE POLICY "Users can view their own ai image generations"
ON public.ai_image_generations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_image_generations_created_at_idx ON public.ai_image_generations (created_at DESC);

CREATE OR REPLACE FUNCTION public.get_ai_image_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') THEN jsonb_build_object(
    'total', (SELECT count(*) FROM public.ai_image_generations),
    'today', (SELECT count(*) FROM public.ai_image_generations WHERE created_at >= date_trunc('day', now())),
    'week', (SELECT count(*) FROM public.ai_image_generations WHERE created_at >= now() - interval '7 days'),
    'unique_users', (SELECT count(DISTINCT user_id) FROM public.ai_image_generations),
    'failed', (SELECT count(*) FROM public.ai_image_generations WHERE success = false),
    'by_source', (SELECT coalesce(jsonb_object_agg(source, c), '{}'::jsonb) FROM (SELECT source, count(*) c FROM public.ai_image_generations GROUP BY source) s)
  ) ELSE jsonb_build_object('error', 'forbidden') END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_image_stats() TO authenticated;