import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Crown, Megaphone, CheckCircle, XCircle, RefreshCw, ShieldCheck, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Dispute = {
  id: string;
  buyer_id: string;
  listing_id: string;
  status: string;
  dispute_reason: string | null;
  disputed_at: string | null;
  created_at: string;
  buyer_email?: string;
  seller_email?: string;
  price?: number;
  id_level?: number;
};

type VipReq = {
  id: string;
  user_id: string;
  tier: string;
  amount: number;
  utr_number: string | null;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  user_email?: string;
};


type SellerVerReq = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  ff_uid: string;
  in_game_name: string;
  experience: string | null;
  reason: string | null;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  user_email?: string;
};

export default function AdminExtraTools() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(true);
  const [vipReqs, setVipReqs] = useState<VipReq[]>([]);
  const [vipLoading, setVipLoading] = useState(true);
  const [vipImageUrls, setVipImageUrls] = useState<Record<string, string>>({});
  const [verReqs, setVerReqs] = useState<SellerVerReq[]>([]);
  const [verLoading, setVerLoading] = useState(true);
  const [verNote, setVerNote] = useState<Record<string, string>>({});
  const [verImageUrls, setVerImageUrls] = useState<Record<string, string>>({});


  const [resolveTarget, setResolveTarget] = useState<{ p: Dispute; action: 'release' | 'refund' } | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [busy, setBusy] = useState(false);

  const [vipNote, setVipNote] = useState<Record<string, string>>({});

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchDisputes = async () => {
    setDisputesLoading(true);
    try {
      const { data: purch, error } = await supabase
        .from('purchases')
        .select('id, buyer_id, listing_id, status, dispute_reason, disputed_at, created_at')
        .eq('status', 'disputed')
        .order('disputed_at', { ascending: false });
      if (error) throw error;

      const buyerIds = [...new Set((purch || []).map((p) => p.buyer_id))];
      const listingIds = [...new Set((purch || []).map((p) => p.listing_id))];

      const [{ data: buyers }, { data: listings }] = await Promise.all([
        buyerIds.length
          ? supabase.from('profiles').select('user_id, email').in('user_id', buyerIds)
          : Promise.resolve({ data: [] as any[] }),
        listingIds.length
          ? supabase
              .from('id_listings')
              .select('id, id_level, price, seller_id')
              .in('id', listingIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const sellerIds = [...new Set((listings || []).map((l: any) => l.seller_id).filter(Boolean))];
      const { data: sellers } = sellerIds.length
        ? await supabase.from('profiles').select('user_id, email').in('user_id', sellerIds)
        : { data: [] as any[] };

      const buyerMap = new Map((buyers || []).map((b: any) => [b.user_id, b.email]));
      const sellerMap = new Map((sellers || []).map((s: any) => [s.user_id, s.email]));
      const listMap = new Map((listings || []).map((l: any) => [l.id, l]));

      setDisputes(
        (purch || []).map((p) => {
          const l = listMap.get(p.listing_id);
          return {
            ...p,
            buyer_email: buyerMap.get(p.buyer_id) || 'Unknown',
            seller_email: l ? sellerMap.get(l.seller_id) || 'Unknown' : 'Unknown',
            price: l?.price,
            id_level: l?.id_level,
          };
        })
      );
    } catch (e: any) {
      toast.error(e.message || 'Failed to load disputes');
    } finally {
      setDisputesLoading(false);
    }
  };

  const fetchVipRequests = async () => {
    setVipLoading(true);
    try {
      const { data, error } = await supabase
        .from('vip_subscriptions')
        .select('id, user_id, tier, amount, utr_number, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = [...new Set((data || []).map((v) => v.user_id))];
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('user_id, email').in('user_id', ids)
        : { data: [] as any[] };
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.email]));
      setVipReqs((data || []).map((v) => ({ ...v, user_email: map.get(v.user_id) || 'Unknown' })));
    } catch (e: any) {
      toast.error(e.message || 'Failed to load VIP requests');
    } finally {
      setVipLoading(false);
    }
  };

  const fetchVerRequests = async () => {
    setVerLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('seller_verification_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = [...new Set((data || []).map((v: any) => v.user_id))] as string[];
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('user_id, email').in('user_id', ids)
        : { data: [] as any[] };
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.email]));

      const rows: SellerVerReq[] = (data || []).map((r: any) => ({
        ...r,
        user_email: map.get(r.user_id) || 'Unknown',
      }));
      setVerReqs(rows);

      // Signed URLs for screenshots
      const urlMap: Record<string, string> = {};
      await Promise.all(
        rows.map(async (r) => {
          if (r.screenshot_url) {
            const { data: signed } = await supabase.storage
              .from('payment-proofs')
              .createSignedUrl(r.screenshot_url, 3600);
            if (signed?.signedUrl) urlMap[r.id] = signed.signedUrl;
          }
        })
      );
      setVerImageUrls(urlMap);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load verification requests');
    } finally {
      setVerLoading(false);
    }
  };

  const handleVerification = async (r: SellerVerReq, approve: boolean) => {
    try {
      const { data, error } = await supabase.rpc('admin_approve_seller_verification' as any, {
        _req_id: r.id,
        _approve: approve,
        _note: verNote[r.id] || null,
      } as any);
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.reason || 'Failed');
      toast.success(approve ? 'Seller verified' : 'Request rejected');
      fetchVerRequests();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  useEffect(() => {
    fetchDisputes();
    fetchVipRequests();
    fetchVerRequests();
  }, []);

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('admin_resolve_dispute', {
        _purchase_id: resolveTarget.p.id,
        _action: resolveTarget.action,
        _note: resolveNote || null,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.reason || 'Failed');
      toast.success(
        resolveTarget.action === 'release' ? 'Escrow released to seller' : 'Buyer refunded'
      );
      setResolveTarget(null);
      setResolveNote('');
      fetchDisputes();
    } catch (e: any) {
      toast.error(e.message || 'Failed to resolve');
    } finally {
      setBusy(false);
    }
  };

  const handleVip = async (v: VipReq, approve: boolean) => {
    try {
      const { data, error } = await supabase.rpc('admin_approve_vip', {
        _sub_id: v.id,
        _approve: approve,
        _note: vipNote[v.id] || null,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.reason || 'Failed');
      toast.success(approve ? 'VIP activated' : 'VIP rejected');
      fetchVipRequests();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error('Title and body required');
      return;
    }
    setBroadcasting(true);
    try {
      const { data: profs, error: pe } = await supabase.from('profiles').select('user_id');
      if (pe) throw pe;
      const rows = (profs || []).map((p: any) => ({
        user_id: p.user_id,
        type: 'announcement',
        title: broadcastTitle,
        body: broadcastBody,
        link: broadcastLink || null,
      }));
      if (!rows.length) {
        toast.error('No users to notify');
        return;
      }
      // Chunk to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const { error } = await supabase.from('notifications').insert(rows.slice(i, i + chunkSize));
        if (error) throw error;
      }
      toast.success(`Sent to ${rows.length} users`);
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastLink('');
    } catch (e: any) {
      toast.error(e.message || 'Broadcast failed');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <>
      {/* Disputes */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Dispute Resolution
            {disputes.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {disputes.length} open
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={fetchDisputes}
              disabled={disputesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${disputesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {disputesLoading ? (
            <Skeleton className="h-32" />
          ) : disputes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No open disputes 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>ID Lvl</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">{d.buyer_email}</TableCell>
                      <TableCell className="text-sm">{d.seller_email}</TableCell>
                      <TableCell>{d.id_level ?? '-'}</TableCell>
                      <TableCell className="font-bold">₹{d.price ?? '-'}</TableCell>
                      <TableCell className="max-w-xs text-xs">{d.dispute_reason || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {d.disputed_at ? format(new Date(d.disputed_at), 'dd MMM, hh:mm a') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setResolveTarget({ p: d, action: 'release' })}
                          >
                            Release
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setResolveTarget({ p: d, action: 'refund' })}
                          >
                            Refund
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIP Requests */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" />
            VIP Subscription Requests
            {vipReqs.length > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {vipReqs.length} pending
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={fetchVipRequests}
              disabled={vipLoading}
            >
              <RefreshCw className={`h-4 w-4 ${vipLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vipLoading ? (
            <Skeleton className="h-32" />
          ) : vipReqs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending VIP requests</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>UTR</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vipReqs.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{v.user_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {v.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">₹{v.amount}</TableCell>
                      <TableCell className="font-mono text-xs">{v.utr_number}</TableCell>
                      <TableCell>
                        <Input
                          placeholder="Optional note"
                          value={vipNote[v.id] || ''}
                          onChange={(e) =>
                            setVipNote((s) => ({ ...s, [v.id]: e.target.value }))
                          }
                          className="min-w-[140px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleVip(v, true)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVip(v, false)}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seller Verification Requests */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Seller Verification Requests
            {verReqs.length > 0 && (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {verReqs.length} pending
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={fetchVerRequests}
              disabled={verLoading}
            >
              <RefreshCw className={`h-4 w-4 ${verLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {verLoading ? (
            <Skeleton className="h-32" />
          ) : verReqs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending verification requests</p>
          ) : (
            <div className="space-y-4">
              {verReqs.map((r) => (
                <div key={r.id} className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">User:</span> {r.user_email}</div>
                    <div><span className="text-muted-foreground">Name:</span> {r.full_name}</div>
                    <div><span className="text-muted-foreground">Phone:</span> {r.phone}</div>
                    <div><span className="text-muted-foreground">FF UID:</span> {r.ff_uid}</div>
                    <div><span className="text-muted-foreground">In-Game Name:</span> {r.in_game_name}</div>
                    <div><span className="text-muted-foreground">Experience:</span> {r.experience || '-'}</div>
                    <div className="md:col-span-2"><span className="text-muted-foreground">Reason:</span> {r.reason || '-'}</div>
                    <div className="text-xs text-muted-foreground md:col-span-2">
                      Submitted {format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}
                    </div>
                  </div>
                  {verImageUrls[r.id] && (
                    <a
                      href={verImageUrls[r.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> View proof screenshot
                    </a>
                  )}
                  <Input
                    placeholder="Optional note to applicant"
                    value={verNote[r.id] || ''}
                    onChange={(e) => setVerNote((s) => ({ ...s, [r.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleVerification(r, true)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleVerification(r, false)}
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Broadcast */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Broadcast Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title (e.g. Scheduled maintenance)"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            maxLength={100}
          />
          <Textarea
            placeholder="Message body shown to every user"
            value={broadcastBody}
            onChange={(e) => setBroadcastBody(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <Input
            placeholder="Optional link (e.g. /tournaments)"
            value={broadcastLink}
            onChange={(e) => setBroadcastLink(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleBroadcast}
              disabled={broadcasting}
              className="bg-primary hover:bg-primary/90"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              {broadcasting ? 'Sending...' : 'Send to all users'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resolve dispute confirm */}
      <AlertDialog open={!!resolveTarget} onOpenChange={() => !busy && setResolveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resolveTarget?.action === 'release'
                ? 'Release payment to seller?'
                : 'Refund buyer?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resolveTarget?.action === 'release'
                ? `₹${resolveTarget?.p.price} will be credited to seller ${resolveTarget?.p.seller_email}.`
                : `₹${resolveTarget?.p.price} will be refunded to buyer ${resolveTarget?.p.buyer_email}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Resolution note (optional, visible to both parties)"
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolve}
              disabled={busy}
              className={
                resolveTarget?.action === 'refund'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              {busy ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
