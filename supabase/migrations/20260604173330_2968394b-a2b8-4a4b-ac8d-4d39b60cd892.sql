
-- Notification on new message
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.receiver_id,
    'message',
    'New message',
    LEFT(NEW.content, 100),
    '/listing/' || NEW.listing_id::text
  );
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_message ON public.messages;
CREATE TRIGGER trg_notify_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- Notification on new purchase (notify seller)
CREATE OR REPLACE FUNCTION public.notify_on_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  seller UUID;
BEGIN
  SELECT seller_id INTO seller FROM public.id_listings WHERE id = NEW.listing_id;
  IF seller IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      seller,
      'purchase',
      'New purchase request',
      'A buyer wants to purchase your listing',
      '/my-listings'
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_on_purchase() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_purchase ON public.purchases;
CREATE TRIGGER trg_notify_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_purchase();

-- Notification on purchase status change (notify buyer)
CREATE OR REPLACE FUNCTION public.notify_on_purchase_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.buyer_id,
      'purchase_update',
      CASE WHEN NEW.status = 'approved' THEN 'Purchase approved' 
           WHEN NEW.status = 'rejected' THEN 'Purchase rejected' 
           ELSE 'Purchase updated' END,
      'Your purchase status is now: ' || NEW.status,
      '/listing/' || NEW.listing_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_on_purchase_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_purchase_update ON public.purchases;
CREATE TRIGGER trg_notify_on_purchase_update
  AFTER UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_purchase_update();

-- Notification on deposit status change
CREATE OR REPLACE FUNCTION public.notify_on_deposit_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'deposit',
      'Deposit ' || NEW.status,
      'Your ₹' || NEW.amount || ' deposit was ' || NEW.status,
      '/add-money'
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_on_deposit_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_deposit_update ON public.deposit_requests;
CREATE TRIGGER trg_notify_on_deposit_update
  AFTER UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_deposit_update();

-- Notification on withdrawal status change
CREATE OR REPLACE FUNCTION public.notify_on_withdrawal_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'withdrawal',
      'Withdrawal ' || NEW.status,
      'Your ₹' || NEW.amount || ' withdrawal was ' || NEW.status,
      '/withdraw'
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_on_withdrawal_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_on_withdrawal_update ON public.withdrawal_requests;
CREATE TRIGGER trg_notify_on_withdrawal_update
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_withdrawal_update();
