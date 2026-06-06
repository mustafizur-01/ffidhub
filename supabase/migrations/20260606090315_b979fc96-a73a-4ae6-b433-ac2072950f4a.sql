
CREATE OR REPLACE FUNCTION public.get_listing_credentials(_listing_id uuid)
RETURNS TABLE(contact_number text, account_login_id text, account_password text, binded_email text, security_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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
          AND p.status IN ('pending_delivery','delivered','disputed','approved')
      )
    );
$$;
