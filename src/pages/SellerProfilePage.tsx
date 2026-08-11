import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2, Star, ArrowLeft, Package, ShieldCheck, MessageCircle, TrendingUp,
  ThumbsUp, Share2, CalendarDays, BadgeCheck, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { IdListing } from '@/types/listing';
import ListingCard from '@/components/ListingCard';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
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

const StatTile = ({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof Package;
  value: string | number;
  label: string;
  color: string;
}) => (
  <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
    <div className={`absolute -right-5 -top-5 h-16 w-16 rounded-full blur-2xl ${color}`} />
    <Icon className="h-4 w-4 mx-auto mb-1 text-primary" />
    <p className="text-xl font-display font-bold">{value}</p>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
  </div>
);

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
  const soldListings = listings.filter((l) => soldIds.has(l.id));
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const distribution = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));
    return counts;
  }, [reviews]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Seller profile', url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Profile link copied!');
      }
    } catch {
      /* user cancelled */
    }
  };

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
  const memberSince = new Date(profile.created_at);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>

        {/* Seller header card */}
        <div className="card-gaming overflow-hidden mb-6">
          {/* Banner */}
          <div className="relative h-28 bg-gradient-to-r from-primary/30 via-accent/20 to-transparent">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_120%,hsl(var(--primary)/0.35),transparent_60%)]" />
          </div>

          <div className="px-6 pb-6 -mt-12">
            <div className="flex items-end gap-4 flex-wrap">
              <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/40">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-3xl font-display bg-primary/10 text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-[200px] space-y-1.5 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-display font-bold">{displayName}</h1>
                  {profile.is_verified_seller ? (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Verified Seller
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Unverified
                    </Badge>
                  )}
                  {(stats?.total_sales ?? 0) >= 5 && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Trusted Trader
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Stars value={avg} />
                  <span className="font-semibold">
                    {reviews.length > 0 ? avg.toFixed(1) : 'No ratings'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Member since {memberSince.toLocaleDateString()} ·{' '}
                  {formatDistanceToNow(memberSince, { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <StatTile icon={Package} value={activeListings.length} label="Active" color="bg-primary/30" />
              <StatTile icon={TrendingUp} value={stats?.total_sales ?? 0} label="Total Sales" color="bg-green-500/30" />
              <StatTile icon={ThumbsUp} value={stats?.positive_reviews ?? 0} label="Positive" color="bg-blue-500/30" />
              <StatTile
                icon={Star}
                value={reviews.length > 0 ? avg.toFixed(1) : '—'}
                label="Rating"
                color="bg-yellow-500/30"
              />
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
              <Button variant="outline" size="lg" className="gap-2" onClick={share}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <BlockUserButton targetUserId={profile.user_id} />
              <ReportDialog targetType="user" targetId={profile.user_id} />
            </div>
          </div>
        </div>

        {/* Reputation */}
        <div className="mb-6">
          <ReputationCard userId={profile.user_id} />
        </div>

        {/* Listings tabs */}
        <section className="mb-8">
          <Tabs defaultValue="active">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active ({activeListings.length})</TabsTrigger>
              <TabsTrigger value="sold">Sold ({soldListings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeListings.length === 0 ? (
                <div className="card-gaming p-8 text-center text-muted-foreground">
                  This seller has no active listings.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeListings.map((l) => (
                    <ListingCard key={l.id} listing={l} isVerifiedSeller={profile.is_verified_seller} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sold">
              {soldListings.length === 0 ? (
                <div className="card-gaming p-8 text-center text-muted-foreground">
                  No sold listings yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {soldListings.map((l) => (
                    <div key={l.id} className="opacity-70">
                      <ListingCard listing={l} isVerifiedSeller={profile.is_verified_seller} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Ratings & Reviews
          </h2>

          {reviews.length === 0 ? (
            <div className="card-gaming p-8 text-center text-muted-foreground">
              No reviews yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[240px_1fr] items-start">
              {/* Rating summary */}
              <div className="card-gaming p-4 space-y-3">
                <div className="text-center">
                  <p className="text-4xl font-display font-bold">{avg.toFixed(1)}</p>
                  <div className="flex justify-center mt-1"><Stars value={avg} /></div>
                  <p className="text-xs text-muted-foreground mt-1">{reviews.length} total reviews</p>
                </div>
                <div className="space-y-1.5">
                  {distribution.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-4 text-muted-foreground">{star}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <Progress value={reviews.length ? (count / reviews.length) * 100 : 0} className="h-1.5 flex-1" />
                      <span className="text-xs w-5 text-right text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review list */}
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="card-gaming p-4">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Stars value={r.rating} size="h-4 w-4" />
                        {r.rating >= 4 && (
                          <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-400">
                            <BadgeCheck className="h-3 w-3 mr-1" />
                            Positive
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SellerProfilePage;
