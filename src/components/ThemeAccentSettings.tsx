import { Link } from 'react-router-dom';
import { Check, Crown, Lock, Paintbrush, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import useVipStatus from '@/hooks/useVipStatus';
import useThemeAccent, { ACCENTS, GRADIENTS } from '@/hooks/useThemeAccent';
import { toast } from 'sonner';

const ThemeAccentSettings = () => {
  const { isVip, tier, loading } = useVipStatus();
  const { prefs, update, reset } = useThemeAccent();

  return (
    <Card className="mb-5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-primary" /> Accent & Gradient
          <Badge variant="secondary" className="ml-1 gap-1 text-[10px] uppercase">
            <Crown className="h-3 w-3" /> VIP
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!loading && !isVip ? (
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center">
            <Lock className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">Personalize your theme colors</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Accent colors and gradient styles are exclusive to VIP members.
            </p>
            <Link to="/vip">
              <Button size="sm">Become VIP</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Accent color {tier && <span className="uppercase">· {tier} VIP</span>}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  toast.success('Theme reset to default');
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    update({ accent: a.id });
                    toast.success(`${a.label} applied`);
                  }}
                  title={a.label}
                  aria-label={a.label}
                  className={`relative aspect-square rounded-xl border-2 transition-all ${
                    prefs.accent === a.id ? 'border-foreground scale-105' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: a.swatch }}
                >
                  {prefs.accent === a.id && (
                    <Check className="h-4 w-4 text-white drop-shadow absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>

            <Separator className="my-4" />

            <p className="text-xs text-muted-foreground mb-3">Gradient style</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    update({ gradient: g.id });
                    toast.success(`${g.label} gradient applied`);
                  }}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    prefs.gradient === g.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div
                    className="h-6 w-full rounded-md mb-2"
                    style={{ background: 'var(--gradient-fire)' }}
                  />
                  <p className="text-xs font-medium">{g.label}</p>
                  <p className="text-[10px] text-muted-foreground">{g.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm">Buy Now</Button>
                <Button size="sm" variant="outline">Make Offer</Button>
                <Badge>Featured</Badge>
                <div
                  className="h-8 w-24 rounded-md"
                  style={{ background: 'var(--gradient-primary)' }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ThemeAccentSettings;
