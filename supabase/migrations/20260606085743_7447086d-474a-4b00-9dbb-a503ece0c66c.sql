
-- BUYER REVIEWS (seller rates buyer)
CREATE TABLE public.buyer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, buyer_id, listing_id)
);
GRANT SELECT ON public.buyer_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_reviews TO authenticated;
GRANT ALL ON public.buyer_reviews TO service_role;
ALTER TABLE public.buyer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view buyer reviews" ON public.buyer_reviews FOR SELECT USING (true);
CREATE POLICY "Sellers can create buyer review for approved purchase" ON public.buyer_reviews
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = seller_id AND EXISTS (
      SELECT 1 FROM public.purchases p
      JOIN public.id_listings l ON l.id = p.listing_id
      WHERE p.listing_id = buyer_reviews.listing_id
        AND p.buyer_id = buyer_reviews.buyer_id
        AND p.status = 'approved'
        AND l.seller_id = auth.uid()
    )
  );
CREATE POLICY "Sellers update own buyer review" ON public.buyer_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers delete own buyer review" ON public.buyer_reviews
  FOR DELETE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Admins manage buyer reviews" ON public.buyer_reviews
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER buyer_reviews_updated_at BEFORE UPDATE ON public.buyer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER REPORTS (report listing or user)
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('listing','user')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports" ON public.user_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users view own reports" ON public.user_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update reports" ON public.user_reports
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete reports" ON public.user_reports
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER user_reports_updated_at BEFORE UPDATE ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BLOCKED USERS
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks" ON public.blocked_users
  FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- REPUTATION SCORE & BADGES
CREATE OR REPLACE FUNCTION public.get_user_reputation(_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH
    sales AS (
      SELECT COUNT(*)::int AS n FROM public.purchases p
      JOIN public.id_listings l ON l.id = p.listing_id
      WHERE p.status = 'approved' AND l.seller_id = _user_id
    ),
    buys AS (
      SELECT COUNT(*)::int AS n FROM public.purchases p
      WHERE p.status = 'approved' AND p.buyer_id = _user_id
    ),
    sr AS (
      SELECT COALESCE(AVG(rating),0)::numeric AS avg, COUNT(*)::int AS n
      FROM public.seller_reviews WHERE seller_id = _user_id
    ),
    br AS (
      SELECT COALESCE(AVG(rating),0)::numeric AS avg, COUNT(*)::int AS n
      FROM public.buyer_reviews WHERE buyer_id = _user_id
    ),
    rep AS (
      SELECT ((SELECT n FROM sales) * 10
            + (SELECT n FROM buys) * 5
            + ROUND((SELECT avg FROM sr) * (SELECT n FROM sr) * 4)
            + ROUND((SELECT avg FROM br) * (SELECT n FROM br) * 2))::int AS score
    )
  SELECT jsonb_build_object(
    'score', (SELECT score FROM rep),
    'tier', CASE
      WHEN (SELECT score FROM rep) >= 500 THEN 'Legend'
      WHEN (SELECT score FROM rep) >= 250 THEN 'Elite'
      WHEN (SELECT score FROM rep) >= 100 THEN 'Trusted'
      WHEN (SELECT score FROM rep) >= 25 THEN 'Rising'
      ELSE 'Rookie' END,
    'total_sales', (SELECT n FROM sales),
    'total_purchases', (SELECT n FROM buys),
    'seller_rating', ROUND((SELECT avg FROM sr), 1),
    'seller_review_count', (SELECT n FROM sr),
    'buyer_rating', ROUND((SELECT avg FROM br), 1),
    'buyer_review_count', (SELECT n FROM br),
    'badges', (
      SELECT jsonb_agg(b) FROM (
        SELECT 'first_sale' AS b WHERE (SELECT n FROM sales) >= 1
        UNION ALL SELECT 'power_seller' WHERE (SELECT n FROM sales) >= 10
        UNION ALL SELECT 'top_seller' WHERE (SELECT n FROM sales) >= 50
        UNION ALL SELECT 'first_purchase' WHERE (SELECT n FROM buys) >= 1
        UNION ALL SELECT 'loyal_buyer' WHERE (SELECT n FROM buys) >= 10
        UNION ALL SELECT 'five_star' WHERE (SELECT avg FROM sr) >= 4.5 AND (SELECT n FROM sr) >= 5
        UNION ALL SELECT 'verified' WHERE EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_verified_seller = true)
      ) x
    )
  );
$$;
