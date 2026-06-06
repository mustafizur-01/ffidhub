import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Star, ArrowLeft, Package, ShieldCheck, MessageCircle, TrendingUp, ThumbsUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { IdListing } from '@/types/listing';
import ListingCard from '@/components/ListingCard';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import ReportDialog from '@/components/ReportDialog';
import BlockUserButton from '@/components/BlockUserButton';
import ReputationCard from '@/components/ReputationCard';

interface Review {
  id: string;
  buyer_id: string;
  listing_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface SellerProfile {
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  is_verified_seller: boolean;
  created_at: string;
}

const Stars = ({ value, size = 'h-4 w-4' }: { value: number; size?: string }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`${size} ${
          n <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        }`}
      />
    ))}
  </div>
);

interface SellerStats {
  total_sales: number;
  positive_reviews: number;
  total_reviews: number;
  avg_rating: number;
}

const SellerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [listings, setListings] = useState<IdListing[]>([]);
  const [soldIds, setSoldIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);

      const [{ data: prof }, { data: rev }, { data: list }, { data: st }] = await Promise.all([
        supabase.rpc('get_seller_public_profile', { _user_id: id }),
        supabase
          .from('seller_reviews')
          .select('id, buyer_id, listing_id, rating, comment, created_at')
          .eq('seller_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('id_listings')
          .select('*')
          .eq('seller_id', id)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_seller_stats', { _user_id: id }),
      ]);

      const profArr = (prof as SellerProfile[] | null) || [];
      setProfile(profArr[0] || null);
      setReviews((rev as Review[]) || []);
      setStats((st as unknown as SellerStats) || null);

      const listingsData = (list as IdListing[]) || [];
      const listingIds = listingsData.map((l) => l.id);
      let sold = new Set<string>();
      if (listingIds.length > 0) {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('listing_id')
          .in('listing_id', listingIds)
          .eq('status', 'approved');
        sold = new Set((purchases || []).map((p: any) => p.listing_id));
      }
      setSoldIds(sold);
      setListings(listingsData);
      setLoading(false);
    };
    load();
  }, [id]);

  const activeListings = listings.filter((l) => !soldIds.has(l.id));
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Seller not found</h1>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.email.split('@')[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>

        {/* Seller header card */}
        <div className="card-gaming p-6 mb-6">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar className="h-20 w-20 border-2 border-primary/30">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl font-display bg-primary/10 text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-[200px] space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-display font-bold">{displayName}</h1>
                {profile.is_verified_seller && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified Seller
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Stars value={avg} />
                  <span className="font-semibold">
                    {reviews.length > 0 ? avg.toFixed(1) : 'No ratings'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Package className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-xl font-display font-bold">{activeListings.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-green-400 mb-1" />
              <p className="text-xl font-display font-bold">{stats?.total_sales ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Sales</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <ThumbsUp className="h-4 w-4 mx-auto text-blue-400 mb-1" />
              <p className="text-xl font-display font-bold">{stats?.positive_reviews ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Positive</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <Star className="h-4 w-4 mx-auto text-yellow-400 mb-1" />
              <p className="text-xl font-display font-bold">
                {reviews.length > 0 ? avg.toFixed(1) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rating</p>
            </div>
          </div>

          {/* Action row */}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {activeListings[0]?.contact_number && (
              <a
                href={`https://wa.me/91${activeListings[0].contact_number}?text=${encodeURIComponent(
                  `Hi ${displayName}, I found your Free Fire ID listing on FF ID Hub and would like to chat.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="gaming" size="lg" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contact on WhatsApp
                </Button>
              </a>
            )}
            <BlockUserButton targetUserId={profile.user_id} />
            <ReportDialog targetType="user" targetId={profile.user_id} />
          </div>
        </div>

        {/* Reputation */}
        <div className="mb-6">
          <ReputationCard userId={profile.user_id} />
        </div>

        {/* Active Listings */}
        <section className="mb-8">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Active Listings
          </h2>
          {activeListings.length === 0 ? (
            <div className="card-gaming p-8 text-center text-muted-foreground">
              This seller has no active listings.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeListings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  isVerifiedSeller={profile.is_verified_seller}
                />
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            All Reviews
          </h2>
          {reviews.length === 0 ? (
            <div className="card-gaming p-8 text-center text-muted-foreground">
              No reviews yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="card-gaming p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Stars value={r.rating} size="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SellerProfilePage;
