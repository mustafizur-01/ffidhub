
-- Favorites table
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_listing ON public.favorites(listing_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all favorites"
  ON public.favorites FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can add favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Daily reward tracking column on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_daily_claim_at TIMESTAMP WITH TIME ZONE;

-- Claim daily reward: ₹2 every 24h
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      RETURN jsonb_build_object(
        'claimed', false,
        'reason', 'waiting_period',
        'hours_remaining', GREATEST(0, 24 - hours_since)
      );
    END IF;
  END IF;

  prev_balance := me.balance;

  UPDATE public.profiles
    SET balance = balance + reward_amount,
        last_daily_claim_at = now()
    WHERE id = me.id;

  INSERT INTO public.balance_transactions (
    profile_id, admin_id, amount, previous_balance, new_balance,
    transaction_type, note
  ) VALUES (
    me.id, me.user_id, reward_amount, prev_balance, prev_balance + reward_amount,
    'daily_reward', 'Daily login bonus'
  );

  RETURN jsonb_build_object('claimed', true, 'amount', reward_amount);
END;
$$;
