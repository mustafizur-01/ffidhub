
-- ============================================================
-- 1. id_listings: revoke sensitive columns from public roles
-- ============================================================
REVOKE SELECT ON public.id_listings FROM anon, authenticated;
GRANT SELECT (
  id, id_level, login_method, key_items, price, image_url,
  is_email_binded, created_at, updated_at, seller_id
) ON public.id_listings TO anon, authenticated;

-- ============================================================
-- 2. tournaments: revoke room credentials from public roles
-- ============================================================
REVOKE SELECT ON public.tournaments FROM anon, authenticated;
GRANT SELECT (
  id, title, description, game_mode, game_name, max_players,
  entry_fee, prize_pool, start_time, status, image_url,
  created_by, winner_id, created_at, updated_at
) ON public.tournaments TO anon, authenticated;

-- Helper: only participants / creator / admin can fetch room creds
CREATE OR REPLACE FUNCTION public.get_tournament_credentials(_tournament_id uuid)
RETURNS TABLE(room_id text, room_password text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.room_id, t.room_password
  FROM public.tournaments t
  WHERE t.id = _tournament_id
    AND (
      t.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.tournament_participants tp
        WHERE tp.tournament_id = _tournament_id
          AND tp.user_id = auth.uid()
      )
    );
$$;

-- ============================================================
-- 3. profiles: prevent self-update of privileged fields
-- ============================================================
DROP POLICY IF EXISTS "Users can update own profile except balance" ON public.profiles;

CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
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

DROP TRIGGER IF EXISTS profiles_prevent_privileged_update ON public.profiles;
CREATE TRIGGER profiles_prevent_privileged_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privileged_update();

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. verified_members: restrict to own record
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view their member info" ON public.verified_members;

CREATE POLICY "Users can view own member record"
ON public.verified_members
FOR SELECT
TO authenticated
USING (
  email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================
-- 5. tournament_participants: restrict to authenticated only
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view participant count" ON public.tournament_participants;

CREATE POLICY "Authenticated users can view participants"
ON public.tournament_participants
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 6. balance_transactions: users can view their own
-- ============================================================
CREATE POLICY "Users can view own transactions"
ON public.balance_transactions
FOR SELECT
TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 7. messages realtime: restrict to participants
-- ============================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users receive own message events" ON realtime.messages;
CREATE POLICY "Users receive own message events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- ============================================================
-- 8. storage: restrict id-screenshots listing to owner
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view screenshots" ON storage.objects;

CREATE POLICY "Users list own id-screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'id-screenshots' AND owner = auth.uid());

CREATE POLICY "Admins list all id-screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'id-screenshots' AND public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 9. Revoke EXECUTE on internal helper functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privileged_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_verified_seller(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_listing_sold(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;

-- User-callable RPCs: keep authenticated only
REVOKE EXECUTE ON FUNCTION public.claim_referral_reward() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral_reward() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_daily_reward() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_listing_credentials(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_credentials(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_tournament_credentials(uuid) TO authenticated;
