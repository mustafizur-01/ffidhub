-- Allow trusted SECURITY DEFINER functions to bypass profile-guard trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role, no-auth (server), admins, or trusted definer context bypass
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR current_setting('app.bypass_profile_guard', true) = 'on'
  THEN
    RETURN NEW;
  END IF;

  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.referral_reward_claimed IS DISTINCT FROM OLD.referral_reward_claimed
     OR NEW.is_verified_seller IS DISTINCT FROM OLD.is_verified_seller
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.last_daily_claim_at IS DISTINCT FROM OLD.last_daily_claim_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.email IS DISTINCT FROM OLD.email
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- Update confirm_purchase to set bypass flag before updating profile balance
CREATE OR REPLACE FUNCTION public.confirm_purchase(_purchase_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.purchases%ROWTYPE; l public.id_listings%ROWTYPE;
  sp public.profiles%ROWTYPE; price numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  SELECT * INTO p FROM public.purchases WHERE id = _purchase_id;
  IF p.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF p.buyer_id <> auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','not_buyer'); END IF;
  IF p.status NOT IN ('pending_delivery','delivered') THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_state');
  END IF;

  SELECT * INTO l FROM public.id_listings WHERE id = p.listing_id;
  price := l.price;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  IF l.seller_id IS NOT NULL THEN
    SELECT * INTO sp FROM public.profiles WHERE user_id = l.seller_id;
    UPDATE public.profiles SET balance = balance + price WHERE id = sp.id;
    INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
    VALUES (sp.id, auth.uid(), price, sp.balance, sp.balance + price, 'escrow_release', 'Escrow released for purchase ' || p.id::text);
  END IF;

  UPDATE public.purchases
    SET status='approved', confirmed_at=now(), updated_at=now()
    WHERE id=_purchase_id;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  IF l.seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (l.seller_id, 'purchase_update', 'Payment released',
            'Buyer confirmed receipt. Funds have been credited to your wallet.',
            '/my-listings');
  END IF;
  RETURN jsonb_build_object('ok',true);
END $function$;

-- Same fix for admin_resolve_dispute, claim_daily_reward, claim_referral_reward, request_withdrawal
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(_purchase_id uuid, _action text, _note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.purchases%ROWTYPE; l public.id_listings%ROWTYPE;
  bp public.profiles%ROWTYPE; sp public.profiles%ROWTYPE; price numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RETURN jsonb_build_object('ok',false,'reason','not_admin');
  END IF;
  IF _action NOT IN ('release','refund') THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_action');
  END IF;

  SELECT * INTO p FROM public.purchases WHERE id = _purchase_id;
  IF p.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF p.status NOT IN ('pending_delivery','delivered','disputed') THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_state');
  END IF;

  SELECT * INTO l FROM public.id_listings WHERE id = p.listing_id;
  price := l.price;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  IF _action = 'release' THEN
    IF l.seller_id IS NOT NULL THEN
      SELECT * INTO sp FROM public.profiles WHERE user_id = l.seller_id;
      UPDATE public.profiles SET balance = balance + price WHERE id = sp.id;
      INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
      VALUES (sp.id, auth.uid(), price, sp.balance, sp.balance + price, 'escrow_release', COALESCE(_note,'Admin released escrow'));
    END IF;
    UPDATE public.purchases SET status='approved', confirmed_at=now(), updated_at=now() WHERE id=_purchase_id;
  ELSE
    SELECT * INTO bp FROM public.profiles WHERE user_id = p.buyer_id;
    UPDATE public.profiles SET balance = balance + price WHERE id = bp.id;
    INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
    VALUES (bp.id, auth.uid(), price, bp.balance, bp.balance + price, 'escrow_refund', COALESCE(_note,'Admin refunded escrow'));
    UPDATE public.purchases SET status='rejected', updated_at=now() WHERE id=_purchase_id;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.notifications (user_id, type, title, body, link) VALUES
    (p.buyer_id, 'purchase_update',
     CASE WHEN _action='refund' THEN 'Refund issued' ELSE 'Dispute closed: payment released' END,
     COALESCE(_note,''), '/my-purchases');
  IF l.seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link) VALUES
      (l.seller_id, 'purchase_update',
       CASE WHEN _action='refund' THEN 'Dispute resolved: buyer refunded' ELSE 'Dispute closed: payment released' END,
       COALESCE(_note,''), '/my-listings');
  END IF;

  RETURN jsonb_build_object('ok',true);
END $function$;

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me public.profiles%ROWTYPE;
  hours_since numeric;
  reward_amount numeric := 2;
  prev_balance numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO me FROM public.profiles WHERE user_id = auth.uid();
  IF me.id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_profile');
  END IF;

  IF me.last_daily_claim_at IS NOT NULL THEN
    hours_since := EXTRACT(EPOCH FROM (now() - me.last_daily_claim_at)) / 3600.0;
    IF hours_since < 24 THEN
      RETURN jsonb_build_object('claimed', false, 'reason', 'waiting_period',
        'hours_remaining', GREATEST(0, 24 - hours_since));
    END IF;
  END IF;

  prev_balance := me.balance;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance = balance + reward_amount, last_daily_claim_at = now()
    WHERE id = me.id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.balance_transactions (
    profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note
  ) VALUES (
    me.id, me.user_id, reward_amount, prev_balance, prev_balance + reward_amount,
    'daily_reward', 'Daily login bonus'
  );

  RETURN jsonb_build_object('claimed', true, 'amount', reward_amount);
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_referral_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me public.profiles%ROWTYPE;
  hours_since numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO me FROM public.profiles WHERE user_id = auth.uid();
  IF me.id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_profile');
  END IF;
  IF me.referred_by IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_referrer');
  END IF;
  IF me.referral_reward_claimed THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  hours_since := EXTRACT(EPOCH FROM (now() - me.created_at)) / 3600.0;
  IF hours_since < 24 THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'waiting_period',
      'hours_remaining', GREATEST(0, 24 - hours_since));
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance = balance + 10, referral_reward_claimed = true
    WHERE id = me.id;
  UPDATE public.profiles
    SET balance = balance + 10
    WHERE id = me.referred_by;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  RETURN jsonb_build_object('claimed', true, 'amount', 10);
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _upi_id text, _account_holder text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me public.profiles%ROWTYPE;
  new_id UUID;
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

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET balance = balance - _amount WHERE id = me.id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.balance_transactions (
    profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note
  ) VALUES (
    me.id, me.user_id, -_amount, me.balance, me.balance - _amount,
    'withdrawal_request', 'Withdrawal requested to ' || _upi_id
  );

  INSERT INTO public.withdrawal_requests (user_id, amount, upi_id, account_holder)
  VALUES (auth.uid(), _amount, _upi_id, _account_holder)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$function$;