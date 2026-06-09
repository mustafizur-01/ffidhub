import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, Check, X, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';

interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  amount: number;
  message: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function SellerOffersList() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterAmt, setCounterAmt] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const fetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
    setOffers((data as Offer[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [user]);

  const act = async (offerId: string, action: string, counter?: number) => {
    setBusy(offerId);
    try {
      const { data, error } = await supabase.rpc('respond_offer', {
        _offer_id: offerId, _action: action, _counter: counter ?? null,
      });
      if (error) throw error;
      const r = data as any;
      if (r?.ok === false) throw new Error(r.reason);
      toast.success(`Offer ${action}ed`);
      fetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;

  if (offers.length === 0) {
    return (
      <div className="card-gaming p-8 text-center">
        <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No offers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((o) => (
        <div key={o.id} className="card-gaming p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-xl font-bold text-primary">₹{o.amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Status: <span className="font-medium capitalize">{o.status}</span> • Expires {new Date(o.expires_at).toLocaleDateString()}
              </p>
            </div>
            <a href={`/listing/${o.listing_id}`} className="text-xs text-accent hover:underline">View listing</a>
          </div>
          {o.message && <p className="text-sm bg-background/50 rounded p-2">{o.message}</p>}
          {o.status === 'pending' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="gaming" onClick={() => act(o.id, 'accept')} disabled={busy === o.id}>
                <Check className="h-4 w-4" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => act(o.id, 'reject')} disabled={busy === o.id}>
                <X className="h-4 w-4" /> Reject
              </Button>
              <div className="flex gap-1 items-center">
                <Input
                  type="number"
                  placeholder="Counter ₹"
                  className="input-gaming w-24 h-9"
                  value={counterAmt[o.id] || ''}
                  onChange={(e) => setCounterAmt({ ...counterAmt, [o.id]: parseInt(e.target.value) || 0 })}
                />
                <Button size="sm" variant="outline"
                  onClick={() => act(o.id, 'counter', counterAmt[o.id])}
                  disabled={busy === o.id || !counterAmt[o.id]}>
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
