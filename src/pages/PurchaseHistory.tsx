import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ShoppingBag, ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PurchaseWithListing {
  id: string;
  status: string;
  created_at: string;
  listing: {
    id: string;
    id_level: number;
    login_method: string;
    key_items: string;
    price: number;
    image_url: string | null;
    is_email_binded: boolean;
  } | null;
}

const PurchaseHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<PurchaseWithListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }
    if (user) fetchPurchases();
  }, [user, authLoading]);

  const fetchPurchases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, status, created_at, listing_id')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch listing details for each purchase
      const listingIds = (data || []).map(p => p.listing_id);
      const { data: listings } = await supabase
        .from('id_listings')
        .select('id, id_level, login_method, key_items, price, image_url, is_email_binded')
        .in('id', listingIds);

      const listingMap = new Map(listings?.map(l => [l.id, l]) || []);

      setPurchases(
        (data || []).map(p => ({
          id: p.id,
          status: p.status,
          created_at: p.created_at,
          listing: listingMap.get(p.listing_id) || null,
        }))
      );
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    approved: { icon: <CheckCircle className="h-3 w-3" />, label: 'Approved', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    pending: { icon: <Clock className="h-3 w-3" />, label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    rejected: { icon: <XCircle className="h-3 w-3" />, label: 'Rejected', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Purchases</h1>
            <p className="text-muted-foreground mt-1">View all IDs you have purchased</p>
          </div>

          {purchases.length === 0 ? (
            <Card className="card-gaming">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Purchases Yet</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  You haven't purchased any IDs yet. Browse the marketplace to find one!
                </p>
                <Button variant="gaming" asChild>
                  <Link to="/">Browse IDs</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {purchases.map((purchase) => {
                const listing = purchase.listing;
                const status = statusConfig[purchase.status] || statusConfig.pending;

                return (
                  <Card key={purchase.id} className="card-gaming overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {/* Image */}
                        <div className="w-full sm:w-40 h-32 sm:h-auto bg-muted flex-shrink-0">
                          {listing?.image_url ? (
                            <img src={listing.image_url} alt="ID Screenshot" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {listing && (
                                <>
                                  <Badge variant="outline">Level {listing.id_level}</Badge>
                                  <Badge variant="secondary">{listing.login_method}</Badge>
                                  {listing.is_email_binded && (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                      Email Secured
                                    </Badge>
                                  )}
                                </>
                              )}
                              <Badge className={status.className}>
                                {status.icon}
                                <span className="ml-1">{status.label}</span>
                              </Badge>
                            </div>
                            {listing && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {listing.key_items}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Purchased {new Date(purchase.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            {listing && (
                              <p className="text-2xl font-bold text-primary">
                                {formatPrice(listing.price)}
                              </p>
                            )}
                            {listing && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/listing/${listing.id}`}>
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PurchaseHistory;
