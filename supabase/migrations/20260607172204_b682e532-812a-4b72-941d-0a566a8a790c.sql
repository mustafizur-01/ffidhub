CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role / server-side (no auth.uid) and admins may update privileged fields
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
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
$$;