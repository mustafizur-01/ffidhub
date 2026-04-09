
-- Add winner_id column to tournaments
ALTER TABLE public.tournaments ADD COLUMN winner_id uuid DEFAULT NULL;

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;

-- Allow any authenticated user to create tournaments
CREATE POLICY "Authenticated users can create tournaments"
ON public.tournaments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Creators and admins can update their tournaments
CREATE POLICY "Creators and admins can update tournaments"
ON public.tournaments
FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- Creators and admins can delete tournaments
CREATE POLICY "Creators and admins can delete tournaments"
ON public.tournaments
FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));
