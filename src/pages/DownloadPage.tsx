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
  Github,
  Share2,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useVipStatus } from '@/hooks/useVipStatus';

const APK_BUILD_URL = 'https://github.com/mustafizur-01/ffidhub/actions';

const features = [
  { icon: Zap, title: 'Faster than browser', desc: 'App shell loads instantly, no address bar.' },
  { icon: Bell, title: 'Deal alerts', desc: 'Get notified on offers, messages and deposits.' },
  { icon: ShieldCheck, title: 'Same secure escrow', desc: 'All trades stay protected by escrow.' },
  { icon: Wifi, title: 'Low data usage', desc: 'Cached UI means less data on every visit.' },
];

const DownloadPage = () => {
  const { isVip, tier } = useVipStatus();
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

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

  const handleShare = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FF MAX ID Market', url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    navigator.clipboard.writeText(url);
    toast.success('App link copied!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-3xl">
        {/* Hero */}
        <Card className="mb-6 overflow-hidden border-primary/30">
          <div className="bg-gradient-to-br from-primary/20 via-background to-background p-6 flex flex-col sm:flex-row items-center gap-5">
            <img
              src="/images/app-icon-512.png"
              alt="FF MAX ID Market app icon"
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl shadow-lg"
            />
            <div className="text-center sm:text-left">
              <h1 className="font-display text-2xl font-bold">Get the FF MAX ID Market App</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Install the Android app for a faster, full-screen marketplace with instant alerts.
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="secondary">Android</Badge>
                <Badge variant="secondary">v1.4.0</Badge>
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
            <a href={APK_BUILD_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="w-full gap-2">
                <Download className="h-5 w-5" />
                Download APK file
              </Button>
            </a>
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

        {/* APK install steps */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Github className="h-4 w-4 text-primary" /> How to install the APK
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              'Tap "Download APK file" — it opens the latest build page.',
              'Open the newest successful build and download the "ffidhub-apk" artifact.',
              'Unzip it if needed, then tap app-debug.apk on your phone.',
              'Allow "Install from unknown sources" when Android asks.',
              'Open FF ID Hub and sign in with your existing account.',
            ].map((step, i) => (
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
              <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
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
