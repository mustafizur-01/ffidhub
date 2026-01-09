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
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { IdListing } from '@/types/listing';

const ListingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<IdListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

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

            {/* Email Bind Status */}
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
              <p className="text-secondary-foreground whitespace-pre-wrap">
                {listing.key_items}
              </p>
            </div>

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
    </div>
  );
};

export default ListingDetails;
