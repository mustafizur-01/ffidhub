CREATE OR REPLACE FUNCTION public.is_listing_sold(_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchases
    WHERE listing_id = _listing_id
      AND status = 'approved'
  )
$$;