import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Bell,
  Shield,
  User,
  Palette,
  Zap,
  Trash2,
  LogOut,
  KeyRound,
  Copy,
  Download,
  MessageCircle,
  Info,
  Wallet,
  Languages,
} from 'lucide-react';
import Header from '@/components/Header';
import ThemeAccentSettings from '@/components/ThemeAccentSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Prefs = {
  emailAlerts: boolean;
  pushSounds: boolean;
  newListingAlerts: boolean;
  offerAlerts: boolean;
  messageAlerts: boolean;
  reduceMotion: boolean;
  compactCards: boolean;
  hideBalance: boolean;
  showOnlineStatus: boolean;
  currency: 'INR' | 'USD';
  defaultSort: 'newest' | 'price_low' | 'price_high';
};

const DEFAULTS: Prefs = {
  emailAlerts: true,
  pushSounds: true,
  newListingAlerts: true,
  offerAlerts: true,
  messageAlerts: true,
  reduceMotion: false,
  compactCards: false,
  hideBalance: false,
  showOnlineStatus: true,
  currency: 'INR',
  defaultSort: 'newest',
};

const STORAGE_KEY = 'ffid-settings';

const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

const SettingRow = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="flex items-start gap-3 min-w-0">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <Label className="text-sm font-medium">{title}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (key === 'reduceMotion') {
      document.documentElement.classList.toggle('reduce-motion', Boolean(value));
    }
    toast.success('Setting saved');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
  }, [prefs.reduceMotion]);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Password reset link sent to your email');
  };

  const clearCache = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ffid-cache'))
      .forEach((k) => localStorage.removeItem(k));
    toast.success('Local cache cleared');
  };

  const themeOptions = [
    { value: 'dark', label: 'Dark Mode', icon: Moon },
    { value: 'light', label: 'Light Mode', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Personalize your marketplace experience
            </p>
          </div>
        </div>

        {/* Appearance */}
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    theme === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  }`}
                >
                  <opt.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
            <Separator />
            <SettingRow
              icon={Zap}
              title="Reduce motion"
              description="Turn off heavy animations for a faster feel"
            >
              <Switch
                checked={prefs.reduceMotion}
                onCheckedChange={(v) => update('reduceMotion', v)}
              />
            </SettingRow>
            <Separator />
            <SettingRow
              icon={Palette}
              title="Compact listing cards"
              description="Fit more IDs on the screen"
            >
              <Switch
                checked={prefs.compactCards}
                onCheckedChange={(v) => update('compactCards', v)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={Languages} title="Currency display">
              <Select
                value={prefs.currency}
                onValueChange={(v) => update('currency', v as Prefs['currency'])}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <Separator />
            <SettingRow icon={SettingsIcon} title="Default browse sorting">
              <Select
                value={prefs.defaultSort}
                onValueChange={(v) => update('defaultSort', v as Prefs['defaultSort'])}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </CardContent>
        </Card>

        {/* VIP theme personalization */}
        <ThemeAccentSettings />


        {/* Notifications */}
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow icon={Bell} title="Email alerts" description="Important account emails">
              <Switch
                checked={prefs.emailAlerts}
                onCheckedChange={(v) => update('emailAlerts', v)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={MessageCircle} title="Message alerts" description="Buyer & seller chats">
              <Switch
                checked={prefs.messageAlerts}
                onCheckedChange={(v) => update('messageAlerts', v)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={Wallet} title="Offer alerts" description="New offers on your listings">
              <Switch
                checked={prefs.offerAlerts}
                onCheckedChange={(v) => update('offerAlerts', v)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={Zap} title="New listing alerts" description="Fresh IDs on the market">
              <Switch
                checked={prefs.newListingAlerts}
                onCheckedChange={(v) => update('newListingAlerts', v)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={Bell} title="Notification sounds">
              <Switch
                checked={prefs.pushSounds}
                onCheckedChange={(v) => update('pushSounds', v)}
              />
            </SettingRow>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow
              icon={Wallet}
              title="Hide wallet balance"
              description="Mask your balance in the menu"
            >
              <Switch
                checked={prefs.hideBalance}
                onCheckedChange={(v) => update('hideBalance', v)}
              />
            </SettingRow>
            <Separator />
            <SettingRow
              icon={User}
              title="Show online status"
              description="Let buyers see when you are active"
            >
              <Switch
                checked={prefs.showOnlineStatus}
                onCheckedChange={(v) => update('showOnlineStatus', v)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={KeyRound} title="Password" description="Send a reset link to your email">
              <Button variant="outline" size="sm" onClick={handlePasswordReset} disabled={!user}>
                Reset
              </Button>
            </SettingRow>
            <Separator />
            <SettingRow icon={Trash2} title="Clear local cache" description="Fix stale data issues">
              <Button variant="outline" size="sm" onClick={clearCache}>
                Clear
              </Button>
            </SettingRow>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <>
                <div className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Member since {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {(profile as any)?.vip_tier && (
                    <Badge variant="secondary" className="uppercase">
                      {(profile as any).vip_tier} VIP
                    </Badge>
                  )}
                </div>
                <Separator />
                <SettingRow icon={Copy} title="Referral code" description="Invite friends and earn">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (profile?.referral_code) {
                        navigator.clipboard.writeText(profile.referral_code);
                        toast.success('Referral code copied!');
                      }
                    }}
                  >
                    {profile?.referral_code ?? 'N/A'}
                  </Button>
                </SettingRow>
                <Separator />
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <Link to="/profile">
                    <Button variant="outline" className="w-full">My Profile</Button>
                  </Link>
                  <Link to="/vip">
                    <Button variant="outline" className="w-full">VIP Membership</Button>
                  </Link>
                  <Link to="/add-money">
                    <Button variant="outline" className="w-full">Add Money</Button>
                  </Link>
                  <Link to="/withdraw">
                    <Button variant="outline" className="w-full">Withdraw</Button>
                  </Link>
                </div>
                <Separator className="my-3" />
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={async () => {
                    await signOut();
                    toast.success('Signed out successfully');
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-3">
                Sign in to manage your account settings.
              </p>
            )}
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> About & Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow icon={Download} title="Android app" description="Download the latest APK build">
              <a
                href="https://github.com/mustafizur-01/ffidhub/actions"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">Open</Button>
              </a>
            </SettingRow>
            <Separator />
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">App version</span>
              <span className="font-mono text-xs">FF ID Hub v1.4.0</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SettingsPage;
