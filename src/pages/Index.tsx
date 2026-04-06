import { useState, useEffect } from 'react';
import { Flame, TrendingUp, Shield, Zap } from 'lucide-react';
import Header from '@/components/Header';
import ListingCard from '@/components/ListingCard';
import SearchFilters from '@/components/SearchFilters';
import { supabase } from '@/integrations/supabase/client';
import { IdListing, ListingFilters } from '@/types/listing';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [listings, setListings] = useState<IdListing[]>([]);
  const [soldListingIds, setSoldListingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ListingFilters>({
    search: '',
    minPrice: null,
    maxPrice: null,
    loginMethod: null,
  });

  useEffect(() => {
    fetchListings();
  }, [filters]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('id_listings')
        .select('*')
        .order('created_at', { ascending: false });

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

      const { data, error } = await query;

      if (error) throw error;
      const fetchedListings = (data as IdListing[]) || [];
      setListings(fetchedListings);

      // Fetch sold listings (approved purchases)
      if (fetchedListings.length > 0) {
        const listingIds = fetchedListings.map(l => l.id);
        const { data: soldData } = await supabase
          .from('purchases')
          .select('listing_id')
          .in('listing_id', listingIds)
          .eq('status', 'approved');
        
        if (soldData) {
          setSoldListingIds(new Set(soldData.map(p => p.listing_id)));
        }
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
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

      {/* Listings Section */}
      <section className="container py-10">
        <div className="space-y-8">
          <SearchFilters filters={filters} onFiltersChange={setFilters} />

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card-gaming overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Flame className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">No IDs Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or check back later
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
