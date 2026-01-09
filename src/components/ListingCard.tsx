import { IdListing } from '@/types/listing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Shield, ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ListingCardProps {
  listing: IdListing;
}

const ListingCard = ({ listing }: ListingCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="card-gaming card-gaming-hover overflow-hidden group">
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
        <div className="absolute top-3 right-3">
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
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="badge-method">{listing.login_method}</span>
          <span className="font-display text-xl font-bold text-primary">
            {formatPrice(listing.price)}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {listing.key_items}
        </p>

        <Link to={`/listing/${listing.id}`}>
          <Button variant="gaming" className="w-full" size="sm">
            <Eye className="h-4 w-4" />
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ListingCard;
