
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text;

-- A listing is "locked" as soon as a buyer pays into escrow, not only after approval.
CREATE OR REPLACE FUNCTION public.is_listing_sold(_listing_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.purchases
    WHERE listing_id = _listing_id
      AND status IN ('pending_delivery','delivered','disputed','approved')
  )
$$;

-- Seller marks a held purchase as delivered
CREATE OR REPLACE FUNCTION public.mark_purchase_delivered(_purchase_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE p public.purchases%ROWTYPE; l public.id_listings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  SELECT * INTO p FROM public.purchases WHERE id = _purchase_id;
  IF p.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  SELECT * INTO l FROM public.id_listings WHERE id = p.listing_id;
  IF l.seller_id <> auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','not_seller'); END IF;
  IF p.status <> 'pending_delivery' THEN RETURN jsonb_build_object('ok',false,'reason','invalid_state'); END IF;

  UPDATE public.purchases SET status='delivered', delivered_at=now(), updated_at=now() WHERE id=_purchase_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p.buyer_id, 'purchase_update', 'Seller marked your order delivered',
          'Please confirm receipt to release the payment.',
          '/listing/' || p.listing_id::text);
  RETURN jsonb_build_object('ok',true);
END $$;

-- Buyer confirms receipt → release escrowed funds to seller
CREATE OR REPLACE FUNCTION public.confirm_purchase(_purchase_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p public.purchases%ROWTYPE; l public.id_listings%ROWTYPE;
  sp public.profiles%ROWTYPE; price numeric;
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

  IF l.seller_id IS NOT NULL THEN
    SELECT * INTO sp FROM public.profiles WHERE user_id = l.seller_id;
    UPDATE public.profiles SET balance = balance + price WHERE id = sp.id;
    INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
    VALUES (sp.id, auth.uid(), price, sp.balance, sp.balance + price, 'escrow_release', 'Escrow released for purchase ' || p.id::text);
  END IF;

  UPDATE public.purchases
    SET status='approved', confirmed_at=now(), updated_at=now()
    WHERE id=_purchase_id;

  IF l.seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (l.seller_id, 'purchase_update', 'Payment released',
            'Buyer confirmed receipt. Funds have been credited to your wallet.',
            '/my-listings');
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

-- Buyer opens dispute
CREATE OR REPLACE FUNCTION public.dispute_purchase(_purchase_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE p public.purchases%ROWTYPE; l public.id_listings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  SELECT * INTO p FROM public.purchases WHERE id = _purchase_id;
  IF p.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  IF p.buyer_id <> auth.uid() THEN RETURN jsonb_build_object('ok',false,'reason','not_buyer'); END IF;
  IF p.status NOT IN ('pending_delivery','delivered') THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_state');
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RETURN jsonb_build_object('ok',false,'reason','reason_required');
  END IF;

  UPDATE public.purchases
    SET status='disputed', disputed_at=now(), dispute_reason=_reason, updated_at=now()
    WHERE id=_purchase_id;

  SELECT * INTO l FROM public.id_listings WHERE id = p.listing_id;
  IF l.seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (l.seller_id, 'purchase_update', 'Dispute opened on your sale',
            'A buyer has opened a dispute. Admin will review.',
            '/my-listings');
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

-- Admin resolves dispute: action = 'release' (pay seller) | 'refund' (return to buyer)
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(_purchase_id uuid, _action text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p public.purchases%ROWTYPE; l public.id_listings%ROWTYPE;
  bp public.profiles%ROWTYPE; sp public.profiles%ROWTYPE; price numeric;
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

  IF _action = 'release' THEN
    IF l.seller_id IS NOT NULL THEN
      SELECT * INTO sp FROM public.profiles WHERE user_id = l.seller_id;
      UPDATE public.profiles SET balance = balance + price WHERE id = sp.id;
      INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
      VALUES (sp.id, auth.uid(), price, sp.balance, sp.balance + price, 'escrow_release', COALESCE(_note,'Admin released escrow'));
    END IF;
    UPDATE public.purchases SET status='approved', confirmed_at=now(), updated_at=now() WHERE id=_purchase_id;
  ELSE -- refund
    SELECT * INTO bp FROM public.profiles WHERE user_id = p.buyer_id;
    UPDATE public.profiles SET balance = balance + price WHERE id = bp.id;
    INSERT INTO public.balance_transactions (profile_id, admin_id, amount, previous_balance, new_balance, transaction_type, note)
    VALUES (bp.id, auth.uid(), price, bp.balance, bp.balance + price, 'escrow_refund', COALESCE(_note,'Admin refunded escrow'));
    UPDATE public.purchases SET status='rejected', updated_at=now() WHERE id=_purchase_id;
  END IF;

  -- Notify both sides
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
END $$;
