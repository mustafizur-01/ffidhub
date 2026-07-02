import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, QrCode, Clock, CheckCircle, XCircle, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DepositRequest {
  id: string;
  amount: number;
  utr_number: string;
  status: string;
  admin_note: string | null;
  screenshot_url: string | null;
  created_at: string;
}

const AddMoneyPage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }
    if (user) fetchDeposits();
  }, [user, authLoading]);

  const fetchDeposits = async () => {
    const { data, error } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (!error && data) setDeposits(data);
    setDepositsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!utrNumber.trim()) {
      toast.error('Please enter Transaction ID / UTR');
      return;
    }
    if (!screenshot) {
      toast.error('Please upload payment screenshot as proof');
      return;
    }

    setSubmitting(true);
    try {
      // Upload screenshot to per-user folder
      const ext = screenshot.name.split('.').pop() || 'jpg';
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, screenshot, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { error } = await supabase.from('deposit_requests').insert({
        user_id: user!.id,
        amount: amt,
        utr_number: utrNumber.trim(),
        screenshot_url: path,
      });
      if (error) throw error;

      toast.success('Deposit request submitted! Balance will be added after admin approval.');
      setAmount('');
      setUtrNumber('');
      setScreenshot(null);
      setScreenshotPreview(null);
      fetchDeposits();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
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

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-lg mx-auto space-y-6">
        {/* Balance */}
        <Card className="border-primary/20 bg-card">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-primary">₹{profile?.balance?.toFixed(2) || '0.00'}</p>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card className="border-primary/20 bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <QrCode className="h-5 w-5 text-primary" />
              Pay with PhonePe
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="bg-white rounded-xl p-3 shadow-md">
              <img src="/images/phonepe-qr.jpg" alt="PhonePe QR Code" className="w-56 h-56 object-contain" />
            </div>
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>1. Scan the QR code above</p>
              <p>2. Make the payment</p>
              <p>3. Enter the Transaction ID / UTR below</p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Form */}
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IndianRupee className="h-5 w-5 text-primary" />
              Deposit Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Transaction ID / UTR Number</label>
                <Input
                  placeholder="Enter UTR number after payment"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Payment Screenshot (Proof)</label>
                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/20">
                  {screenshotPreview ? (
                    <>
                      <img src={screenshotPreview} alt="Payment proof preview" className="max-h-40 rounded" />
                      <p className="text-xs text-muted-foreground">Click to change</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-primary" />
                      <p className="text-sm">Upload payment screenshot</p>
                      <p className="text-xs text-muted-foreground">PNG / JPG, max 5MB</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <IndianRupee className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Deposit History */}
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="text-lg">My Deposit History</CardTitle>
          </CardHeader>
          <CardContent>
            {depositsLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : deposits.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No deposit requests yet</p>
            ) : (
              <div className="space-y-3">
                {deposits.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      {statusIcon(d.status)}
                      <div>
                        <p className="font-semibold">₹{d.amount}</p>
                        <p className="text-xs text-muted-foreground">UTR: {d.utr_number}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {statusBadge(d.status)}
                      {d.admin_note && <p className="text-xs text-muted-foreground mt-1">{d.admin_note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddMoneyPage;
