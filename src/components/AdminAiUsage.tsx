import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, ImageIcon, Users, CalendarDays, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Stats = {
  total: number;
  today: number;
  week: number;
  unique_users: number;
  failed: number;
  by_source: Record<string, number>;
};

type Row = {
  id: string;
  user_id: string | null;
  source: string;
  prompt: string | null;
  success: boolean;
  created_at: string;
};

const StatTile = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ImageIcon;
  label: string;
  value: number | string;
  tone: string;
}) => (
  <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-4">
    <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl ${tone}`} />
    <Icon className="h-4 w-4 text-primary mb-2" />
    <p className="text-2xl font-display font-bold leading-none">{value}</p>
    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
  </div>
);

export default function AdminAiUsage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: st }, { data: recent }] = await Promise.all([
      supabase.rpc('get_ai_image_stats' as never),
      supabase
        .from('ai_image_generations' as never)
        .select('id, user_id, source, prompt, success, created_at')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);
    setStats((st as unknown as Stats) || null);
    setRows(((recent as unknown as Row[]) || []));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="border-accent/30">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-display">
          <Sparkles className="h-4 w-4 text-accent" />
          AI Image Generation
        </CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={ImageIcon} label="Total images" value={stats?.total ?? 0} tone="bg-primary/30" />
              <StatTile icon={CalendarDays} label="Today" value={stats?.today ?? 0} tone="bg-accent/30" />
              <StatTile icon={CalendarDays} label="Last 7 days" value={stats?.week ?? 0} tone="bg-primary/20" />
              <StatTile icon={Users} label="Unique users" value={stats?.unique_users ?? 0} tone="bg-accent/20" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(stats?.by_source || {}).map(([src, count]) => (
                <Badge key={src} variant="outline" className="border-primary/40 text-primary capitalize">
                  {src}: {count}
                </Badge>
              ))}
              {(stats?.failed ?? 0) > 0 && (
                <Badge variant="outline" className="border-destructive/40 text-destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Failed: {stats?.failed}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Recent generations</p>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No AI images generated yet.</p>
              ) : (
                rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize text-[10px]">{r.source}</Badge>
                        {!r.success && (
                          <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                            failed
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {r.prompt || 'No prompt stored'}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
