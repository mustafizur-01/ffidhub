-- Create balance_transactions table to track all admin balance changes
CREATE TABLE public.balance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'remove')),
  previous_balance NUMERIC NOT NULL,
  new_balance NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- Only admins can view transactions
CREATE POLICY "Admins can view all transactions"
ON public.balance_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert transactions
CREATE POLICY "Admins can create transactions"
ON public.balance_transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_balance_transactions_profile_id ON public.balance_transactions(profile_id);
CREATE INDEX idx_balance_transactions_created_at ON public.balance_transactions(created_at DESC);