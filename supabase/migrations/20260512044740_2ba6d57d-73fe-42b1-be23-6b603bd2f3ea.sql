CREATE OR REPLACE FUNCTION public.is_verified_seller(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_verified_seller FROM public.profiles WHERE user_id = _user_id), false);
$$;