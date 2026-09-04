import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Smartphone,
  ShieldCheck,
  Zap,
  Bell,
  Wifi,
  Crown,
  CheckCircle2,
  Share2,
  RefreshCw,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useVipStatus } from '@/hooks/useVipStatus';
import { useAdminRole } from '@/hooks/useAdminRole';
import AdminReleaseUploader from '@/components/AdminReleaseUploader';
import useAppRelease, { APP_VERSION } from '@/hooks/useAppRelease';

const features = [
  { icon: Zap, title: 'Faster than browser', desc: 'App shell loads instantly, no address bar.' },
  { icon: Bell, title: 'Deal alerts', desc: 'Get notified on offers, messages and deposits.' },
  { icon: ShieldCheck, title: 'Same secure escrow', desc: 'All trades stay protected by escrow.' },
  { icon: Wifi, title: 'Low data usage', desc: 'Cached UI means less data on every visit.' },
];

const DownloadPage = () => {
  const { isVip, tier } = useVipStatus();
  const { isAdmin } = useAdminRole();
  const {
    release,
    loading,
    check,
    checkedAt,
    device,
    compatible,
    updateAvailable,
    unseenUpdate,
    markSeen,
    getDownloadUrl,
  } = useAppRelease();
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const onPrompt = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      toast.success('App installed on your device!');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (unseenUpdate && release) {
      toast.info(`Update available: ${release.version}`, {
        description: 'A newer app build is ready to download.',
      });
      markSeen();
    }
  }, [unseenUpdate, release, markSeen]);

  const handleInstall = async () => {
    if (!installEvent) {
      toast.info('Use your browser menu → "Add to Home screen" to install the app.');
      return;
    }
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice?.outcome === 'accepted') toast.success('Installing app...');
    setInstallEvent(null);
  };

  const handleDownloadApk = async () => {
    setDownloading(true);
    try {
      const url = await getDownloadUrl();
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success('APK download started');
      } else {
        toast.info('No APK build uploaded yet — install the web app instead (1-tap install).');
      }
    } catch {
      toast.error('Could not start the download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const hasApk = Boolean(release?.apk_path || release?.apk_external_url);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-3xl">
        {/* Update banner */}
        {updateAvailable && release && (
          <Card className="mb-4 border-primary bg-primary/10">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Update available — {release.version}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You are on {APP_VERSION}. {release.release_notes ?? 'Bug fixes and improvements.'}
                </p>
              </div>
              <Button size="sm" onClick={handleDownloadApk} disabled={downloading}>
                Update
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Hero */}
        <Card className="mb-6 overflow-hidden border-primary/30">
          <div className="bg-gradient-to-br from-primary/20 via-background to-background p-6 flex flex-col sm:flex-row items-center gap-5">
            <img
              src="/images/app-icon-512.png"
              alt="FF ID Hub app icon"
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl shadow-lg"
            />
            <div className="text-center sm:text-left">
              <h1 className="font-display text-2xl font-bold">Get the FF ID Hub App</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Install the app for a faster, full-screen marketplace with instant alerts.
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="secondary">Android</Badge>
                <Badge variant="secondary">Latest {release?.version ?? APP_VERSION}</Badge>
                {release?.size_mb ? <Badge variant="secondary">{release.size_mb} MB</Badge> : null}
                <Badge variant="secondary">Free</Badge>
                {installed && <Badge className="bg-green-600">Installed</Badge>}
              </div>
            </div>
          </div>
          <CardContent className="pt-5 grid gap-2 sm:grid-cols-2">
            <Button variant="gaming" size="lg" className="w-full gap-2" onClick={handleInstall}>
              <Smartphone className="h-5 w-5" />
              {installed ? 'App Installed' : 'Install App (1-tap)'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={handleDownloadApk}
              disabled={downloading || loading}
            >
              <Download className="h-5 w-5" />
              {downloading ? 'Preparing...' : hasApk ? 'Download APK file' : 'APK coming soon'}
            </Button>
          </CardContent>
        </Card>

        {/* Version check */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" /> Version check
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Your version</p>
                <p className="font-mono font-semibold">{APP_VERSION}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Latest version</p>
                <p className="font-mono font-semibold">
                  {loading ? 'Checking...' : (release?.version ?? APP_VERSION)}
                </p>
              </div>
            </div>
            {release?.release_notes && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">What's new: </span>
                {release.release_notes}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {updateAvailable
                  ? 'A newer build is available.'
                  : "You're on the latest version."}
                {checkedAt && ` Checked ${checkedAt.toLocaleTimeString()}`}
              </span>
              <Button variant="outline" size="sm" onClick={check} disabled={loading} className="gap-1">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Check now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Device compatibility */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" /> Device compatibility
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{device.osLabel}</Badge>
              <Badge variant="secondary">{device.browser}</Badge>
              <Badge variant="secondary">
                Requires Android {release?.min_android ?? '7.0'}+
              </Badge>
            </div>
            {device.os === 'android' && compatible === false && (
              <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs">
                  Your Android version is older than the minimum required
                  ({release?.min_android}). The APK may not install — use the 1-tap web app install
                  instead.
                </p>
              </div>
            )}
            {device.os === 'android' && compatible !== false && (
              <div className="flex gap-2 rounded-lg border border-green-500/40 bg-green-500/10 p-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs">Your device is compatible with the Android build.</p>
              </div>
            )}
            {device.os === 'ios' && (
              <div className="flex gap-2 rounded-lg border border-border p-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs">
                  iPhone/iPad cannot install APK files. Open this page in Safari, tap Share → "Add to
                  Home Screen" to get the app icon and full-screen experience.
                </p>
              </div>
            )}
            {!device.isMobile && (
              <div className="flex gap-2 rounded-lg border border-border p-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs">
                  You are on a desktop. Install the app here for a windowed app, or open this page on
                  your Android phone to download the APK.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Why */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isAdmin && <AdminReleaseUploader onPublished={check} />}

        {/* Install steps */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" /> How to install
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(hasApk
              ? [
                  'Tap "Download APK file" — the build is hosted here, no GitHub account needed.',
                  'When Android asks, allow "Install from unknown sources" for your browser.',
                  'Open the downloaded file and tap Install.',
                  'Open FF ID Hub and sign in with your existing account.',
                ]
              : [
                  'Tap "Install App (1-tap)" above — it adds the app icon to your home screen.',
                  'If nothing happens, open your browser menu → "Add to Home screen".',
                  'Launch it from the icon: full screen, no address bar, same account.',
                  'An APK build will appear here automatically once a new release is published.',
                ]
            ).map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-muted-foreground">{step}</p>
              </div>
            ))}
            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              Your wallet, listings and purchases stay exactly the same in the app.
            </div>
          </CardContent>
        </Card>

        {/* VIP */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" /> VIP app perks
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="text-muted-foreground">
              VIP members get early access builds, priority push alerts and the exclusive VIP Lounge
              inside the app.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/vip-lounge">
                <Button variant={isVip ? 'gaming' : 'outline'} size="sm" className="gap-2">
                  <Crown className="h-4 w-4" />
                  {isVip ? `Open VIP Lounge (${tier.toUpperCase()})` : 'See VIP Lounge'}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  const url = window.location.origin;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'FF ID Hub', url });
                      return;
                    } catch {
                      /* cancelled */
                    }
                  }
                  navigator.clipboard.writeText(url);
                  toast.success('App link copied!');
                }}
              >
                <Share2 className="h-4 w-4" /> Share app
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DownloadPage;
