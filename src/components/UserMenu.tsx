import { Link } from 'react-router-dom';
import {
  User,
  Wallet,
  Copy,
  LogOut,
  Users,
  ChevronDown,
  Package,
  Shield,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { toast } from 'sonner';

const UserMenu = () => {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdminRole();

  const handleCopyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success('Referral code copied!');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(balance);
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-3 w-3 text-primary" />
          </div>
          <span className="hidden sm:inline text-sm truncate max-w-[100px]">
            {user.email?.split('@')[0]}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Balance - Read Only */}
        <DropdownMenuItem className="flex items-center justify-between cursor-default">
          <span className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Balance
          </span>
          <span className="font-bold text-primary">
            {formatBalance(profile?.balance || 0)}
          </span>
        </DropdownMenuItem>

        {/* Referral Code */}
        <DropdownMenuItem onClick={handleCopyReferralCode} className="cursor-pointer">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Referral Code
          </span>
          <span className="ml-auto flex items-center gap-1 font-mono text-xs">
            {profile?.referral_code}
            <Copy className="h-3 w-3" />
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {isAdmin && (
          <Link to="/admin">
            <DropdownMenuItem className="cursor-pointer text-primary">
              <Shield className="h-4 w-4 mr-2" />
              Admin Dashboard
            </DropdownMenuItem>
          </Link>
        )}

        <Link to="/my-listings">
          <DropdownMenuItem className="cursor-pointer">
            <Package className="h-4 w-4 mr-2" />
            My Listings
          </DropdownMenuItem>
        </Link>

        <Link to="/profile">
          <DropdownMenuItem className="cursor-pointer">
            <User className="h-4 w-4 mr-2" />
            My Profile
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
