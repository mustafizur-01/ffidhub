
-- Marketplace stats aggregate (publicly readable)
CREATE OR REPLACE FUNCTION public.get_marketplace_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_ids_sold', (SELECT COUNT(*) FROM public.purchases WHERE status = 'approved'),
    'verified_sellers', (SELECT COUNT(*) FROM public.profiles WHERE is_verified_seller = true),
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'trade_volume', COALESCE((
      SELECT SUM(l.price) FROM public.purchases p
      JOIN public.id_listings l ON l.id = p.listing_id
      WHERE p.status = 'approved'
    ), 0),
    'success_rate', CASE
      WHEN (SELECT COUNT(*) FROM public.purchases WHERE status IN ('approved','rejected')) = 0 THEN 100
      ELSE ROUND(
        100.0 * (SELECT COUNT(*) FROM public.purchases WHERE status = 'approved')::numeric
        / NULLIF((SELECT COUNT(*) FROM public.purchases WHERE status IN ('approved','rejected'))::numeric, 0)
      , 1)
    END,
    'total_listings', (SELECT COUNT(*) FROM public.id_listings)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_stats() TO anon, authenticated;

-- Seller stats: total approved sales for a given seller
CREATE OR REPLACE FUNCTION public.get_seller_stats(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_sales', (
      SELECT COUNT(*) FROM public.purchases p
      JOIN public.id_listings l ON l.id = p.listing_id
      WHERE p.status = 'approved' AND l.seller_id = _user_id
    ),
    'positive_reviews', (
      SELECT COUNT(*) FROM public.seller_reviews
      WHERE seller_id = _user_id AND rating >= 4
    ),
    'total_reviews', (
      SELECT COUNT(*) FROM public.seller_reviews WHERE seller_id = _user_id
    ),
    'avg_rating', COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1) FROM public.seller_reviews WHERE seller_id = _user_id
    ), 0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_stats(uuid) TO anon, authenticated;

-- Recently sold listings (public view of sold IDs)
CREATE OR REPLACE FUNCTION public.get_recently_sold_listings(_limit int DEFAULT 6)
RETURNS TABLE (
  id uuid,
  id_level int,
  login_method text,
  key_items text,
  price numeric,
  image_url text,
  is_email_binded boolean,
  seller_id uuid,
  sold_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.id_level, l.login_method::text, l.key_items, l.price, l.image_url,
         l.is_email_binded, l.seller_id, p.updated_at AS sold_at
  FROM public.purchases p
  JOIN public.id_listings l ON l.id = p.listing_id
  WHERE p.status = 'approved'
  ORDER BY p.updated_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_recently_sold_listings(int) TO anon, authenticated;

-- Featured (verified) sellers with their stats
CREATE OR REPLACE FUNCTION public.get_featured_sellers(_limit int DEFAULT 6)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  avatar_url text,
  active_listings bigint,
  total_sales bigint,
  avg_rating numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.email,
    p.avatar_url,
    (SELECT COUNT(*) FROM public.id_listings l
       WHERE l.seller_id = p.user_id
         AND NOT EXISTS (SELECT 1 FROM public.purchases pu WHERE pu.listing_id = l.id AND pu.status = 'approved')
    ) AS active_listings,
    (SELECT COUNT(*) FROM public.purchases pu
       JOIN public.id_listings l ON l.id = pu.listing_id
       WHERE pu.status = 'approved' AND l.seller_id = p.user_id
    ) AS total_sales,
    COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM public.seller_reviews WHERE seller_id = p.user_id), 0) AS avg_rating
  FROM public.profiles p
  WHERE p.is_verified_seller = true
  ORDER BY total_sales DESC, active_listings DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_featured_sellers(int) TO anon, authenticated;
