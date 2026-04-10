import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  User,
  Wallet,
  Copy,
  Users,
  Gift,
  Loader2,
  Camera,
  Pencil,
  Check,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
}

const ProfilePage = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalEarned: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      fetchReferralStats();
      setDisplayName(profile.display_name || '');
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
        totalEarned: totalReferrals * 10,
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveName = async () => {
    if (!user) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() || null })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Name updated!');
      setEditingName(false);
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('id-screenshots')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('id-screenshots')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Profile picture updated!');
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingAvatar(false);
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

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : (user.email?.slice(0, 2).toUpperCase() || 'U');

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

            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="h-20 w-20 border-2 border-primary/30">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>

            {/* Display Name */}
            <div>
              <span className="text-sm text-muted-foreground">Name</span>
              {editingName ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-8"
                  />
                  <Button size="sm" variant="gaming" onClick={handleSaveName} disabled={savingName}>
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-medium">{profile?.display_name || 'Not set'}</p>
                  <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-primary">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

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

          {/* Wallet Card */}
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
              <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyReferralCode}>
                <Copy className="h-4 w-4 mr-1" /> Copy Code
              </Button>
              <Button variant="gaming" size="sm" className="flex-1" onClick={handleCopyReferralLink}>
                <Copy className="h-4 w-4 mr-1" /> Copy Link
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
