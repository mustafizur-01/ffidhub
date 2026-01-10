-- Fix function search path for generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'FF-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Fix overly permissive RLS policies on id_listings
DROP POLICY IF EXISTS "Anyone can create listings" ON public.id_listings;

CREATE POLICY "Authenticated users can create listings"
  ON public.id_listings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = seller_id);

-- Fix overly permissive RLS policies on verified_members  
DROP POLICY IF EXISTS "Anyone can register as member" ON public.verified_members;
DROP POLICY IF EXISTS "Anyone can view their own member info by email" ON public.verified_members;

CREATE POLICY "Authenticated users can register as member"
  ON public.verified_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view their member info"
  ON public.verified_members FOR SELECT
  USING (auth.uid() IS NOT NULL);