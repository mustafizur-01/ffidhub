import { useEffect, useState } from 'react';
import { Award, Shield, Star, ShoppingBag, Trophy, Zap, Crown, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface Reputation {
  score: number;
  tier: 'Rookie' | 'Rising' | 'Trusted' | 'Elite' | 'Legend';
  total_sales: number;
  total_purchases: number;
  seller_rating: number;
  seller_review_count: number;
  buyer_rating: number;
  buyer_review_count: number;
  badges: string[] | null;
}

const TIER_STYLES: Record<string, string> = {
  Rookie: 'bg-muted text-muted-foreground border-border',
  Rising: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  Trusted: 'bg-green-500/15 text-green-400 border-green-500/40',
  Elite: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
  Legend: 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-300 border-yellow-400/50',
};

const BADGE_META: Record<string, { label: string; icon: any; cls: string }> = {
  first_sale: { label: 'First Sale', icon: Zap, cls: 'text-orange-400' },
  power_seller: { label: 'Power Seller', icon: Trophy, cls: 'text-yellow-400' },
  top_seller: { label: 'Top Seller', icon: Crown, cls: 'text-amber-400' },
  first_purchase: { label: 'First Buy', icon: ShoppingBag, cls: 'text-blue-400' },
  loyal_buyer: { label: 'Loyal Buyer', icon: Sparkles, cls: 'text-pink-400' },
  five_star: { label: '5-Star Rated', icon: Star, cls: 'text-yellow-400' },
  verified: { label: 'Verified', icon: CheckCircle2, cls: 'text-blue-400' },
};

const ReputationCard = ({ userId }: { userId: string }) => {
  const [rep, setRep] = useState<Reputation | null>(null);

  useEffect(() => {
    supabase
      .rpc('get_user_reputation', { _user_id: userId })
      .then(({ data }) => setRep(data as unknown as Reputation));
  }, [userId]);

  if (!rep) return null;
  const badges = rep.badges || [];

  return (
    <div className="card-gaming p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Reputation
        </h3>
        <Badge className={TIER_STYLES[rep.tier]}>
          <Shield className="h-3 w-3 mr-1" />
          {rep.tier}
        </Badge>
      </div>

      <div className="text-center py-3">
        <p className="text-4xl font-display font-bold text-gradient">{rep.score}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Reputation Score</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <p className="font-semibold">{rep.seller_rating}★</p>
          <p className="text-muted-foreground">As Seller ({rep.seller_review_count})</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <p className="font-semibold">{rep.buyer_rating}★</p>
          <p className="text-muted-foreground">As Buyer ({rep.buyer_review_count})</p>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Achievements</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => {
              const meta = BADGE_META[b];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <Badge key={b} variant="outline" className="gap-1 text-xs">
                  <Icon className={`h-3 w-3 ${meta.cls}`} />
                  {meta.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReputationCard;
