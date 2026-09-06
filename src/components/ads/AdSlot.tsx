import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Gamepad2, Tag, Wallet, Megaphone } from 'lucide-react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

interface AdSlotProps {
  /** AdSense ad unit slot id (used only when VITE_ADSENSE_CLIENT is set) */
  slot?: string;
  /** banner = horizontal leader board, box = square/rectangle */
  variant?: 'banner' | 'box';
  className?: string;
}

const HOUSE_PROMOS = [
  {
    icon: Crown,
    title: 'Go VIP — Sell Faster',
    text: 'Top placement, free boosts & lower withdrawal fees.',
    cta: 'View VIP Plans',
    to: '/vip',
  },
  {
    icon: Gamepad2,
    title: 'Tournaments Live Now',
    text: 'Join Free Fire MAX tournaments and win real prizes.',
    cta: 'Play Now',
    to: '/tournaments',
  },
  {
    icon: Tag,
    title: 'Sell Your ID',
    text: 'List your Free Fire MAX ID and reach real buyers instantly.',
    cta: 'Create Listing',
    to: '/sell',
  },
  {
    icon: Wallet,
    title: 'Add Money Securely',
    text: 'Top up your wallet with UPI and trade with escrow protection.',
    cta: 'Add Money',
    to: '/add-money',
  },
];

/**
 * Ad placement. When an AdSense publisher id is configured
 * (VITE_ADSENSE_CLIENT env var) it renders a real Google ad unit;
 * otherwise it shows a rotating house promo in the same slot, so the
 * layout is ready the day AdSense gets approved.
 */
export function AdSlot({ slot, variant = 'banner', className = '' }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [promoIndex, setPromoIndex] = useState(0);

  const adsenseReady = Boolean(ADSENSE_CLIENT && slot);

  useEffect(() => {
    if (!adsenseReady) return;
    if (!document.querySelector('script[data-adsense]')) {
      const s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.dataset.adsense = 'true';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(s);
    }
    if (!pushed.current) {
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        /* ad blockers etc. */
      }
    }
  }, [adsenseReady]);

  useEffect(() => {
    if (adsenseReady) return;
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % HOUSE_PROMOS.length), 8000);
    return () => clearInterval(t);
  }, [adsenseReady]);

  const promo = useMemo(() => HOUSE_PROMOS[promoIndex], [promoIndex]);
  const Icon = promo.icon;

  if (adsenseReady) {
    return (
      <div className={`overflow-hidden ${className}`} aria-label="Advertisement">
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-r from-primary/10 via-card to-card ${className}`}
      aria-label="Sponsored"
    >
      <span className="absolute top-2 right-3 text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
        <Megaphone className="h-3 w-3" /> Sponsored
      </span>
      <Link
        to={promo.to}
        className={`flex items-center gap-4 px-4 ${variant === 'banner' ? 'py-4' : 'py-6 flex-col text-center'}`}
      >
        <div className="shrink-0 w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className={variant === 'banner' ? 'min-w-0 flex-1' : ''}>
          <p className="font-display font-bold text-sm">{promo.title}</p>
          <p className="text-xs text-muted-foreground">{promo.text}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1.5">
          {promo.cta}
        </span>
      </Link>
    </div>
  );
}
