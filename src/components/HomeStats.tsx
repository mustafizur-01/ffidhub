import { useEffect, useState } from 'react';
import { Package, ShieldCheck, Users, IndianRupee, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  total_ids_sold: number;
  verified_sellers: number;
  total_users: number;
  trade_volume: number;
  success_rate: number;
  total_listings: number;
}

const AnimatedNumber = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1200;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span>
      {prefix}
      {Math.round(display).toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

const HomeStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_marketplace_stats');
      if (data) setStats(data as unknown as Stats);
    })();
  }, []);

  const items = [
    {
      label: 'IDs Sold',
      icon: Package,
      value: stats?.total_ids_sold ?? 0,
      color: 'text-primary',
    },
    {
      label: 'Verified Sellers',
      icon: ShieldCheck,
      value: stats?.verified_sellers ?? 0,
      color: 'text-blue-400',
    },
    {
      label: 'Total Users',
      icon: Users,
      value: stats?.total_users ?? 0,
      color: 'text-yellow-400',
    },
    {
      label: 'Trade Volume',
      icon: IndianRupee,
      value: stats?.trade_volume ?? 0,
      color: 'text-green-400',
      prefix: '₹',
    },
    {
      label: 'Success Rate',
      icon: TrendingUp,
      value: stats?.success_rate ?? 0,
      color: 'text-pink-400',
      suffix: '%',
    },
  ];

  return (
    <section className="container py-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {items.map(({ label, icon: Icon, value, color, prefix, suffix }) => (
          <div
            key={label}
            className="card-gaming p-4 text-center hover:border-primary/40 transition-colors"
          >
            <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
            <div className="font-display text-xl md:text-2xl font-black">
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mt-1">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeStats;
