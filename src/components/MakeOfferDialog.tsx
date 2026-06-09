import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  listingId: string;
  listingPrice: number;
  onSubmitted?: () => void;
}

export default function MakeOfferDialog({ listingId, listingPrice, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(Math.max(100, Math.floor(listingPrice * 0.85)));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!amount || amount < 100) {
      toast.error('Offer must be at least ₹100');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('create_offer', {
        _listing_id: listingId,
        _amount: amount,
        _message: message || null,
      });
      if (error) throw error;
      const res = data as any;
      if (res?.ok === false) throw new Error(res.reason || 'Failed');
      toast.success('Offer sent to seller!');
      setOpen(false);
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to send offer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xl" className="w-full border-accent/40 text-accent hover:bg-accent/10">
          <Tag className="h-5 w-5" />
          Make an Offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Send a Price Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Your offer (₹)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="input-gaming"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Listed at ₹{listingPrice.toLocaleString()}. Amount will be held from wallet if accepted.
            </p>
          </div>
          <div>
            <Label>Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why this price?"
              className="input-gaming"
            />
          </div>
          <Button variant="gaming" size="lg" className="w-full" disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Offer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
