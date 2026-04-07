import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AuthModal from '@/components/AuthModal';
import { Trophy, Users, Calendar, IndianRupee, Gamepad2, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  game_mode: string;
  max_players: number;
  entry_fee: number;
  prize_pool: number;
  start_time: string;
  status: string;
  image_url: string | null;
  created_at: string;
  participant_count?: number;
  has_joined?: boolean;
}

const TournamentsPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, [user]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (t: any) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', t.id);

          let has_joined = false;
          if (user) {
            const { data: participation } = await supabase
              .from('tournament_participants')
              .select('id')
              .eq('tournament_id', t.id)
              .eq('user_id', user.id)
              .maybeSingle();
            has_joined = !!participation;
          }

          return { ...t, participant_count: count || 0, has_joined };
        })
      );

      setTournaments(enriched);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tournament: Tournament) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!profile) return;

    if (tournament.entry_fee > 0 && profile.balance < tournament.entry_fee) {
      toast.error('Insufficient balance! Please add money first.');
      return;
    }

    setJoiningId(tournament.id);
    try {
      // Deduct entry fee if applicable
      if (tournament.entry_fee > 0) {
        const newBalance = profile.balance - tournament.entry_fee;
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('user_id', user.id);
        if (balanceError) throw balanceError;
      }

      const { error } = await supabase
        .from('tournament_participants')
        .insert({ tournament_id: tournament.id, user_id: user.id });

      if (error) throw error;

      toast.success('Successfully joined the tournament!');
      await refreshProfile();
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join tournament');
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (tournament: Tournament) => {
    if (!user) return;
    setJoiningId(tournament.id);
    try {
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refund entry fee if applicable
      if (tournament.entry_fee > 0 && profile) {
        const newBalance = profile.balance + tournament.entry_fee;
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('user_id', user.id);
        await refreshProfile();
      }

      toast.success('Left the tournament. Entry fee refunded.');
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave tournament');
    } finally {
      setJoiningId(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="h-3 w-3 mr-1" /> Upcoming</Badge>;
      case 'ongoing':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Gamepad2 className="h-3 w-3 mr-1" /> Ongoing</Badge>;
      case 'completed':
        return <Badge className="bg-muted text-muted-foreground"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-primary/5" />
        <div className="container relative py-12 md:py-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-500">Tournaments</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-black">
            Join <span className="text-gradient">Tournaments</span> & Win Prizes
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Compete with other players, pay entry fees from your balance, and win exciting prizes!
          </p>
        </div>
      </section>

      {/* Tournaments List */}
      <section className="container py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-gaming overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <Card key={t.id} className="card-gaming overflow-hidden group">
                {/* Image */}
                <div className="relative h-40 bg-gradient-to-br from-primary/20 to-yellow-500/20 flex items-center justify-center">
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.title} className="w-full h-full object-cover" />
                  ) : (
                    <Trophy className="h-16 w-16 text-yellow-500/50" />
                  )}
                  <div className="absolute top-3 right-3">{getStatusBadge(t.status)}</div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <h3 className="font-display font-bold text-lg">{t.title}</h3>
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Gamepad2 className="h-4 w-4" />
                      <span>{t.game_mode}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{t.participant_count}/{t.max_players}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <IndianRupee className="h-4 w-4" />
                      <span>Entry: {t.entry_fee > 0 ? formatPrice(t.entry_fee) : 'Free'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-yellow-500">
                      <Trophy className="h-4 w-4" />
                      <span>Prize: {formatPrice(t.prize_pool)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(t.start_time), 'MMM dd, yyyy hh:mm a')}</span>
                    </div>
                  </div>

                  {t.status === 'upcoming' && (
                    <>
                      {t.has_joined ? (
                        <div className="flex gap-2">
                          <Badge className="flex-1 justify-center py-2 bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle className="h-4 w-4 mr-1" /> Joined
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLeave(t)}
                            disabled={joiningId === t.id}
                          >
                            Leave
                          </Button>
                        </div>
                      ) : t.participant_count! >= t.max_players ? (
                        <Badge className="w-full justify-center py-2" variant="destructive">Full</Badge>
                      ) : (
                        <Button
                          variant="gaming"
                          className="w-full"
                          onClick={() => handleJoin(t)}
                          disabled={joiningId === t.id}
                        >
                          {joiningId === t.id ? 'Joining...' : `Join Tournament${t.entry_fee > 0 ? ` (${formatPrice(t.entry_fee)})` : ''}`}
                        </Button>
                      )}
                    </>
                  )}

                  {t.status === 'ongoing' && (
                    <Badge className="w-full justify-center py-2 bg-green-500/20 text-green-400 border-green-500/30">
                      Match In Progress
                    </Badge>
                  )}

                  {t.status === 'completed' && (
                    <Badge className="w-full justify-center py-2" variant="secondary">
                      Tournament Ended
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Trophy className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">No Tournaments Yet</h3>
            <p className="text-muted-foreground">Check back later for upcoming tournaments!</p>
          </div>
        )}
      </section>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultTab="login" />
    </div>
  );
};

export default TournamentsPage;
