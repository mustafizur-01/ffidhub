
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_seller(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_listing_sold(uuid) TO anon, authenticated;
