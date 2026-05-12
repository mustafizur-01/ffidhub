import { BadgeCheck, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface VerifiedSellerBadgeProps {
  verified: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const VerifiedSellerBadge = ({ verified, size = 'sm', className }: VerifiedSellerBadgeProps) => {
  if (verified) {
    return (
      <Badge
        className={cn(
          'bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 flex items-center gap-1',
          size === 'md' && 'px-3 py-1 text-sm',
          className
        )}
      >
        <BadgeCheck className={cn(size === 'md' ? 'h-4 w-4' : 'h-3 w-3')} />
        Verified Seller
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className={cn(
        'bg-muted text-muted-foreground border border-border flex items-center gap-1',
        size === 'md' && 'px-3 py-1 text-sm',
        className
      )}
    >
      <ShieldAlert className={cn(size === 'md' ? 'h-4 w-4' : 'h-3 w-3')} />
      Not Verified
    </Badge>
  );
};

export default VerifiedSellerBadge;
