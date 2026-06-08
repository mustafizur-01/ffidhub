ALTER TABLE public.balance_transactions DROP CONSTRAINT IF EXISTS balance_transactions_transaction_type_check;
ALTER TABLE public.balance_transactions ADD CONSTRAINT balance_transactions_transaction_type_check
CHECK (transaction_type = ANY (ARRAY[
  'add','remove',
  'escrow_hold','escrow_release','escrow_refund',
  'purchase','sale','refund',
  'deposit','withdrawal','withdrawal_refund',
  'daily_reward','referral_reward',
  'tournament_entry','tournament_prize','tournament_refund',
  'admin_adjust'
]));