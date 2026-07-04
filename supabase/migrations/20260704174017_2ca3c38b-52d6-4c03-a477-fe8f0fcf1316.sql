
-- Seller verification requests
CREATE TABLE public.seller_verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  ff_uid TEXT NOT NULL,
  in_game_name TEXT NOT NULL,
  experience TEXT,
  reason TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.seller_verification_requests TO authenticated;
GRANT ALL ON public.seller_verification_requests TO service_role;

ALTER TABLE public.seller_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification requests"
ON public.seller_verification_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own verification requests"
ON public.seller_verification_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verification requests"
ON public.seller_verification_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_seller_verification_requests_updated_at
BEFORE UPDATE ON public.seller_verification_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin approve/reject seller verification
CREATE OR REPLACE FUNCTION public.admin_approve_seller_verification(_req_id UUID, _approve BOOLEAN, _note TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r public.seller_verification_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RETURN jsonb_build_object('ok',false,'reason','not_admin');
  END IF;
  SELECT * INTO r FROM public.seller_verification_requests WHERE id = _req_id;
  IF r.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'reason','invalid_state'); END IF;

  IF _approve THEN
    PERFORM set_config('app.bypass_profile_guard','on',true);
    UPDATE public.profiles SET is_verified_seller = true WHERE user_id = r.user_id;
    PERFORM set_config('app.bypass_profile_guard','off',true);
    UPDATE public.seller_verification_requests SET status='approved', admin_note=_note, updated_at=now() WHERE id=_req_id;
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (r.user_id,'verification','Seller verification approved','You are now a verified seller!','/profile');
  ELSE
    UPDATE public.seller_verification_requests SET status='rejected', admin_note=_note, updated_at=now() WHERE id=_req_id;
    INSERT INTO public.notifications(user_id,type,title,body,link)
    VALUES (r.user_id,'verification','Seller verification rejected', COALESCE(_note,'Please try again'),'/seller-verify');
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

-- Add screenshot_url to vip_subscriptions
ALTER TABLE public.vip_subscriptions ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Update request_vip to accept screenshot
CREATE OR REPLACE FUNCTION public.request_vip(_tier text, _utr text, _screenshot_url text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  amt numeric;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  IF _tier NOT IN ('bronze','silver','gold') THEN RETURN jsonb_build_object('ok',false,'reason','invalid_tier'); END IF;
  IF _utr IS NULL OR length(trim(_utr)) < 6 THEN RETURN jsonb_build_object('ok',false,'reason','utr_required'); END IF;
  amt := CASE _tier WHEN 'bronze' THEN 99 WHEN 'silver' THEN 299 WHEN 'gold' THEN 799 END;
  INSERT INTO public.vip_subscriptions(user_id, tier, amount, utr_number, screenshot_url)
  VALUES (auth.uid(), _tier, amt, _utr, _screenshot_url)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('ok',true,'id',new_id);
END $function$;
