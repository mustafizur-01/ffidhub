import { useEffect, useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  targetUserId: string;
}

const BlockUserButton = ({ targetUserId }: Props) => {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.id === targetUserId) return;
    supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetUserId)
      .maybeSingle()
      .then(({ data }) => setBlocked(!!data));
  }, [user, targetUserId]);

  if (!user || user.id === targetUserId) return null;

  const toggle = async () => {
    setLoading(true);
    if (blocked) {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId);
      if (error) toast.error(error.message);
      else {
        setBlocked(false);
        toast.success('User unblocked');
      }
    } else {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: targetUserId });
      if (error) toast.error(error.message);
      else {
        setBlocked(true);
        toast.success('User blocked. Their listings will be hidden.');
      }
    }
    setLoading(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
      {blocked ? 'Unblock' : 'Block'}
    </Button>
  );
};

export default BlockUserButton;
