DROP POLICY IF EXISTS "Anyone can view auctions" ON public.auctions;
CREATE POLICY "Public can view active auctions"
ON public.auctions
FOR SELECT
TO public, authenticated
USING (
  status = 'active'
  OR seller_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Anyone authenticated can view bids" ON public.bids;
CREATE POLICY "Users can view own bids"
ON public.bids
FOR SELECT
TO authenticated
USING (
  bidder_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.tournament_participants;
CREATE POLICY "Users can view own or managed tournament participants"
ON public.tournament_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = tournament_participants.tournament_id
      AND t.created_by = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.get_tournament_participant_count(_tournament_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COUNT(*)::integer
  FROM public.tournament_participants
  WHERE tournament_id = _tournament_id;
$function$;

REVOKE ALL ON FUNCTION public.get_tournament_participant_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tournament_participant_count(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can read app builds" ON storage.objects;