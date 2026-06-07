
-- 1) Notifications: restrict broad INSERT
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Self or admin can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Purchases: allow sellers to view purchases for their own listings
CREATE POLICY "Sellers can view purchases of own listings"
ON public.purchases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.id_listings l
    WHERE l.id = purchases.listing_id AND l.seller_id = auth.uid()
  )
);

-- 3) Storage id-screenshots: require path to start with user id folder
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;
CREATE POLICY "Users upload to own id-screenshots folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-screenshots'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Realtime messages: lock write access (postgres_changes works on the underlying table RLS regardless)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all realtime messages writes" ON realtime.messages;
CREATE POLICY "Deny all realtime messages writes"
ON realtime.messages
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
