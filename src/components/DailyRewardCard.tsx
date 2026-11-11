import { useEffect, useState } from 'react';
import { Gift, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DAILY_REWARD_AMOUNT,
  DAILY_REWARD_COOLDOWN_HOURS,
  getDailyRewardHoursRemaining,
} from '@/components/dailyRewardRules';

const formatRemaining = (hours: number) => {
  const totalSeconds = Math.max(0, Math.floor(hours * 3600));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const DailyRewardCard = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    const last = (profile as any).last_daily_claim_at as string | null | undefined;
    const lastClaimAt = last ?? null;
    const tick = () => {
      setHoursRemaining(getDailyRewardHoursRemaining(lastClaimAt));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [profile]);

  const claim = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward' as any);
      if (error) throw error;
      const result = data as { claimed: boolean; reason?: string; amount?: number; hours_remaining?: number };
      if (result?.claimed) {
        toast.success(`+₹${result.amount} added to your wallet!`);
        await refreshProfile();
      } else if (result?.reason === 'waiting_period') {
        toast.info('Come back later to claim your bonus.');
        setHoursRemaining(result.hours_remaining ?? null);
      } else {
        toast.error('Could not claim reward.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim');
    } finally {
      setClaiming(false);
    }
  };

  const ready = hoursRemaining !== null && hoursRemaining <= 0;

  return (
    <div className="card-gaming p-6 space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        Daily Bonus
      </h2>

      <div className="bg-secondary/50 rounded-lg p-4 text-center">
        <Sparkles className="h-8 w-8 mx-auto text-primary mb-2" />
        <p className="font-display text-3xl font-bold text-gradient">₹{DAILY_REWARD_AMOUNT}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Free credit every {DAILY_REWARD_COOLDOWN_HOURS} hours
        </p>
      </div>

      {ready ? (
        <Button variant="gaming" className="w-full" onClick={claim} disabled={claiming}>
          {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          {claiming ? 'Claiming...' : 'Claim Now'}
        </Button>
      ) : (
        <Button variant="outline" className="w-full" disabled>
          Next claim in {hoursRemaining !== null ? formatRemaining(hoursRemaining) : '--:--:--'}
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Come back after 48 hours to claim your next bonus.
      </p>
    </div>
  );
};

export default DailyRewardCard;
