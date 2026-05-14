import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import ListingCard from '@/components/ListingCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { IdListing } from '@/types/listing';

const FavoritesPage = () => {
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<IdListing[]>([]);
  const [soldIds, setSoldIds] = useState<Set<string>>(new Set());
  const [verifiedSellers, setVerifiedSellers] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setFetching(true);
      try {
        const { data: favs } = await (supabase as any)
          .from('favorites')
          .select('listing_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const ids = (favs ?? []).map((f: any) => f.listing_id);
        if (ids.length === 0) {
          setListings([]);
          return;
        }

        const { data: rows } = await supabase
          .from('id_listings')
          .select('*')
          .in('id', ids);

        const ordered = ids
          .map((id: string) => (rows ?? []).find((r: any) => r.id === id))
          .filter(Boolean) as IdListing[];
        setListings(ordered);

        // sold check
        const { data: purchases } = await supabase
          .from('purchases')
          .select('listing_id')
          .eq('status', 'approved')
          .in('listing_id', ids);
        setSoldIds(new Set((purchases ?? []).map((p) => p.listing_id)));

        // verified sellers
        const sellerIds = Array.from(new Set(ordered.map((l) => l.seller_id).filter(Boolean))) as string[];
        if (sellerIds.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('user_id, is_verified_seller')
            .in('user_id', sellerIds);
          setVerifiedSellers(
            new Set((profs ?? []).filter((p: any) => p.is_verified_seller).map((p: any) => p.user_id)),
          );
        }
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-10">
        <h1 className="font-display text-3xl font-bold mb-8 flex items-center gap-2">
          <Heart className="h-7 w-7 text-primary fill-primary" />
          My Favorites
        </h1>

        {fetching ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : listings.length === 0 ? (
          <div className="card-gaming p-12 text-center">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-display text-xl font-bold mb-2">No favorites yet</p>
            <p className="text-muted-foreground">
              Tap the heart on any listing to save it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSold={soldIds.has(listing.id)}
                isVerifiedSeller={listing.seller_id ? verifiedSellers.has(listing.seller_id) : false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
