import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface SoldItem {
  id: string;
  id_level: number;
  login_method: string;
  key_items: string;
  price: number;
  image_url: string | null;
  sold_at: string;
}

const RecentlySoldStrip = () => {
  const [items, setItems] = useState<SoldItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_recently_sold_listings', { _limit: 8 });
      setItems((data as SoldItem[]) || []);
    })();
  }, []);

  if (!items.length) return null;

  return (
    <section className="container py-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-5 w-5 text-green-400" />
        <h2 className="font-display text-xl font-bold">Recently Sold</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2 scroll-smooth snap-x">
        {items.map((item) => (
          <div
            key={item.id}
            className="card-gaming min-w-[200px] max-w-[200px] snap-start overflow-hidden opacity-90"
          >
            <div className="aspect-video bg-muted/30 relative overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={`Sold Level ${item.id_level}`}
                  className="w-full h-full object-cover grayscale-[30%]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No image
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400 uppercase tracking-wider backdrop-blur">
                Sold
              </div>
            </div>
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold">
                Lv {item.id_level} · ₹{Number(item.price).toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{item.key_items}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(item.sold_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentlySoldStrip;
