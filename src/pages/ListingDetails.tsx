import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  ShieldOff,
  MessageCircle,
  Calendar,
  Tag,
  Loader2,
  Lock,
  ShoppingCart,
  Check,
  Clock,
  Send,
  Wallet,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { IdListing } from '@/types/listing';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from '@/components/AuthModal';
import MessageModal from '@/components/MessageModal';
import { toast } from 'sonner';

interface Purchase {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
}

const ListingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [listing, setListing] = useState<IdListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      fetchPurchaseStatus();
    }
  }, [id, user]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('id_listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setListing(data as IdListing);
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, status')
        .eq('listing_id', id)
        .eq('buyer_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setPurchase(data as Purchase | null);
    } catch (error) {
      console.error('Error fetching purchase status:', error);
    }
  };

  const handleBuyWithBalance = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!profile) {
      toast.error('Profile not found. Please try again.');
      return;
    }

    if (profile.balance < (listing?.price || 0)) {
      toast.error(`Insufficient balance! You need ${formatPrice(listing?.price || 0)} but have ${formatPrice(profile.balance)}`);
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-purchase', {
        body: { listing_id: id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setPurchase({ id: data.purchase.id, status: 'approved' as const });
      await refreshProfile();
      toast.success('Purchase successful! Account details are now visible.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleWhatsAppContact = () => {
    if (listing) {
      const message = `Hi! I'm interested in your Free Fire MAX ID (Level ${listing.id_level}) listed at ${formatPrice(listing.price)}`;
      const encodedMessage = encodeURIComponent(message);
      window.open(
        `https://wa.me/91${listing.contact_number}?text=${encodedMessage}`,
        '_blank'
      );
    }
  };

  const isPurchaseApproved = purchase?.status === 'approved';
  const canViewSensitiveData = isPurchaseApproved;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">
            Listing Not Found
          </h1>
          <Link to="/">
            <Button variant="gaming">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-10">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="card-gaming overflow-hidden">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={`Level ${listing.id_level} ID`}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
                <span className="font-display text-6xl text-muted-foreground/50">
                  FF
                </span>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Level & Price */}
            <div className="card-gaming p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="badge-level text-lg">
                    Level {listing.id_level}
                  </span>
                  <p className="text-sm text-muted-foreground mt-2">
                    Login via {listing.login_method}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold text-gradient">
                    {formatPrice(listing.price)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Listed on {formatDate(listing.created_at)}
              </div>
            </div>

            {/* Email Bind Status - Protected Section */}
            <div className="card-gaming p-6">
              <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Email Bind Status
              </h3>

              {listing.is_email_binded ? (
                <div className="space-y-3">
                  <Badge className="bg-gaming-success/90 text-white border-0">
                    <Shield className="h-4 w-4 mr-1" />
                    Email Secured
                  </Badge>
                  
                  {/* Protected Data - Only visible after payment approval */}
                  {canViewSensitiveData ? (
                    <>
                      {listing.binded_email && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Bound to: </span>
                          <span className="font-medium">{listing.binded_email}</span>
                        </p>
                      )}
                      {listing.security_code && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Security Code: </span>
                          <span className="font-mono font-medium">
                            {listing.security_code}
                          </span>
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Account Details Hidden</p>
                        <p className="text-xs text-muted-foreground">
                          Email & security code visible after payment approval
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  <ShieldOff className="h-4 w-4" />
                  Not Email Bound
                </Badge>
              )}
            </div>

            {/* Key Items */}
            <div className="card-gaming p-6">
              <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Key Items
              </h3>
              <div className="flex flex-wrap gap-2">
                {listing.key_items.split(',').map((item, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {item.trim()}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Purchase Status / Actions */}
            {purchase ? (
              <div className="card-gaming p-4">
                {purchase.status === 'pending' && (
                  <div className="flex items-center gap-3 text-yellow-500">
                    <Clock className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Payment Pending</p>
                      <p className="text-sm text-muted-foreground">
                        Contact seller to arrange payment. Admin will approve once confirmed.
                      </p>
                    </div>
                  </div>
                )}
                {purchase.status === 'approved' && (
                  <div className="flex items-center gap-3 text-gaming-success">
                    <Check className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Payment Approved!</p>
                      <p className="text-sm text-muted-foreground">
                        You can now view the account details above.
                      </p>
                    </div>
                  </div>
                )}
                {purchase.status === 'rejected' && (
                  <div className="flex items-center gap-3 text-destructive">
                    <ShieldOff className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Purchase Rejected</p>
                      <p className="text-sm text-muted-foreground">
                        Contact support for more information.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="gaming"
                size="xl"
                className="w-full"
                onClick={handleRequestPurchase}
                disabled={purchasing}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    Request to Buy
                  </>
                )}
              </Button>
            )}

            {/* In-App Message Button */}
            {listing.seller_id !== user?.id && (
              <Button
                variant="outline"
                size="xl"
                className="w-full"
                onClick={() => {
                  if (!user) {
                    setAuthModalOpen(true);
                  } else {
                    setMessageModalOpen(true);
                  }
                }}
              >
                <Send className="h-5 w-5" />
                Message Seller
              </Button>
            )}

            {/* WhatsApp Button */}
            <Button
              variant="whatsapp"
              size="xl"
              className="w-full"
              onClick={handleWhatsAppContact}
            >
              <MessageCircle className="h-5 w-5" />
              Contact Seller on WhatsApp
            </Button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab="login"
      />

      {listing && user && (
        <MessageModal
          isOpen={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          listingId={listing.id}
          sellerId={listing.seller_id || ''}
        />
      )}
    </div>
  );
};

export default ListingDetails;
