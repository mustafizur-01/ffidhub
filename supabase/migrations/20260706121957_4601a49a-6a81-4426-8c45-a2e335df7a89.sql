DROP FUNCTION IF EXISTS public.get_active_vip(uuid);

CREATE OR REPLACE FUNCTION public.get_active_vip(_user_id uuid)
RETURNS TABLE(tier text, expires_at timestamp with time zone, boosts_quota integer, boosts_used integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tier, expires_at, boosts_quota, boosts_used
  FROM public.vip_subscriptions
  WHERE user_id = _user_id AND status = 'active' AND expires_at > now()
  ORDER BY expires_at DESC LIMIT 1;
$$;