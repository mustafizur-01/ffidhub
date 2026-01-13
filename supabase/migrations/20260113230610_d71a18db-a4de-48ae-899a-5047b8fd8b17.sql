-- Allow admins to delete messages
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));