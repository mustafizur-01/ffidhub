import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Crown, Check, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const TIERS = [
  {
    key: 'bronze',
    name: 'Bronze',
    price: 99,
    color: 'from-amber-700 to-amber-500',
    perks: ['2 free boosts/month', 'VIP badge on profile', 'Priority support'],
  },
  {
    key: 'silver',
    name: 'Silver',
    price: 299,
    color: 'from-slate-400 to-slate-200',
    perks: ['5 free boosts/month', 'Featured seller spotlight', 'Lower withdrawal fees', 'VIP badge'],
  },
  {
    key: 'gold',
    name: 'Gold',
    price: 799,
    color: 'from-yellow-400 to-yellow-200',
    perks: ['Unlimited boosts', 'Top placement in listings', 'Zero withdrawal fees', 'Gold VIP badge', 'Early access to features'],
    featured: true,
  },
];

const PHONEPE_NUMBER = '8001234567';

export default function VipPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<{ tier: string; expires_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.rpc('get_active_vip', { _user_id: user.id });
      const row = Array.isArray(data) ? data[0] : null;
      setActive(row ? { tier: row.tier, expires_at: row.expires_at } : null);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-10 max-w-5xl">
        <div className="text-center mb-10">
          <Crown className="h-12 w-12 text-yellow-400 mx-auto mb-3 drop-shadow-[0_0_12px_rgba(250,200,0,0.6)]" />
          <h1 className="font-display text-4xl md:text-5xl font-black text-gradient">VIP MEMBERSHIP</h1>
          <p className="text-muted-foreground mt-2">Boost your trades. Stand out. Earn more.</p>
        </div>

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        ) : active ? (
          <div className="card-gaming p-6 border-yellow-500/40 mb-8 text-center">
            <p className="text-sm uppercase tracking-wider text-muted-foreground">Your active tier</p>
            <p className="font-display text-3xl font-bold text-yellow-400 capitalize">{active.tier}</p>
            <p className="text-xs text-muted-foreground mt-1">Expires {new Date(active.expires_at).toLocaleDateString()}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((t) => (
            <div
              key={t.key}
              className={`card-gaming p-6 relative overflow-hidden ${t.featured ? 'border-yellow-500/60 glow-subtle' : ''}`}
            >
              {t.featured && (
                <div className="absolute top-3 right-3 ribbon-featured">POPULAR</div>
              )}
              <div className={`inline-block px-3 py-1 rounded font-display font-bold text-black bg-gradient-to-r ${t.color} mb-3`}>
                {t.name.toUpperCase()}
              </div>
              <p className="font-display text-4xl font-black">₹{t.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
              <ul className="space-y-2 my-5 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex gap-2"><Check className="h-4 w-4 text-gaming-success shrink-0 mt-0.5" />{p}</li>
                ))}
              </ul>
              <VipPurchaseDialog tier={t.key} amount={t.price} disabled={!!active} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VipPurchaseDialog({ tier, amount, disabled }: { tier: string; amount: number; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (utr.trim().length < 6) {
      toast.error('Enter valid UTR/Transaction ID');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('request_vip', { _tier: tier, _utr: utr.trim() });
      if (error) throw error;
      const r = data as any;
      if (r?.ok === false) throw new Error(r.reason);
      toast.success('VIP request submitted! Admin will activate shortly.');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gaming" className="w-full" disabled={disabled}>
          {disabled ? 'Already VIP' : `Get ${tier}`}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display capitalize">Activate {tier} VIP — ₹{amount}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="card-gaming p-4">
            <p className="text-sm font-medium mb-2">1. Pay ₹{amount} to PhonePe</p>
            <div className="flex items-center justify-between bg-background/50 rounded p-2">
              <span className="font-mono font-bold">{PHONEPE_NUMBER}</span>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(PHONEPE_NUMBER); toast.success('Copied'); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">2. Enter Transaction UTR</label>
            <Input value={utr} onChange={(e) => setUtr(e.target.value)} className="input-gaming mt-1" placeholder="12-digit UTR" />
          </div>
          <Button variant="gaming" className="w-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for Approval'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
