-- 1. Update signup handler: do NOT give referral reward immediately
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_profile_id UUID;
  new_referral_code TEXT;
  referral_code_from_meta TEXT;
BEGIN
  new_referral_code := public.generate_referral_code();
  referral_code_from_meta := NEW.raw_user_meta_data->>'referral_code';

  IF referral_code_from_meta IS NOT NULL THEN
    SELECT id INTO referrer_profile_id
    FROM public.profiles
    WHERE referral_code = referral_code_from_meta;
  END IF;

  -- Create profile (no instant bonus)
  INSERT INTO public.profiles (user_id, email, referral_code, referred_by)
  VALUES (NEW.id, NEW.email, new_referral_code, referrer_profile_id);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- 2. Claim function: pays both sides only after 24h since signup
CREATE OR REPLACE FUNCTION public.claim_referral_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'waiting_period',
      'hours_remaining', GREATEST(0, 24 - hours_since)
    );
  END IF;

  -- Credit both sides
  UPDATE public.profiles
    SET balance = balance + 10, referral_reward_claimed = true
    WHERE id = me.id;

  UPDATE public.profiles
    SET balance = balance + 10
    WHERE id = me.referred_by;

  RETURN jsonb_build_object('claimed', true, 'amount', 10);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral_reward() TO authenticated;