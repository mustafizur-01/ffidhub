
-- ============== featured listings ==============
ALTER TABLE public.id_listings
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'fixed';

ALTER TABLE public.id_listings
  DROP CONSTRAINT IF EXISTS id_listings_listing_type_check;
ALTER TABLE public.id_listings
  ADD CONSTRAINT id_listings_listing_type_check CHECK (listing_type IN ('fixed','auction'));

CREATE INDEX IF NOT EXISTS idx_id_listings_featured_until ON public.id_listings (featured_until DESC NULLS LAST);

-- ============== auctions ==============
CREATE TABLE IF NOT EXISTS public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL UNIQUE REFERENCES public.id_listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  start_price numeric(10,2) NOT NULL CHECK (start_price > 0),
  min_increment numeric(10,2) NOT NULL DEFAULT 5,
  current_bid numeric(10,2),
  current_bidder uuid,
  bid_count integer NOT NULL DEFAULT 0,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auctions_status_check CHECK (status IN ('active','settled','cancelled'))
);

GRANT SELECT ON public.auctions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auctions" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Sellers can create own auctions" ON public.auctions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers/admin can update auctions" ON public.auctions FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_auctions_ends_at ON public.auctions (ends_at);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions (status);

-- ============== bids ==============
CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'held',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bids_status_check CHECK (status IN ('held','refunded','won','cancelled'))
);

GRANT SELECT, INSERT ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view bids" ON public.bids FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id);

CREATE INDEX IF NOT EXISTS idx_bids_auction ON public.bids (auction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON public.bids (bidder_id);

-- ============== offers ==============
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.id_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  message text,
  status text NOT NULL DEFAULT 'pending',
  counter_amount numeric(10,2),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offers_status_check CHECK (status IN ('pending','accepted','rejected','countered','expired','cancelled'))
);

GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer and seller view offers" ON public.offers FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Buyers create offers" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Parties update offers" ON public.offers FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_offers_listing ON public.offers (listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_status ON public.offers (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON public.offers (buyer_id);

-- ============== vip subscriptions ==============
CREATE TABLE IF NOT EXISTS public.vip_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL,
  amount numeric(10,2) NOT NULL,
  utr_number text,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  expires_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_subs_tier_check CHECK (tier IN ('bronze','silver','gold')),
  CONSTRAINT vip_subs_status_check CHECK (status IN ('pending','active','rejected','expired'))
);

GRANT SELECT, INSERT ON public.vip_subscriptions TO authenticated;
GRANT ALL ON public.vip_subscriptions TO service_role;

ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vip subs" ON public.vip_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users create own vip subs" ON public.vip_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update vip subs" ON public.vip_subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_vip_subs_updated_at BEFORE UPDATE ON public.vip_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vip_user_status ON public.vip_subscriptions (user_id, status);

-- ============== balance_transactions: allow new types ==============
ALTER TABLE public.balance_transactions DROP CONSTRAINT IF EXISTS balance_transactions_transaction_type_check;
ALTER TABLE public.balance_transactions ADD CONSTRAINT balance_transactions_transaction_type_check
CHECK (transaction_type = ANY (ARRAY[
  'add','remove',
  'escrow_hold','escrow_release','escrow_refund',
  'purchase','sale','refund',
  'deposit','withdrawal','withdrawal_request','withdrawal_refund',
  'daily_reward','referral_reward',
  'tournament_entry','tournament_prize','tournament_refund',
  'bid_hold','bid_refund','bid_win',
  'offer_accept','feature_boost','vip_payment',
  'admin_adjust'
]));

-- ============== helper: active vip tier ==============
CREATE OR REPLACE FUNCTION public.get_active_vip(_user_id uuid)
RETURNS TABLE(tier text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tier, expires_at FROM public.vip_subscriptions
  WHERE user_id = _user_id AND status = 'active' AND expires_at > now()
  ORDER BY expires_at DESC LIMIT 1;
$$;

-- ============== feature a listing (paid boost) ==============
CREATE OR REPLACE FUNCTION public.feature_listing(_listing_id uuid, _days integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.id_listings%ROWTYPE;
  me public.profiles%ROWTYPE;
  cost numeric;
  new_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  SELECT * INTO l FROM public.id_listings WHERE id = _listing_id;
  IF l.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF l.seller_id <> auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','not_seller'); END IF;
  IF _days NOT IN (1,3,7) THEN RETURN jsonb_build_object('ok',false,'reason','invalid_days'); END IF;

  cost := CASE _days WHEN 1 THEN 20 WHEN 3 THEN 50 WHEN 7 THEN 120 END;

  SELECT * INTO me FROM public.profiles WHERE user_id = auth.uid();
  IF me.balance < cost THEN RETURN jsonb_build_object('ok',false,'reason','insufficient_balance'); END IF;

  PERFORM set_config('app.bypass_profile_guard','on',true);
  UPDATE public.profiles SET balance = balance - cost WHERE id = me.id;
  PERFORM set_config('app.bypass_profile_guard','off',true);

  INSERT INTO public.balance_transactions(profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
  VALUES (me.id, me.user_id, -cost, me.balance, me.balance - cost, 'feature_boost', 'Featured listing '||_listing_id::text||' for '||_days||'d');

  new_until := GREATEST(COALESCE(l.featured_until, now()), now()) + (_days || ' days')::interval;
  UPDATE public.id_listings SET featured_until = new_until, updated_at = now() WHERE id = _listing_id;

  RETURN jsonb_build_object('ok',true,'featured_until',new_until,'cost',cost);
END $$;

-- ============== create offer ==============
CREATE OR REPLACE FUNCTION public.create_offer(_listing_id uuid, _amount numeric, _message text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.id_listings%ROWTYPE;
  me public.profiles%ROWTYPE;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok',false,'reason','invalid_amount'); END IF;
  SELECT * INTO l FROM public.id_listings WHERE id = _listing_id;
  IF l.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF l.seller_id = auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','own_listing'); END IF;
  IF public.is_listing_sold(_listing_id) THEN RETURN jsonb_build_object('ok',false,'reason','sold'); END IF;

  SELECT * INTO me FROM public.profiles WHERE user_id = auth.uid();
  IF me.balance < _amount THEN RETURN jsonb_build_object('ok',false,'reason','insufficient_balance'); END IF;

  INSERT INTO public.offers (listing_id, buyer_id, seller_id, amount, message)
  VALUES (_listing_id, auth.uid(), l.seller_id, _amount, _message)
  RETURNING id INTO new_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (l.seller_id, 'offer', 'New offer received', 'Offer of ₹'||_amount||' on your listing', '/my-listings');

  RETURN jsonb_build_object('ok',true,'id',new_id);
END $$;

-- ============== respond to offer ==============
CREATE OR REPLACE FUNCTION public.respond_offer(_offer_id uuid, _action text, _counter numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.offers%ROWTYPE;
  l public.id_listings%ROWTYPE;
  buyer_profile public.profiles%ROWTYPE;
  seller_profile public.profiles%ROWTYPE;
  new_purchase uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  SELECT * INTO o FROM public.offers WHERE id = _offer_id;
  IF o.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF o.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'reason','invalid_state'); END IF;
  IF o.expires_at < now() THEN
    UPDATE public.offers SET status='expired' WHERE id=_offer_id;
    RETURN jsonb_build_object('ok',false,'reason','expired');
  END IF;
  IF _action NOT IN ('accept','reject','counter','cancel') THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_action');
  END IF;

  IF _action = 'cancel' THEN
    IF o.buyer_id <> auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','not_buyer'); END IF;
    UPDATE public.offers SET status='cancelled', updated_at=now() WHERE id=_offer_id;
    RETURN jsonb_build_object('ok',true);
  END IF;

  IF o.seller_id <> auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','not_seller'); END IF;

  IF _action = 'reject' THEN
    UPDATE public.offers SET status='rejected', updated_at=now() WHERE id=_offer_id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (o.buyer_id, 'offer', 'Offer rejected', 'Your offer was declined', '/my-purchases');
    RETURN jsonb_build_object('ok',true);
  END IF;

  IF _action = 'counter' THEN
    IF _counter IS NULL OR _counter <= 0 THEN RETURN jsonb_build_object('ok',false,'reason','invalid_counter'); END IF;
    UPDATE public.offers SET status='countered', counter_amount=_counter, updated_at=now() WHERE id=_offer_id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (o.buyer_id, 'offer', 'Seller counter offer', 'Counter: ₹'||_counter, '/my-purchases');
    RETURN jsonb_build_object('ok',true);
  END IF;

  -- accept: hold escrow, create purchase
  SELECT * INTO l FROM public.id_listings WHERE id = o.listing_id;
  IF public.is_listing_sold(o.listing_id) THEN RETURN jsonb_build_object('ok',false,'reason','sold'); END IF;

  SELECT * INTO buyer_profile FROM public.profiles WHERE user_id = o.buyer_id;
  IF buyer_profile.balance < o.amount THEN
    UPDATE public.offers SET status='rejected', updated_at=now() WHERE id=_offer_id;
    RETURN jsonb_build_object('ok',false,'reason','buyer_insufficient');
  END IF;

  PERFORM set_config('app.bypass_profile_guard','on',true);
  UPDATE public.profiles SET balance = balance - o.amount WHERE id = buyer_profile.id;
  PERFORM set_config('app.bypass_profile_guard','off',true);

  INSERT INTO public.balance_transactions(profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
  VALUES (buyer_profile.id, buyer_profile.user_id, -o.amount, buyer_profile.balance, buyer_profile.balance - o.amount, 'escrow_hold', 'Offer accepted - escrow');

  -- mark listing price = accepted offer amount? keep listing price; record purchase
  INSERT INTO public.purchases(listing_id, buyer_id, status)
  VALUES (o.listing_id, o.buyer_id, 'pending_delivery')
  RETURNING id INTO new_purchase;

  UPDATE public.offers SET status='accepted', updated_at=now() WHERE id=_offer_id;

  RETURN jsonb_build_object('ok',true,'purchase_id',new_purchase);
END $$;

-- ============== create auction (seller) ==============
CREATE OR REPLACE FUNCTION public.create_auction(_listing_id uuid, _start_price numeric, _duration_hours integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.id_listings%ROWTYPE;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  IF _duration_hours NOT IN (1,6,24,72) THEN RETURN jsonb_build_object('ok',false,'reason','invalid_duration'); END IF;
  SELECT * INTO l FROM public.id_listings WHERE id = _listing_id;
  IF l.id IS NULL OR l.seller_id <> auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','not_owner'); END IF;
  IF EXISTS (SELECT 1 FROM public.auctions WHERE listing_id = _listing_id AND status='active') THEN
    RETURN jsonb_build_object('ok',false,'reason','already_active');
  END IF;

  UPDATE public.id_listings SET listing_type='auction', updated_at=now() WHERE id = _listing_id;

  INSERT INTO public.auctions(listing_id, seller_id, start_price, ends_at)
  VALUES (_listing_id, auth.uid(), _start_price, now() + (_duration_hours||' hours')::interval)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok',true,'id',new_id);
END $$;

-- ============== place bid ==============
CREATE OR REPLACE FUNCTION public.place_bid(_auction_id uuid, _amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.auctions%ROWTYPE;
  me public.profiles%ROWTYPE;
  prev_bidder_profile public.profiles%ROWTYPE;
  min_required numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  SELECT * INTO a FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF a.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF a.status <> 'active' THEN RETURN jsonb_build_object('ok',false,'reason','not_active'); END IF;
  IF a.ends_at <= now() THEN RETURN jsonb_build_object('ok',false,'reason','ended'); END IF;
  IF a.seller_id = auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','own_auction'); END IF;

  min_required := COALESCE(a.current_bid, 0) + CASE WHEN a.current_bid IS NULL THEN 0 ELSE a.min_increment END;
  IF a.current_bid IS NULL THEN min_required := a.start_price; END IF;
  IF _amount < min_required THEN RETURN jsonb_build_object('ok',false,'reason','bid_too_low','min',min_required); END IF;

  SELECT * INTO me FROM public.profiles WHERE user_id = auth.uid();
  IF me.balance < _amount THEN RETURN jsonb_build_object('ok',false,'reason','insufficient_balance'); END IF;

  -- refund previous high bidder
  IF a.current_bidder IS NOT NULL THEN
    SELECT * INTO prev_bidder_profile FROM public.profiles WHERE user_id = a.current_bidder;
    PERFORM set_config('app.bypass_profile_guard','on',true);
    UPDATE public.profiles SET balance = balance + a.current_bid WHERE id = prev_bidder_profile.id;
    PERFORM set_config('app.bypass_profile_guard','off',true);
    INSERT INTO public.balance_transactions(profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
    VALUES (prev_bidder_profile.id, prev_bidder_profile.user_id, a.current_bid, prev_bidder_profile.balance, prev_bidder_profile.balance + a.current_bid, 'bid_refund', 'Outbid on auction '||a.id::text);
    UPDATE public.bids SET status='refunded' WHERE auction_id=a.id AND bidder_id=a.current_bidder AND status='held';
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (a.current_bidder,'bid','You have been outbid','Someone placed a higher bid','/auctions');
  END IF;

  -- hold new bid
  PERFORM set_config('app.bypass_profile_guard','on',true);
  UPDATE public.profiles SET balance = balance - _amount WHERE id = me.id;
  PERFORM set_config('app.bypass_profile_guard','off',true);
  INSERT INTO public.balance_transactions(profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
  VALUES (me.id, me.user_id, -_amount, me.balance, me.balance - _amount, 'bid_hold', 'Bid placed on auction '||a.id::text);

  INSERT INTO public.bids(auction_id, bidder_id, amount) VALUES (_auction_id, auth.uid(), _amount);

  UPDATE public.auctions SET current_bid=_amount, current_bidder=auth.uid(), bid_count=bid_count+1, updated_at=now()
    WHERE id=_auction_id;

  RETURN jsonb_build_object('ok',true);
END $$;

-- ============== settle auction (idempotent) ==============
CREATE OR REPLACE FUNCTION public.settle_auction(_auction_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.auctions%ROWTYPE;
  new_purchase uuid;
BEGIN
  SELECT * INTO a FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF a.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF a.status <> 'active' THEN RETURN jsonb_build_object('ok',true,'already_settled',true); END IF;
  IF a.ends_at > now() THEN RETURN jsonb_build_object('ok',false,'reason','not_ended'); END IF;

  IF a.current_bidder IS NULL THEN
    UPDATE public.auctions SET status='settled', settled_at=now() WHERE id=a.id;
    RETURN jsonb_build_object('ok',true,'no_bids',true);
  END IF;

  -- winner already had funds held; create purchase pending_delivery
  INSERT INTO public.purchases(listing_id, buyer_id, status)
  VALUES (a.listing_id, a.current_bidder, 'pending_delivery')
  RETURNING id INTO new_purchase;

  UPDATE public.bids SET status='won' WHERE auction_id=a.id AND bidder_id=a.current_bidder AND status='held';
  UPDATE public.auctions SET status='settled', settled_at=now() WHERE id=a.id;

  INSERT INTO public.notifications(user_id,type,title,body,link)
  VALUES
    (a.current_bidder,'bid','You won the auction!','Awaiting seller delivery','/my-purchases'),
    (a.seller_id,'bid','Your auction ended','A winner has been selected. Deliver to release funds.','/my-listings');

  RETURN jsonb_build_object('ok',true,'purchase_id',new_purchase);
END $$;

-- ============== request VIP ==============
CREATE OR REPLACE FUNCTION public.request_vip(_tier text, _utr text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  amt numeric;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  IF _tier NOT IN ('bronze','silver','gold') THEN RETURN jsonb_build_object('ok',false,'reason','invalid_tier'); END IF;
  IF _utr IS NULL OR length(trim(_utr)) < 6 THEN RETURN jsonb_build_object('ok',false,'reason','utr_required'); END IF;
  amt := CASE _tier WHEN 'bronze' THEN 99 WHEN 'silver' THEN 299 WHEN 'gold' THEN 799 END;
  INSERT INTO public.vip_subscriptions(user_id, tier, amount, utr_number)
  VALUES (auth.uid(), _tier, amt, _utr)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('ok',true,'id',new_id);
END $$;

-- ============== admin approve VIP ==============
CREATE OR REPLACE FUNCTION public.admin_approve_vip(_sub_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.vip_subscriptions%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RETURN jsonb_build_object('ok',false,'reason','not_admin'); END IF;
  SELECT * INTO s FROM public.vip_subscriptions WHERE id = _sub_id;
  IF s.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF s.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'reason','invalid_state'); END IF;

  IF _approve THEN
    UPDATE public.vip_subscriptions
      SET status='active', started_at=now(), expires_at=now()+interval '30 days', admin_note=_note, updated_at=now()
      WHERE id=_sub_id;
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (s.user_id,'vip','VIP activated','Welcome to '||s.tier||' tier!','/vip');
  ELSE
    UPDATE public.vip_subscriptions SET status='rejected', admin_note=_note, updated_at=now() WHERE id=_sub_id;
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (s.user_id,'vip','VIP request rejected', COALESCE(_note,'Please contact support'),'/vip');
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
