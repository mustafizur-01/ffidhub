import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { Gavel, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuctionRow {
  id: string;
  listing_id: string;
  start_price: number;
  current_bid: number | null;
  bid_count: number;
  ends_at: string;
  status: string;
  id_listings: {
    id_level: number;
    login_method: string;
    image_url: string | null;
    key_items: string;
  } | null;
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('auctions')
        .select('id, listing_id, start_price, current_bid, bid_count, ends_at, status, id_listings(id_level, login_method, image_url, key_items)')
        .eq('status', 'active')
        .order('ends_at', { ascending: true });
      setAuctions((data as any) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Gavel className="h-8 w-8 text-accent" />
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient">LIVE AUCTIONS</h1>
            <p className="text-sm text-muted-foreground">Bid in real-time. Highest bid wins.</p>
          </div>
        </div>

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-20" />
        ) : auctions.length === 0 ? (
          <div className="card-gaming p-12 text-center">
            <Gavel className="h-16 w-16 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No live auctions right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.map((a) => {
              const remaining = new Date(a.ends_at).getTime() - now;
              const h = Math.floor(remaining / 3600000);
              const m = Math.floor((remaining % 3600000) / 60000);
              const s = Math.floor((remaining % 60000) / 1000);
              return (
                <Link key={a.id} to={`/listing/${a.listing_id}`}>
                  <div className="card-gaming card-gaming-hover overflow-hidden border-accent/30">
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {a.id_listings?.image_url ? (
                        <img src={a.id_listings.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-4xl text-muted-foreground/40">FF</div>
                      )}
                      <div className="absolute top-2 left-2 badge-level">LVL {a.id_listings?.id_level}</div>
                      <div className="absolute top-2 right-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded font-bold flex items-center gap-1 animate-pulse">
                        <Clock className="h-3 w-3" /> {h}h {m}m {s}s
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground line-clamp-1">{a.id_listings?.key_items}</p>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Current Bid</p>
                          <p className="font-display text-xl font-bold text-accent">
                            ₹{(a.current_bid ?? a.start_price).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{a.bid_count} bids</span>
                      </div>
                      <Button variant="gaming" size="sm" className="w-full">Place Bid</Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
