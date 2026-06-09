import { useEffect, useState } from 'react';
import { Gavel, Clock, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface AuctionData {
  id: string;
  start_price: number;
  current_bid: number | null;
  current_bidder: string | null;
  bid_count: number;
  ends_at: string;
  min_increment: number;
  status: string;
  seller_id: string;
}

export default function AuctionBidPanel({ listingId, onUpdate }: { listingId: string; onUpdate?: () => void }) {
  const { user, refreshProfile } = useAuth();
  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchAuction = async () => {
    const { data } = await supabase
      .from('auctions')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle();
    setAuction(data as AuctionData | null);
    if (data) {
      const min = (data.current_bid ?? 0) + (data.current_bid ? data.min_increment : 0);
      setBid(Math.max(min, data.start_price));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAuction();
    const channel = supabase
      .channel(`auction-${listingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions', filter: `listing_id=eq.${listingId}` }, () => fetchAuction())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [listingId]);

  if (loading) return null;
  if (!auction) return null;

  const endsIn = new Date(auction.ends_at).getTime() - now;
  const hours = Math.floor(endsIn / 3600000);
  const mins = Math.floor((endsIn % 3600000) / 60000);
  const secs = Math.floor((endsIn % 60000) / 1000);
  const ended = endsIn <= 0;
  const isOwn = user?.id === auction.seller_id;
  const isHighBidder = user?.id === auction.current_bidder;
  const minRequired = (auction.current_bid ?? 0) + (auction.current_bid ? auction.min_increment : 0);

  const placeBid = async () => {
    if (!user) { toast.error('Login first'); return; }
    if (bid < Math.max(minRequired, auction.start_price)) {
      toast.error(`Minimum bid ₹${Math.max(minRequired, auction.start_price)}`);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('place_bid', { _auction_id: auction.id, _amount: bid });
      if (error) throw error;
      const r = data as any;
      if (r?.ok === false) throw new Error(r.reason || 'Bid failed');
      toast.success('Bid placed! Funds held in escrow.');
      await refreshProfile();
      onUpdate?.();
    } catch (e: any) {
      toast.error(e.message || 'Bid failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-gaming p-6 border-accent/40 space-y-4 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />
      <div className="flex items-center gap-2 relative">
        <Gavel className="h-5 w-5 text-accent" />
        <h3 className="font-display text-lg font-bold">LIVE AUCTION</h3>
        <span className="ml-auto badge-method bg-accent/20 text-accent">{auction.bid_count} bids</span>
      </div>

      <div className="grid grid-cols-2 gap-3 relative">
        <div className="bg-background/50 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Bid</p>
          <p className="font-display text-2xl font-bold text-accent">
            ₹{(auction.current_bid ?? auction.start_price).toLocaleString()}
          </p>
        </div>
        <div className="bg-background/50 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Ends In
          </p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {ended ? 'ENDED' : `${hours}h ${mins}m ${secs}s`}
          </p>
        </div>
      </div>

      {isHighBidder && (
        <div className="bg-gaming-success/10 border border-gaming-success/30 rounded-lg p-2 text-xs text-gaming-success text-center font-bold">
          🏆 YOU'RE THE HIGHEST BIDDER
        </div>
      )}

      {!ended && !isOwn && (
        <div className="space-y-2 relative">
          <div className="flex gap-2">
            <Input
              type="number"
              value={bid}
              onChange={(e) => setBid(parseInt(e.target.value) || 0)}
              min={Math.max(minRequired, auction.start_price)}
              className="input-gaming"
            />
            <Button variant="gaming" onClick={placeBid} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bid'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Min: ₹{Math.max(minRequired, auction.start_price).toLocaleString()} • Held from wallet on bid
          </p>
        </div>
      )}

      {isOwn && (
        <p className="text-xs text-muted-foreground text-center">You can't bid on your own auction</p>
      )}
    </div>
  );
}
