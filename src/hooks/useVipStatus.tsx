import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface VipStatus {
  tier: string;
  expires_at: string;
  boosts_quota: number;
  boosts_used: number;
  started_at: string | null;
}

export const useVipStatus = () => {
  const { user } = useAuth();
  const [vip, setVip] = useState<VipStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setVip(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_active_vip', { _user_id: user.id })
        .maybeSingle();
      if (error) throw error;
      setVip((data as VipStatus) ?? null);
    } catch (e) {
      console.error('Error loading VIP status:', e);
      setVip(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tier = (vip?.tier ?? '').toLowerCase();

  return {
    vip,
    loading,
    isVip: Boolean(vip),
    tier,
    isGold: tier === 'gold',
    isSilverPlus: tier === 'silver' || tier === 'gold',
    refresh,
  };
};

export default useVipStatus;
