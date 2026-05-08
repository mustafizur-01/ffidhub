
-- Roll back the view-based approach (caused security_definer_view linter error)
DROP VIEW IF EXISTS public.id_listings_public;

-- Restore broad public SELECT policy; column-level revokes will protect sensitive fields
DROP POLICY IF EXISTS "Sellers can view own listings" ON public.id_listings;
DROP POLICY IF EXISTS "Admins can view all listings" ON public.id_listings;

CREATE POLICY "Anyone can view basic listing info"
ON public.id_listings FOR SELECT
USING (true);

-- Column-level revoke on sensitive fields for anon & authenticated.
-- These are now only reachable via the SECURITY DEFINER get_listing_credentials() RPC.
REVOKE SELECT (contact_number, account_login_id, account_password, binded_email, security_code)
ON public.id_listings FROM anon, authenticated;

-- Restrict the credentials RPC to authenticated callers only (silences anon-callable warning)
REVOKE EXECUTE ON FUNCTION public.get_listing_credentials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_listing_credentials(uuid) TO authenticated;
