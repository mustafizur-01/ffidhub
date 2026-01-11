-- Add UPDATE policy for sellers to update their own listings
CREATE POLICY "Sellers can update own listings"
ON public.id_listings
FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);