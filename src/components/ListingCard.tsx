import { IdListing } from '@/types/listing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Shield, ShieldOff, Sparkles, Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';
import VerifiedSellerBadge from '@/components/VerifiedSellerBadge';
import FavoriteButton from '@/components/FavoriteButton';

interface ListingCardProps {
  listing: IdListing & { featured_until?: string | null; listing_type?: string };
  isSold?: boolean;
  isVerifiedSeller?: boolean;
  sellerName?: string | null;
  sellerAvatar?: string | null;
}

const ListingCard = ({ listing, isSold = false, isVerifiedSeller = false, sellerName, sellerAvatar }: ListingCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const isFeatured = listing.featured_until && new Date(listing.featured_until) > new Date();
  const isAuction = listing.listing_type === 'auction';

  return (
    <div className={`card-gaming card-gaming-hover overflow-hidden group relative ${isSold ? 'opacity-75' : ''} ${isFeatured ? 'card-featured' : ''}`}>
      {isFeatured && !isSold && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 ribbon-featured flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> FEATURED
        </div>
      )}
      {isAuction && !isSold && (
        <div className="absolute bottom-[5.5rem] left-3 z-20 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 animate-pulse">
          <Gavel className="h-3 w-3" /> AUCTION
        </div>
      )}
      {/* Sold Overlay */}
      {isSold && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Badge className="bg-destructive text-destructive-foreground text-lg px-4 py-2 font-display font-bold tracking-wider rotate-[-12deg] shadow-lg">
            SOLD OUT
          </Badge>
        </div>
      )}

      {/* Image Section */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={`Level ${listing.id_level} ID`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
            <span className="font-display text-4xl text-muted-foreground/50">FF</span>
          </div>
        )}
        
        {/* Level Badge */}
        <div className="absolute top-3 left-3">
          <span className="badge-level">LVL {listing.id_level}</span>
        </div>

        {/* Email Bind Status */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {listing.is_email_binded ? (
            <Badge className="bg-gaming-success/90 text-white border-0 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Secured
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <ShieldOff className="h-3 w-3" />
              Not Bound
            </Badge>
          )}
        </div>

        {/* Favorite Heart */}
        {!isSold && (
          <div className="absolute bottom-3 right-3 z-20">
            <FavoriteButton listingId={listing.id} />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={sellerAvatar || undefined} alt={sellerName || 'Seller'} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-display">
                {sellerName?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{sellerName || 'Unknown Seller'}</span>
          </div>
          <span className="badge-method shrink-0">{listing.login_method}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <VerifiedSellerBadge verified={isVerifiedSeller} />
          <span className="font-display text-xl font-bold text-primary">
            {formatPrice(listing.price)}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {listing.key_items}
        </p>

        <Link to={`/listing/${listing.id}`}>
          <Button variant={isSold ? "secondary" : "gaming"} className="w-full" size="sm" disabled={isSold}>
            <Eye className="h-4 w-4" />
            {isSold ? 'Sold Out' : 'View Details'}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ListingCard;
