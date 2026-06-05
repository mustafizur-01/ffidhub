CREATE OR REPLACE FUNCTION public.get_seller_public_profile(_user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, email text, avatar_url text, is_verified_seller boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.email, p.avatar_url, p.is_verified_seller, p.created_at
  FROM public.profiles p
  WHERE p.user_id = _user_id
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_public_profile(uuid) TO anon, authenticated;