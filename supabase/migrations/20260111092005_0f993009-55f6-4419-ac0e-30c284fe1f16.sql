-- Add DELETE policy for sellers to delete their own listings
CREATE POLICY "Sellers can delete own listings"
ON public.id_listings
FOR DELETE
USING (auth.uid() = seller_id);