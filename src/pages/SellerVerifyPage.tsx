import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BadgeCheck, Loader2, Upload, Clock, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface VerificationRequest {
  id: string;
  full_name: string;
  phone: string;
  ff_uid: string;
  in_game_name: string;
  experience: string | null;
  reason: string | null;
  screenshot_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export default function SellerVerifyPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [ign, setIgn] = useState('');
  const [experience, setExperience] = useState('');
  const [reason, setReason] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }
    if (user) fetchRequests();
  }, [user, authLoading]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('seller_verification_requests')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (!error && data) setRequests(data as VerificationRequest[]);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !ffUid.trim() || !ign.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      let path: string | null = null;
      if (screenshot) {
        const ext = screenshot.name.split('.').pop() || 'jpg';
        path = `${user!.id}/verify-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('payment-proofs')
          .upload(path, screenshot, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
      }

      const { error } = await (supabase as any)
        .from('seller_verification_requests')
        .insert({
          user_id: user!.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          ff_uid: ffUid.trim(),
          in_game_name: ign.trim(),
          experience: experience.trim() || null,
          reason: reason.trim() || null,
          screenshot_url: path,
        });
      if (error) throw error;

      toast.success('Verification request submitted! Admin will review shortly.');
      setFullName('');
      setPhone('');
      setFfUid('');
      setIgn('');
      setExperience('');
      setReason('');
      setScreenshot(null);
      setScreenshotPreview(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };
  const statusBadge = (s: string) => {
    if (s === 'approved') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
    if (s === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasPending = requests.some((r) => r.status === 'pending');
  const alreadyVerified = !!(profile as any)?.is_verified_seller;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold">
            Become a <span className="text-gradient">Verified Seller</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Build buyer trust, get the verified badge, and boost your sales.
          </p>
        </div>

        {alreadyVerified ? (
          <Card className="border-green-500/40 bg-card">
            <CardContent className="pt-6 text-center space-y-2">
              <BadgeCheck className="h-12 w-12 text-green-400 mx-auto" />
              <p className="font-display text-xl font-bold text-green-400">You are already verified!</p>
              <p className="text-sm text-muted-foreground">
                Your listings show the verified seller badge.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BadgeCheck className="h-5 w-5 text-primary" />
                Verification Application
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasPending ? (
                <p className="text-center text-muted-foreground py-4">
                  Your request is under review. Please wait for admin approval.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Full Name *</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Phone / WhatsApp *</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="+91..." />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Free Fire UID *</label>
                    <Input value={ffUid} onChange={(e) => setFfUid(e.target.value)} maxLength={30} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">In-Game Name *</label>
                    <Input value={ign} onChange={(e) => setIgn(e.target.value)} maxLength={50} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Selling Experience</label>
                    <Input
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. 2 years selling FF IDs"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Why should we verify you?</label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Tell us about your reputation, past sales, etc."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Proof Screenshot (ID profile, past sales, etc.)
                    </label>
                    <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/20">
                      {screenshotPreview ? (
                        <>
                          <img src={screenshotPreview} alt="Proof preview" className="max-h-40 rounded" />
                          <p className="text-xs text-muted-foreground">Click to change</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-primary" />
                          <p className="text-sm">Upload proof screenshot</p>
                          <p className="text-xs text-muted-foreground">PNG / JPG, max 5MB</p>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />}
                    Submit Application
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="text-lg">My Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No applications yet</p>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-start gap-3">
                      {statusIcon(r.status)}
                      <div>
                        <p className="font-semibold text-sm">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">FF UID: {r.ff_uid}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}
                        </p>
                        {r.admin_note && (
                          <p className="text-xs mt-1 text-muted-foreground italic">
                            Note: {r.admin_note}
                          </p>
                        )}
                      </div>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
