import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  id_level: number;
  login_method: 'FB' | 'Google' | 'VK';
  key_items: string;
  is_email_binded: boolean;
  onSuggest: (price: number) => void;
}

interface Result {
  low: number;
  high: number;
  suggested: number;
  confidence: string;
  reasoning: string;
}

export const AIPriceEstimator = ({ id_level, login_method, key_items, is_email_binded, onSuggest }: Props) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const estimate = async () => {
    if (!id_level || id_level < 1) return toast.error('Enter ID level first');
    if (!key_items || key_items.length < 10) return toast.error('Describe key items first (≥10 chars)');

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-price', {
        body: { id_level, login_method, key_items, is_email_binded },
      });
      if (error) throw error;
      if (data?.error === 'rate_limited') return toast.error('AI is busy. Try again in a moment.');
      if (data?.error === 'credits_exhausted') return toast.error('AI credits exhausted. Contact admin.');
      if (data?.error) throw new Error(data.error);
      setResult(data as Result);
    } catch (e: any) {
      toast.error(e.message || 'Failed to estimate price');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-gaming p-4 border-accent/30 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            AI Price Estimator
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Get a fair price range powered by AI based on your account details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={estimate}
            disabled={loading}
            className="border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : result ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? 'Analyzing...' : result ? 'Suggest Again' : 'Suggest Price'}
          </Button>
          {result && !loading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setResult(null)}
              className="text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {result && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Inputs change korle abar "Suggest Again" chapun — notun price peye tap korle auto-set hobe.
        </p>
      )}


      {result && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-muted/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Low</div>
            <div className="font-mono text-lg font-bold">₹{result.low}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSuggest(result.suggested);
              toast.success(`Price set to ₹${result.suggested}`);
            }}
            className="rounded-lg border border-primary bg-primary/10 p-2 hover:bg-primary/20 transition-colors"
          >
            <div className="text-[10px] uppercase text-primary font-bold">Suggested · Tap</div>
            <div className="font-mono text-xl font-bold text-primary">₹{result.suggested}</div>
          </button>
          <div className="rounded-lg border border-border bg-muted/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">High</div>
            <div className="font-mono text-lg font-bold">₹{result.high}</div>
          </div>
          {result.reasoning && (
            <p className="col-span-3 text-xs text-muted-foreground italic mt-1">
              {result.reasoning} <span className="text-accent">· {result.confidence} confidence</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
