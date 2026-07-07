
CREATE OR REPLACE FUNCTION public.purchase_vip_with_balance(_tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amt numeric;
  q int;
  me public.profiles%ROWTYPE;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  IF _tier NOT IN ('bronze','silver','gold') THEN RETURN jsonb_build_object('ok',false,'reason','invalid_tier'); END IF;

  amt := CASE _tier WHEN 'bronze' THEN 99 WHEN 'silver' THEN 299 WHEN 'gold' THEN 799 END;
  q   := CASE _tier WHEN 'bronze' THEN 2 WHEN 'silver' THEN 5 WHEN 'gold' THEN 999999 END;

  SELECT * INTO me FROM public.profiles WHERE user_id = auth.uid();
  IF me.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','no_profile'); END IF;
  IF me.balance < amt THEN RETURN jsonb_build_object('ok',false,'reason','insufficient_balance'); END IF;

  IF EXISTS (SELECT 1 FROM public.vip_subscriptions WHERE user_id = auth.uid() AND status='active' AND expires_at > now()) THEN
    RETURN jsonb_build_object('ok',false,'reason','already_active');
  END IF;

  PERFORM set_config('app.bypass_profile_guard','on',true);
  UPDATE public.profiles SET balance = balance - amt WHERE id = me.id;
  PERFORM set_config('app.bypass_profile_guard','off',true);

  INSERT INTO public.balance_transactions(profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
  VALUES (me.id, me.user_id, -amt, me.balance, me.balance - amt, 'vip_purchase', 'VIP '||_tier||' purchased from wallet');

  INSERT INTO public.vip_subscriptions(user_id, tier, amount, utr_number, status, started_at, expires_at, boosts_quota, boosts_used, admin_note)
  VALUES (auth.uid(), _tier, amt, 'WALLET', 'active', now(), now() + interval '30 days', q, 0, 'Paid from wallet balance')
  RETURNING id INTO new_id;

  INSERT INTO public.notifications(user_id,type,title,body,link)
  VALUES (auth.uid(),'vip','VIP activated','Welcome to '||_tier||' tier!','/vip');

  RETURN jsonb_build_object('ok',true,'id',new_id);
END $$;

GRANT EXECUTE ON FUNCTION public.purchase_vip_with_balance(text) TO authenticated;
