import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  listingId: string;
  className?: string;
}

const FavoriteButton = ({ listingId, className }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setChecking(false);
        return;
      }
      const { data } = await (supabase as any)
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();
      setFavorited(!!data);
      setChecking(false);
    };
    check();
  }, [user, listingId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to save favorites');
      return;
    }
    setLoading(true);
    try {
      if (favorited) {
        const { error } = await (supabase as any)
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        if (error) throw error;
        setFavorited(false);
        toast.success('Removed from favorites');
      } else {
        const { error } = await (supabase as any)
          .from('favorites')
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
        setFavorited(true);
        toast.success('Saved to favorites');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update favorite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading || checking}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center border border-border transition-all hover:scale-110 hover:border-primary disabled:opacity-50',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            favorited ? 'fill-primary text-primary' : 'text-muted-foreground',
          )}
        />
      )}
    </button>
  );
};

export default FavoriteButton;
