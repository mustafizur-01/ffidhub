import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setBlocked(new Set());
      return;
    }
    supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .then(({ data }) => {
        setBlocked(new Set((data || []).map((b: any) => b.blocked_id)));
      });
  }, [user]);

  return blocked;
};
