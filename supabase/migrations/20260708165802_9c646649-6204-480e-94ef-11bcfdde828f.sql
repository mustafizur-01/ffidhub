-- Fix VIP wallet purchase: allow 'vip_purchase' and 'sale_commission' types
ALTER TABLE public.balance_transactions DROP CONSTRAINT balance_transactions_transaction_type_check;
ALTER TABLE public.balance_transactions ADD CONSTRAINT balance_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY['add','remove','escrow_hold','escrow_release','escrow_refund','purchase','sale','refund','deposit','withdrawal','withdrawal_request','withdrawal_refund','daily_reward','referral_reward','tournament_entry','tournament_prize','tournament_refund','bid_hold','bid_refund','bid_win','offer_accept','feature_boost','vip_payment','vip_purchase','admin_adjust','sale_commission']));

-- Update confirm_purchase to deduct 5% platform commission from seller payout
CREATE OR REPLACE FUNCTION public.confirm_purchase(_purchase_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.purchases%ROWTYPE; l public.id_listings%ROWTYPE;
  sp public.profiles%ROWTYPE; price numeric; fee numeric; net numeric;
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
  fee := ROUND(price * 0.05, 2);
  net := price - fee;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  IF l.seller_id IS NOT NULL THEN
    SELECT * INTO sp FROM public.profiles WHERE user_id = l.seller_id;
    UPDATE public.profiles SET balance = balance + net WHERE id = sp.id;
    INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
    VALUES (sp.id, auth.uid(), net, sp.balance, sp.balance + net, 'escrow_release', 'Sale payout for purchase ' || p.id::text || ' (net after 5% fee)');
    INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
    VALUES (sp.id, auth.uid(), -fee, sp.balance + net, sp.balance + net, 'sale_commission', '5% platform commission on sale ' || p.id::text);
  END IF;

  UPDATE public.purchases
    SET status='approved', confirmed_at=now(), updated_at=now()
    WHERE id=_purchase_id;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  IF l.seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (l.seller_id, 'purchase_update', 'Payment released',
            'Buyer confirmed receipt. \u20b9' || net || ' credited (after 5% fee).',
            '/my-listings');
  END IF;
  RETURN jsonb_build_object('ok',true,'gross',price,'fee',fee,'net',net);
END $function$;

-- Same 5% fee on admin-released escrow
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(_purchase_id uuid, _action text, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.purchases%ROWTYPE; l public.id_listings%ROWTYPE;
  bp public.profiles%ROWTYPE; sp public.profiles%ROWTYPE; price numeric; fee numeric; net numeric;
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
  fee := ROUND(price * 0.05, 2);
  net := price - fee;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  IF _action = 'release' THEN
    IF l.seller_id IS NOT NULL THEN
      SELECT * INTO sp FROM public.profiles WHERE user_id = l.seller_id;
      UPDATE public.profiles SET balance = balance + net WHERE id = sp.id;
      INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
      VALUES (sp.id, auth.uid(), net, sp.balance, sp.balance + net, 'escrow_release', COALESCE(_note,'Admin released escrow') || ' (net after 5% fee)');
      INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
      VALUES (sp.id, auth.uid(), -fee, sp.balance + net, sp.balance + net, 'sale_commission', '5% platform commission on sale ' || p.id::text);
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