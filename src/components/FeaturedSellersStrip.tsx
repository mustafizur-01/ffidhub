import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, ShieldCheck, Star, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FeaturedSeller {
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  active_listings: number;
  total_sales: number;
  avg_rating: number;
}

const FeaturedSellersStrip = () => {
  const [sellers, setSellers] = useState<FeaturedSeller[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_featured_sellers', { _limit: 6 });
      setSellers((data as FeaturedSeller[]) || []);
    })();
  }, []);

  if (!sellers.length) return null;

  return (
    <section className="container py-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Featured Sellers</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2 scroll-smooth snap-x">
        {sellers.map((s) => {
          const name = s.display_name || s.email.split('@')[0];
          return (
            <Link
              to={`/seller/${s.user_id}`}
              key={s.user_id}
              className="card-gaming min-w-[220px] max-w-[220px] snap-start p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarImage src={s.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-display">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate flex items-center gap-1">
                    {name}
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {Number(s.avg_rating) > 0 ? Number(s.avg_rating).toFixed(1) : 'New'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/30 rounded-lg py-2">
                  <p className="text-sm font-bold text-primary">{s.total_sales}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Sales</p>
                </div>
                <div className="bg-muted/30 rounded-lg py-2">
                  <p className="text-sm font-bold flex items-center justify-center gap-1">
                    <Package className="h-3 w-3" /> {s.active_listings}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">Listings</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedSellersStrip;
