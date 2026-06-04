
DROP POLICY IF EXISTS "Users receive own message events" ON realtime.messages;
-- Keep RLS enabled on realtime.messages; absence of permissive policies
-- means broadcast/presence channels are locked down by default.
-- postgres_changes events still flow because they respect RLS on public.messages.
