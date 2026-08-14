import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown,
  Sparkles,
  Rocket,
  Percent,
  Headphones,
  Lock,
  Gift,
  TrendingUp,
  Loader2,
  ArrowRight,
  Wand2,
  ShieldCheck,
  Download,
  Flame,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useVipStatus } from '@/hooks/useVipStatus';
import { supabase } from '@/integrations/supabase/client';
import ListingCard from '@/components/ListingCard';

const TIER_META: Record<string, { label: string; accent: string; cashback: number; feeCut: string }> = {
  bronze: { label: 'Bronze VIP', accent: 'text-amber-500', cashback: 1, feeCut: 'Reduced withdrawal fee' },
  silver: { label: 'Silver VIP', accent: 'text-slate-300', cashback: 2, feeCut: 'Lower withdrawal fee' },
  gold: { label: 'Gold VIP', accent: 'text-yellow-400', cashback: 3, feeCut: 'Lowest withdrawal fee' },
};

const PERKS = [
  { icon: Rocket, title: 'Free listing boosts', desc: 'Bronze 2 · Silver 5 · Gold unlimited every month.' },
  { icon: Flame, title: 'Top placement', desc: 'Gold VIP listings pin to the top of the home feed.' },
  { icon: Percent, title: 'Lower fees', desc: 'Reduced withdrawal fees based on your tier.' },
  { icon: Wand2, title: 'Unlimited AI tools', desc: 'Price estimator and AI poster generator without limits.' },
  { icon: Headphones, title: 'Priority support', desc: 'Your tickets and disputes are handled first.' },
  { icon: ShieldCheck, title: 'Faster verification', desc: 'Gold VIP unlocks the verified seller application.' },
  { icon: Gift, title: 'VIP cashback', desc: 'Earn cashback credit on every completed purchase.' },
  { icon: Download, title: 'Early app builds', desc: 'Get new APK releases before everyone else.' },
];

const VipLoungePage = () => {
  const { user } = useAuth();
  const { vip, loading, isVip, tier, isGold } = useVipStatus();
  const [earlyDeals, setEarlyDeals] = useState<any[]>([]);
  const [spend, setSpend] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  const meta = TIER_META[tier] ?? TIER_META.bronze;

  useEffect(() => {
    const load = async () => {
      if (!isVip || !user) {
        setLoadingData(false);
        return;
      }
      setLoadingData(true);
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [{ data: listings }, { data: purchases }] = await Promise.all([
          supabase
            .from('id_listings')
            .select('id, id_level, login_method, key_items, price, image_url, is_email_binded, seller_id, created_at, updated_at, featured_until, listing_type')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(6),
          supabase
            .from('purchases')
            .select('amount, status')
            .eq('buyer_id', user.id),
        ]);
        setEarlyDeals(listings ?? []);
        const total = (purchases ?? [])
          .filter((p: any) => p.status === 'completed' || p.status === 'done')
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        setSpend(total);
      } catch (e) {
        console.error('Error loading VIP lounge data:', e);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [isVip, user]);

  const cashback = useMemo(() => Math.round((spend * meta.cashback) / 100), [spend, meta.cashback]);

  const boostsLeft = vip
    ? isGold
      ? '∞'
      : Math.max(0, (vip.boosts_quota ?? 0) - (vip.boosts_used ?? 0))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-4xl">
        {/* Hero */}
        <Card className="mb-6 overflow-hidden border-primary/30">
          <div className="bg-gradient-to-br from-primary/25 via-background to-background p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <Crown className={`h-6 w-6 ${isVip ? meta.accent : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">VIP Lounge</h1>
                <p className="text-sm text-muted-foreground">
                  {isVip
                    ? `Welcome back — your ${meta.label} perks are active.`
                    : 'Members-only area with exclusive tools, deals and rewards.'}
                </p>
              </div>
            </div>
            {isVip && vip && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Badge className="uppercase">{meta.label}</Badge>
                <Badge variant="secondary">
                  Valid till {new Date(vip.expires_at).toLocaleDateString()}
                </Badge>
                <Badge variant="secondary">{meta.cashback}% cashback</Badge>
              </div>
            )}
          </div>
        </Card>

        {!isVip ? (
          <Card className="mb-6">
            <CardContent className="py-10 text-center">
              <Lock className="h-10 w-10 text-primary mx-auto mb-3" />
              <h2 className="font-display text-lg font-bold">This area is for VIP members</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Unlock early access deals, free boosts, unlimited AI tools, cashback and priority
                support with any VIP membership.
              </p>
              <Link to="/vip">
                <Button variant="gaming" className="mt-5 gap-2">
                  <Sparkles className="h-4 w-4" /> Become a VIP member
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Free boosts left</p>
                  <p className="text-xl font-bold text-primary">{boostsLeft}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Cashback earned</p>
                  <p className="text-xl font-bold text-primary">₹{cashback}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total spent</p>
                  <p className="text-xl font-bold">₹{spend}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Tier</p>
                  <p className={`text-xl font-bold ${meta.accent}`}>{tier.toUpperCase()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Boost usage */}
            {vip && !isGold && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" /> Monthly boost quota
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>{vip.boosts_used} used</span>
                    <span>{vip.boosts_quota} total</span>
                  </div>
                  <Progress
                    value={Math.min(100, (vip.boosts_used / Math.max(vip.boosts_quota, 1)) * 100)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Early access deals */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Early access deals
                  <Badge variant="secondary" className="ml-1">VIP only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : earlyDeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No new IDs in the last 24 hours. Check back soon.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {earlyDeals.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick tools */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" /> VIP quick tools
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Link to="/sell">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Sparkles className="h-4 w-4" /> AI price + poster
                  </Button>
                </Link>
                <Link to="/my-listings">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Rocket className="h-4 w-4" /> Boost a listing
                  </Button>
                </Link>
                <Link to="/withdraw">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Percent className="h-4 w-4" /> {meta.feeCut}
                  </Button>
                </Link>
                <Link to="/seller-verify">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <ShieldCheck className="h-4 w-4" /> Verified seller
                  </Button>
                </Link>
                <a
                  href="https://wa.me/917501146196?text=VIP%20priority%20support"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Headphones className="h-4 w-4" /> Priority support
                  </Button>
                </a>
                <Link to="/download">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Download className="h-4 w-4" /> Early app build
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {/* Perks list (always visible) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" /> All VIP benefits
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {PERKS.map((p) => (
              <div key={p.title} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <p.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {!isVip && (
          <>
            <Separator className="my-6" />
            <Link to="/vip">
              <Button variant="gaming" className="w-full gap-2">
                View VIP plans <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )}
      </main>
    </div>
  );
};

export default VipLoungePage;
