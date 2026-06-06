import { useState } from 'react';
import { CheckCircle2, AlertTriangle, PackageCheck, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EscrowStatus =
  | 'pending'
  | 'pending_delivery'
  | 'delivered'
  | 'disputed'
  | 'approved'
  | 'rejected';

interface Props {
  purchaseId: string;
  status: EscrowStatus;
  role: 'buyer' | 'seller';
  onChanged?: () => void;
}

export const EscrowStatusBadge = ({ status }: { status: EscrowStatus }) => {
  const map: Record<EscrowStatus, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-muted text-foreground' },
    pending_delivery: { label: 'Funds in Escrow', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/40' },
    delivered: { label: 'Awaiting Confirmation', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
    disputed: { label: 'In Dispute', cls: 'bg-destructive/15 text-destructive border-destructive/40' },
    approved: { label: 'Completed', cls: 'bg-green-500/15 text-green-400 border-green-500/40' },
    rejected: { label: 'Refunded', cls: 'bg-muted text-muted-foreground' },
  };
  const m = map[status] || map.pending;
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
};

const EscrowActions = ({ purchaseId, status, role, onChanged }: Props) => {
  const [busy, setBusy] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState('');

  const call = async (fn: string, args: Record<string, unknown> = {}) => {
    setBusy(true);
    const { data, error } = await supabase.rpc(fn as any, args);
    setBusy(false);
    if (error) return toast.error(error.message);
    const result = data as any;
    if (result && result.ok === false) return toast.error(result.reason || 'Action failed');
    toast.success('Done');
    onChanged?.();
  };

  // Seller can mark delivered while funds are held
  if (role === 'seller' && status === 'pending_delivery') {
    return (
      <Button
        variant="gaming"
        size="sm"
        disabled={busy}
        onClick={() => call('mark_purchase_delivered', { _purchase_id: purchaseId })}
        className="gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
        Mark Delivered
      </Button>
    );
  }

  // Buyer can confirm or dispute while held / delivered
  if (role === 'buyer' && (status === 'pending_delivery' || status === 'delivered')) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="gaming"
          size="sm"
          disabled={busy}
          onClick={() => call('confirm_purchase', { _purchase_id: purchaseId })}
          className="gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirm & Release Payment
        </Button>
        <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10">
              <ShieldAlert className="h-4 w-4" />
              Open Dispute
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Open a Dispute
              </DialogTitle>
              <DialogDescription>
                Funds stay safely in escrow while an admin reviews. Describe the issue clearly.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What went wrong? (min. 5 characters)"
              rows={4}
              maxLength={500}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={busy || reason.trim().length < 5}
                onClick={async () => {
                  await call('dispute_purchase', { _purchase_id: purchaseId, _reason: reason.trim() });
                  setDisputeOpen(false);
                  setReason('');
                }}
              >
                Submit Dispute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
};

export default EscrowActions;
