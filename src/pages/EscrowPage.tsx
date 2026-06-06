import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, ShieldCheck, ArrowLeft, Package } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import EscrowActions, { EscrowStatusBadge, EscrowStatus } from '@/components/EscrowActions';

interface Row {
  id: string;
  status: EscrowStatus;
  created_at: string;
  delivered_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  listing_id: string;
  buyer_id: string;
  listing?: {
    id: string;
    id_level: number;
    login_method: string;
    price: number;
    image_url: string | null;
    seller_id: string | null;
  };
}

const ACTIVE = ['pending_delivery', 'delivered', 'disputed'];

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const RowCard = ({ row, role, onChanged }: { row: Row; role: 'buyer' | 'seller'; onChanged: () => void }) => (
  <div className="card-gaming p-4 flex flex-wrap gap-4 items-center">
    {row.listing?.image_url ? (
      <img src={row.listing.image_url} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
    ) : (
      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
    )}
    <div className="flex-1 min-w-[180px]">
      <Link to={`/listing/${row.listing_id}`} className="font-semibold hover:text-primary">
        Level {row.listing?.id_level ?? '—'} · {row.listing?.login_method ?? ''}
      </Link>
      <p className="text-sm text-muted-foreground">
        {row.listing ? formatPrice(Number(row.listing.price)) : ''} ·{' '}
        {new Date(row.created_at).toLocaleDateString()}
      </p>
      {row.dispute_reason && (
        <p className="text-xs text-destructive mt-1">Dispute: {row.dispute_reason}</p>
      )}
    </div>
    <div className="flex flex-col items-end gap-2">
      <EscrowStatusBadge status={row.status} />
      <EscrowActions purchaseId={row.id} status={row.status} role={role} onChanged={onChanged} />
    </div>
  </div>
);

const EscrowPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [bought, setBought] = useState<Row[]>([]);
  const [sold, setSold] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Buyer side
    const { data: buyerRows } = await supabase
      .from('purchases')
      .select('id, status, created_at, delivered_at, confirmed_at, disputed_at, dispute_reason, listing_id, buyer_id')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    // Seller side — listings owned by user
    const { data: myListings } = await supabase
      .from('id_listings')
      .select('id')
      .eq('seller_id', user.id);
    const myListingIds = (myListings || []).map((l: any) => l.id);

    let sellerRows: any[] = [];
    if (myListingIds.length) {
      const { data } = await supabase
        .from('purchases')
        .select('id, status, created_at, delivered_at, confirmed_at, disputed_at, dispute_reason, listing_id, buyer_id')
        .in('listing_id', myListingIds)
        .order('created_at', { ascending: false });
      sellerRows = data || [];
    }

    // Fetch listing details for all rows
    const allListingIds = Array.from(
      new Set([...(buyerRows || []).map((r: any) => r.listing_id), ...sellerRows.map((r: any) => r.listing_id)])
    );
    let listingMap: Record<string, any> = {};
    if (allListingIds.length) {
      const { data: ls } = await supabase
        .from('id_listings')
        .select('id, id_level, login_method, price, image_url, seller_id')
        .in('id', allListingIds);
      (ls || []).forEach((l: any) => (listingMap[l.id] = l));
    }

    const enrich = (rows: any[]): Row[] => rows.map((r) => ({ ...r, listing: listingMap[r.listing_id] }));
    setBought(enrich(buyerRows || []));
    setSold(enrich(sellerRows));
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;

  const activeBought = bought.filter((r) => ACTIVE.includes(r.status));
  const historyBought = bought.filter((r) => !ACTIVE.includes(r.status));
  const activeSold = sold.filter((r) => ACTIVE.includes(r.status));
  const historySold = sold.filter((r) => !ACTIVE.includes(r.status));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>

        <h1 className="text-3xl font-display font-bold mb-1 flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          Escrow Center
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Track held payments. Funds are released to the seller only after the buyer confirms receipt.
        </p>

        <Tabs defaultValue="buying">
          <TabsList className="grid grid-cols-2 w-full max-w-xs mb-4">
            <TabsTrigger value="buying">As Buyer ({activeBought.length})</TabsTrigger>
            <TabsTrigger value="selling">As Seller ({activeSold.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="buying" className="space-y-6">
            <Section title="Active" rows={activeBought} role="buyer" onChanged={load} loading={loading} />
            <Section title="History" rows={historyBought} role="buyer" onChanged={load} loading={false} />
          </TabsContent>

          <TabsContent value="selling" className="space-y-6">
            <Section title="Active" rows={activeSold} role="seller" onChanged={load} loading={loading} />
            <Section title="History" rows={historySold} role="seller" onChanged={load} loading={false} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const Section = ({
  title, rows, role, onChanged, loading,
}: { title: string; rows: Row[]; role: 'buyer' | 'seller'; onChanged: () => void; loading: boolean }) => (
  <section>
    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
    {loading ? (
      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    ) : rows.length === 0 ? (
      <div className="card-gaming p-8 text-center text-muted-foreground text-sm">Nothing here yet.</div>
    ) : (
      <div className="space-y-3">
        {rows.map((r) => <RowCard key={r.id} row={r} role={role} onChanged={onChanged} />)}
      </div>
    )}
  </section>
);

export default EscrowPage;
