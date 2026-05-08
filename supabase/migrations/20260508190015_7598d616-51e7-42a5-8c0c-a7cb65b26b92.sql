
-- 1) Tighten id_listings RLS: protect sensitive seller data
DROP POLICY IF EXISTS "Anyone can view basic listing info" ON public.id_listings;

CREATE POLICY "Sellers can view own listings"
ON public.id_listings FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all listings"
ON public.id_listings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Public-safe view for browsing (excludes sensitive credentials/contact)
CREATE OR REPLACE VIEW public.id_listings_public
WITH (security_invoker = false) AS
SELECT id, id_level, login_method, key_items, price, image_url,
       is_email_binded, seller_id, created_at, updated_at
FROM public.id_listings;

GRANT SELECT ON public.id_listings_public TO anon, authenticated;

-- 3) Secure RPC to fetch credentials only for seller, admin, or approved buyer
CREATE OR REPLACE FUNCTION public.get_listing_credentials(_listing_id uuid)
RETURNS TABLE (
  contact_number text,
  account_login_id text,
  account_password text,
  binded_email text,
  security_code text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.contact_number, l.account_login_id, l.account_password,
         l.binded_email, l.security_code
  FROM public.id_listings l
  WHERE l.id = _listing_id
    AND (
      l.seller_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.purchases p
        WHERE p.listing_id = _listing_id
          AND p.buyer_id = auth.uid()
          AND p.status = 'approved'
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_listing_credentials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_credentials(uuid) TO authenticated;

-- 4) Storage: require authentication to upload to id-screenshots
DROP POLICY IF EXISTS "Anyone can upload screenshots" ON storage.objects;

CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'id-screenshots'
  AND auth.uid() IS NOT NULL
);
