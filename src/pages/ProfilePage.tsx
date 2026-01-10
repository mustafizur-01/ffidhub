import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  User,
  Wallet,
  Copy,
  Users,
  Gift,
  ShoppingBag,
  Check,
  Loader2,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
}

const ProfilePage = () => {
  const { user, profile, loading } = useAuth();
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalEarned: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchReferralStats();
    }
  }, [profile]);

  const fetchReferralStats = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', profile.id);

      if (error) throw error;

      const totalReferrals = data?.length || 0;
      setReferralStats({
        totalReferrals,
        totalEarned: totalReferrals * 10, // ₹10 per referral
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCopyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success('Referral code copied to clipboard!');
    }
  };

  const handleCopyReferralLink = () => {
    if (profile?.referral_code) {
      const link = `${window.location.origin}?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied!');
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(balance);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-10">
        <h1 className="font-display text-3xl font-bold mb-8">
          <User className="inline-block h-8 w-8 mr-2 text-primary" />
          My Profile
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Account Info Card */}
          <div className="card-gaming p-6 space-y-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account Info
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Member Since</span>
                <p className="font-medium">
                  {new Date(user.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Card - Read Only */}
          <div className="card-gaming p-6 space-y-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Wallet Balance
            </h2>
            <div className="text-center py-4">
              <p className="font-display text-4xl font-bold text-gradient">
                {formatBalance(profile?.balance || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Balance is managed by admin
              </p>
            </div>
            {profile?.referral_reward_claimed && (
              <Badge className="w-full justify-center bg-gaming-success/20 text-gaming-success border-gaming-success/30">
                <Gift className="h-4 w-4 mr-1" />
                Referral Bonus Claimed!
              </Badge>
            )}
          </div>

          {/* Referral Card */}
          <div className="card-gaming p-6 space-y-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Referral Program
            </h2>
            
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <span className="text-sm text-muted-foreground">Your Code</span>
              <div className="font-mono text-2xl font-bold text-primary mt-1">
                {profile?.referral_code}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCopyReferralCode}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Code
              </Button>
              <Button
                variant="gaming"
                size="sm"
                className="flex-1"
                onClick={handleCopyReferralLink}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Link
              </Button>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              {loadingStats ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Friends Referred</span>
                    <span className="font-bold">{referralStats.totalReferrals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Earned</span>
                    <span className="font-bold text-gaming-success">
                      {formatBalance(referralStats.totalEarned)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Earn ₹10 for every friend who signs up with your code!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
