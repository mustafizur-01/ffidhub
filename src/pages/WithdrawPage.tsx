import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Wallet,
  Crown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WithdrawalRequest {
  id: string;
  amount: number;
  upi_id: string;
  account_holder: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const MIN_WITHDRAWAL = 50;

const WithdrawPage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [holder, setHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }
    if (user) fetchRequests();
  }, [user, authLoading]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (!error && data) setRequests(data as WithdrawalRequest[]);
    setRequestsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`);
      return;
    }
    if ((profile?.balance ?? 0) < amt) {
      toast.error('Insufficient balance');
      return;
    }
    if (!upi.trim() || !holder.trim()) {
      toast.error('Enter UPI ID and account holder name');
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc('request_withdrawal', {
      _amount: amt,
      _upi_id: upi.trim(),
      _account_holder: holder.trim(),
    });
    setSubmitting(false);

    if (error) {
      toast.error('Could not submit request');
      return;
    }
    const res = data as { ok: boolean; reason?: string };
    if (!res?.ok) {
      const map: Record<string, string> = {
        insufficient_balance: 'Insufficient balance',
        min_amount_50: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`,
        not_authenticated: 'Please log in',
      };
      toast.error(map[res?.reason || ''] || 'Could not submit request');
      return;
    }
    toast.success('Withdrawal request submitted!');
    setAmount('');
    setUpi('');
    setHolder('');
    await refreshProfile();
    fetchRequests();
  };

  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'approved')
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>;
    if (s === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
  };

  if (authLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-lg mx-auto space-y-6">
        <Card className="border-primary/20 bg-card">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Wallet className="h-4 w-4" /> Available Balance
            </p>
            <p className="text-3xl font-bold text-primary">
              ₹{profile?.balance?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5 text-primary" />
              Request Withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Amount (min ₹{MIN_WITHDRAWAL})
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={MIN_WITHDRAWAL}
                  step="1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">UPI ID</label>
                <Input
                  placeholder="yourname@upi"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Account Holder Name
                </label>
                <Input
                  placeholder="Full name as on UPI"
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-md bg-muted/30 border border-border">
                <p className="font-semibold text-foreground">Withdrawal fees</p>
                <p>• Regular: 5% &nbsp;•&nbsp; Bronze VIP: 4%</p>
                <p>• Silver VIP: 2.5% &nbsp;•&nbsp; <span className="text-yellow-400 font-semibold">Gold VIP: 0% (free)</span></p>
                <p className="pt-1">Balance is held on submit. Admin pays out within 24 hours.</p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Banknote className="h-4 w-4 mr-2" />
                )}
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="text-lg">My Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No withdrawal requests yet
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      {statusIcon(r.status)}
                      <div>
                        <p className="font-semibold">₹{r.amount}</p>
                        <p className="text-xs text-muted-foreground">UPI: {r.upi_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {statusBadge(r.status)}
                      {r.admin_note && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[140px]">
                          {r.admin_note}
                        </p>
                      )}
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

export default WithdrawPage;
