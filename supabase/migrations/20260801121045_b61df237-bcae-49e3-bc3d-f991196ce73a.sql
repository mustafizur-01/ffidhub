CREATE OR REPLACE FUNCTION public.notify_admins_on_new_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u_email text;
BEGIN
  SELECT email INTO u_email FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT ur.user_id,
         'admin_deposit',
         'New deposit request: ₹' || NEW.amount,
         COALESCE(u_email, 'A user') || ' submitted UTR ' || NEW.utr_number ||
           CASE WHEN NEW.screenshot_url IS NOT NULL THEN ' with payment screenshot' ELSE ' (no screenshot)' END,
         '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::app_role;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_new_deposit ON public.deposit_requests;
CREATE TRIGGER trg_notify_admins_on_new_deposit
AFTER INSERT ON public.deposit_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_new_deposit();

ALTER TABLE public.deposit_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;