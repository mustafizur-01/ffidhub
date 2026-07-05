
-- VIP perks: boost quota, top placement, withdrawal fees, featured spotlight

-- 1) Track boost usage in VIP subscriptions
ALTER TABLE public.vip_subscriptions
  ADD COLUMN IF NOT EXISTS boosts_quota int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boosts_used int NOT NULL DEFAULT 0;

-- 2) Set quota when admin activates VIP
CREATE OR REPLACE FUNCTION public.admin_approve_vip(_sub_id uuid, _approve boolean, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.vip_subscriptions%ROWTYPE;
  q int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RETURN jsonb_build_object('ok',false,'reason','not_admin'); END IF;
  SELECT * INTO s FROM public.vip_subscriptions WHERE id = _sub_id;
  IF s.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF s.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'reason','invalid_state'); END IF;

  IF _approve THEN
    q := CASE s.tier WHEN 'bronze' THEN 2 WHEN 'silver' THEN 5 WHEN 'gold' THEN 999999 ELSE 0 END;
    UPDATE public.vip_subscriptions
      SET status='active', started_at=now(), expires_at=now()+interval '30 days',
          admin_note=_note, boosts_quota=q, boosts_used=0, updated_at=now()
      WHERE id=_sub_id;
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (s.user_id,'vip','VIP activated','Welcome to '||s.tier||' tier!','/vip');
  ELSE
    UPDATE public.vip_subscriptions SET status='rejected', admin_note=_note, updated_at=now() WHERE id=_sub_id;
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (s.user_id,'vip','VIP request rejected', COALESCE(_note,'Please contact support'),'/vip');
  END IF;
  RETURN jsonb_build_object('ok',true);
END $function$;

-- 3) feature_listing: use free VIP quota when available
CREATE OR REPLACE FUNCTION public.feature_listing(_listing_id uuid, _days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  l public.id_listings%ROWTYPE;
  me public.profiles%ROWTYPE;
  cost numeric;
  new_until timestamptz;
  vip public.vip_subscriptions%ROWTYPE;
  use_free boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  SELECT * INTO l FROM public.id_listings WHERE id = _listing_id;
  IF l.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF l.seller_id <> auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','not_seller'); END IF;
  IF _days NOT IN (1,3,7) THEN RETURN jsonb_build_object('ok',false,'reason','invalid_days'); END IF;

  cost := CASE _days WHEN 1 THEN 20 WHEN 3 THEN 50 WHEN 7 THEN 120 END;

  -- Active VIP with quota => free boost
  SELECT * INTO vip FROM public.vip_subscriptions
    WHERE user_id = auth.uid() AND status='active' AND expires_at > now()
    ORDER BY expires_at DESC LIMIT 1;

  IF vip.id IS NOT NULL AND vip.boosts_used < vip.boosts_quota THEN
    use_free := true;
  END IF;

  IF use_free THEN
    UPDATE public.vip_subscriptions SET boosts_used = boosts_used + 1 WHERE id = vip.id;
    new_until := GREATEST(COALESCE(l.featured_until, now()), now()) + (_days || ' days')::interval;
    UPDATE public.id_listings SET featured_until = new_until, updated_at = now() WHERE id = _listing_id;
    RETURN jsonb_build_object('ok',true,'featured_until',new_until,'cost',0,'vip_free',true,
      'boosts_remaining', vip.boosts_quota - vip.boosts_used - 1);
  END IF;

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
END $function$;

-- 4) Withdrawal fees: Gold=0%, Silver=2.5%, Bronze=5%, none=5%
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _upi_id text, _account_holder text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me public.profiles%ROWTYPE;
  new_id UUID;
  vip_tier text;
  fee_pct numeric;
  fee_amt numeric;
  net_amt numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;
  IF _amount IS NULL OR _amount < 50 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'min_amount_50');
  END IF;

  SELECT * INTO me FROM public.profiles WHERE user_id = auth.uid();
  IF me.balance < _amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance');
  END IF;

  SELECT tier INTO vip_tier FROM public.vip_subscriptions
    WHERE user_id = auth.uid() AND status='active' AND expires_at > now()
    ORDER BY expires_at DESC LIMIT 1;

  fee_pct := CASE vip_tier
    WHEN 'gold' THEN 0
    WHEN 'silver' THEN 2.5
    WHEN 'bronze' THEN 4
    ELSE 5
  END;
  fee_amt := ROUND(_amount * fee_pct / 100.0, 2);
  net_amt := _amount - fee_amt;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET balance = balance - _amount WHERE id = me.id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.balance_transactions (
    profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note
  ) VALUES (
    me.id, me.user_id, -_amount, me.balance, me.balance - _amount,
    'withdrawal_request',
    'Withdrawal to '||_upi_id||' | Fee '||fee_pct||'% (₹'||fee_amt||') | Net ₹'||net_amt
  );

  INSERT INTO public.withdrawal_requests (user_id, amount, upi_id, account_holder)
  VALUES (auth.uid(), net_amt, _upi_id, _account_holder)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id, 'fee_pct', fee_pct, 'fee_amount', fee_amt, 'net_amount', net_amt);
END;
$function$;

-- 5) Featured sellers: prioritise active VIP (gold > silver > bronze)
CREATE OR REPLACE FUNCTION public.get_featured_sellers(_limit integer DEFAULT 6)
 RETURNS TABLE(user_id uuid, display_name text, email text, avatar_url text, active_listings bigint, total_sales bigint, avg_rating numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH vip AS (
    SELECT user_id, tier,
      CASE tier WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 WHEN 'bronze' THEN 1 ELSE 0 END AS rank
    FROM public.vip_subscriptions
    WHERE status='active' AND expires_at > now()
  )
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
  LEFT JOIN vip v ON v.user_id = p.user_id
  WHERE p.is_verified_seller = true OR v.rank IS NOT NULL
  ORDER BY COALESCE(v.rank,0) DESC, total_sales DESC, active_listings DESC
  LIMIT _limit;
$function$;

-- 6) Helper: return active gold VIP user ids for client-side top placement
CREATE OR REPLACE FUNCTION public.get_gold_vip_user_ids()
 RETURNS TABLE(user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT user_id FROM public.vip_subscriptions
  WHERE tier='gold' AND status='active' AND expires_at > now();
$function$;
