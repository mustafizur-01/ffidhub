import { useState, useEffect, useMemo } from 'react';
import { Flame, TrendingUp, Shield, Zap, Trophy, Users, IndianRupee, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import ListingCard from '@/components/ListingCard';
import SearchFilters from '@/components/SearchFilters';
import HomeStats from '@/components/HomeStats';
import RecentlySoldStrip from '@/components/RecentlySoldStrip';
import FeaturedSellersStrip from '@/components/FeaturedSellersStrip';
import { supabase } from '@/integrations/supabase/client';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { IdListing, ListingFilters } from '@/types/listing';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


const Index = () => {
  const blockedUsers = useBlockedUsers();
  const [listings, setListings] = useState<IdListing[]>([]);
  const [soldListingIds, setSoldListingIds] = useState<Set<string>>(new Set());
  const [verifiedSellerIds, setVerifiedSellerIds] = useState<Set<string>>(new Set());
  const [sellerMap, setSellerMap] = useState<Record<string, { display_name: string | null; avatar_url: string | null; is_verified_seller: boolean }>>({});
  const [upcomingTournaments, setUpcomingTournaments] = useState<any[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ListingFilters>({
    search: '',
    minPrice: null,
    maxPrice: null,
    loginMethod: null,
    minLevel: null,
    emailBinded: 'any',
    sort: 'newest',
  });

  useEffect(() => {
    fetchListings();
    fetchUpcomingTournaments();
  }, [filters]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('id_listings')
        .select('id, id_level, login_method, key_items, price, image_url, is_email_binded, seller_id, created_at, updated_at, featured_until, listing_type');

      switch (filters.sort) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'level_desc':
          query = query.order('id_level', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      if (filters.search) {
        query = query.ilike('key_items', `%${filters.search}%`);
      }

      if (filters.minPrice !== null) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice !== null) {
        query = query.lte('price', filters.maxPrice);
      }

      if (filters.loginMethod) {
        query = query.eq('login_method', filters.loginMethod);
      }

      if (filters.minLevel != null) {
        query = query.gte('id_level', filters.minLevel);
      }

      if (filters.emailBinded === 'yes') {
        query = query.eq('is_email_binded', true);
      } else if (filters.emailBinded === 'no') {
        query = query.eq('is_email_binded', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      const fetchedListings = (data as IdListing[]) || [];
      setListings(fetchedListings);

      // Check sold status + fetch seller public profiles
      if (fetchedListings.length > 0) {
        const soldSet = new Set<string>();
        const verifiedSet = new Set<string>();
        const sellerMap: Record<string, { display_name: string | null; avatar_url: string | null; is_verified_seller: boolean }> = {};

        const uniqueSellerIds = [
          ...new Set(fetchedListings.map((l) => l.seller_id).filter(Boolean)),
        ] as string[];

        const [soldResults, ...profileResults] = await Promise.all([
          Promise.all(fetchedListings.map((l) => supabase.rpc('is_listing_sold', { _listing_id: l.id }))),
          ...uniqueSellerIds.map((sellerId) =>
            supabase.rpc('get_seller_public_profile', { _user_id: sellerId })
          ),
        ]);

        soldResults.forEach((result, index) => {
          if (result.data) soldSet.add(fetchedListings[index].id);
        });

        profileResults.forEach((result, index) => {
          const sellerId = uniqueSellerIds[index];
          const profile = (result.data as any)?.[0];
          if (profile) {
            sellerMap[sellerId] = profile;
            if (profile.is_verified_seller) verifiedSet.add(sellerId);
          }
        });

        setSoldListingIds(soldSet);
        setVerifiedSellerIds(verifiedSet);
        setSellerMap(sellerMap);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingTournaments = async () => {
    try {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'upcoming')
        .order('start_time', { ascending: true })
        .limit(3);
      setUpcomingTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container relative py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-pulse-glow">
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                #1 FF MAX ID Marketplace
              </span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-black">
              Buy & Sell{' '}
              <span className="text-gradient">Free Fire MAX</span>{' '}
              IDs Securely
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Find rare bundles, evo guns, and elite passes. Trade with verified 
              members and secure transactions.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold">{listings.length}+ IDs Listed</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gaming-success" />
                <span className="font-semibold">Secure Trading</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">Instant Contact</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeStats />

      <RecentlySoldStrip />

      <FeaturedSellersStrip />

      {/* Upcoming Tournaments Banner */}
      {upcomingTournaments.length > 0 && (
        <section className="container py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Upcoming Tournaments
            </h2>
            <Link to="/tournaments">
              <Button variant="ghost" size="sm">View All →</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingTournaments.map((t: any) => (
              <Link to="/tournaments" key={t.id}>
                <Card className="card-gaming p-4 hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-0 space-y-2">
                    <h3 className="font-bold">{t.title}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {t.max_players} slots</span>
                      <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {t.entry_fee > 0 ? `₹${t.entry_fee}` : 'Free'}</span>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      <Trophy className="h-3 w-3 mr-1" /> Prize: ₹{t.prize_pool}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Listings Section */}
      <section className="container py-10">
        <div className="space-y-8">
          <SearchFilters filters={filters} onFiltersChange={setFilters} />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={verifiedOnly ? 'gaming' : 'outline'}
                size="sm"
                onClick={() => setVerifiedOnly((v) => !v)}
                className="gap-2"
              >
                <BadgeCheck className="h-4 w-4" />
                {verifiedOnly ? 'Showing Verified Only' : 'Verified Sellers Only'}
              </Button>
              {verifiedOnly && (
                <Button variant="ghost" size="sm" onClick={() => setVerifiedOnly(false)}>
                  Clear
                </Button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {(() => {
                const count = verifiedOnly
                  ? listings.filter(l => l.seller_id && verifiedSellerIds.has(l.seller_id)).length
                  : listings.length;
                return `${count} ${count === 1 ? 'listing' : 'listings'}`;
              })()}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card-gaming overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (() => {
            const base = listings.filter(l => !l.seller_id || !blockedUsers.has(l.seller_id));
            const visible = verifiedOnly
              ? base.filter(l => l.seller_id && verifiedSellerIds.has(l.seller_id))
              : base;
            return visible.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visible.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isSold={soldListingIds.has(listing.id)}
                    isVerifiedSeller={!!listing.seller_id && verifiedSellerIds.has(listing.seller_id)}
                    sellerName={listing.seller_id ? sellerMap[listing.seller_id]?.display_name : null}
                    sellerAvatar={listing.seller_id ? sellerMap[listing.seller_id]?.avatar_url : null}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Flame className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">
                  {verifiedOnly ? 'No Verified Seller Listings' : 'No IDs Found'}
                </h3>
                <p className="text-muted-foreground">
                  {verifiedOnly
                    ? 'Try clearing the verified filter or check back later'
                    : 'Try adjusting your filters or check back later'}
                </p>
              </div>
            );
          })()}
        </div>
      </section>
    </div>
  );
};

export default Index;
