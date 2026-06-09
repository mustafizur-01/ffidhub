import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const OPTIONS = [
  { days: 1, cost: 20, label: '1 Day' },
  { days: 3, cost: 50, label: '3 Days' },
  { days: 7, cost: 120, label: '7 Days' },
];

export default function FeatureBoostDialog({ listingId, onBoosted }: { listingId: string; onBoosted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const { refreshProfile } = useAuth();

  const boost = async (days: number) => {
    setBusy(days);
    try {
      const { data, error } = await supabase.rpc('feature_listing', { _listing_id: listingId, _days: days });
      if (error) throw error;
      const r = data as any;
      if (r?.ok === false) throw new Error(r.reason);
      toast.success(`Listing featured for ${days} day${days > 1 ? 's' : ''}!`);
      await refreshProfile();
      onBoosted?.();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Boost failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary/10">
          <Sparkles className="h-4 w-4 mr-1" />
          Boost
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Feature this Listing
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Featured listings appear at the top with a premium FEATURED badge. Cost is deducted from your wallet.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {OPTIONS.map((o) => (
            <button
              key={o.days}
              onClick={() => boost(o.days)}
              disabled={busy !== null}
              className="card-gaming p-4 text-center hover:border-primary transition-all disabled:opacity-50"
            >
              <p className="font-display font-bold">{o.label}</p>
              <p className="text-primary font-display text-xl font-bold mt-2">₹{o.cost}</p>
              {busy === o.days && <Loader2 className="h-4 w-4 animate-spin mx-auto mt-1" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
