import { useEffect, useState } from 'react';
import { Star, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  seller_id: string;
  buyer_id: string;
  listing_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Props {
  sellerId: string;
  listingId: string;
  canReview: boolean; // user has approved purchase
}

const StarRow = ({
  value,
  onChange,
  size = 'h-5 w-5',
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: string;
}) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(n)}
        className={onChange ? 'cursor-pointer' : 'cursor-default'}
      >
        <Star
          className={`${size} ${
            n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          }`}
        />
      </button>
    ))}
  </div>
);

const SellerReviews = ({ sellerId, listingId, canReview }: Props) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const myReview = reviews.find((r) => r.buyer_id === user?.id);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('seller_reviews')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(30);
    setReviews((data as Review[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (sellerId) fetchReviews();
  }, [sellerId]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('seller_reviews').upsert(
      {
        seller_id: sellerId,
        buyer_id: user.id,
        listing_id: listingId,
        rating,
        comment: comment.trim() || null,
      },
      { onConflict: 'buyer_id,listing_id' }
    );
    setSubmitting(false);
    if (error) {
      toast.error('Could not submit review');
    } else {
      toast.success('Review submitted');
      setComment('');
      fetchReviews();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('seller_reviews').delete().eq('id', id);
    if (error) toast.error('Could not delete');
    else {
      toast.success('Review deleted');
      fetchReviews();
    }
  };

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="card-gaming p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Seller Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRow value={Math.round(avg)} size="h-4 w-4" />
            <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {canReview && user && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-sm font-medium">
            {myReview ? 'Update your review' : 'Leave a review'}
          </p>
          <StarRow
            value={myReview?.rating ?? rating}
            onChange={(n) => setRating(n)}
          />
          <Textarea
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            maxLength={500}
            rows={3}
          />
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {myReview ? 'Update review' : 'Submit review'}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No reviews yet. Be the first after a successful purchase.
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-3 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center justify-between mb-1">
                <StarRow value={r.rating} size="h-3.5 w-3.5" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                  {r.buyer_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              {r.comment && <p className="text-sm">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerReviews;
