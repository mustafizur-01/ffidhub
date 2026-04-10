import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AuthModal from '@/components/AuthModal';
import { Trophy, Users, Calendar, IndianRupee, Gamepad2, Clock, CheckCircle, Plus, Crown, Key, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  game_name: string;
  game_mode: string;
  max_players: number;
  entry_fee: number;
  prize_pool: number;
  start_time: string;
  status: string;
  image_url: string | null;
  created_at: string;
  created_by: string | null;
  winner_id: string | null;
  room_id: string | null;
  room_password: string | null;
  participant_count?: number;
  has_joined?: boolean;
  winner_email?: string;
}

const TournamentsPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [joinTarget, setJoinTarget] = useState<Tournament | null>(null);
  const [ffName, setFfName] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [newTournament, setNewTournament] = useState({
    title: '', description: '', game_name: 'Free Fire', game_mode: 'Battle Royale', max_players: '50',
    entry_fee: '0', prize_pool: '0', start_time: '',
  });

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

          // Get winner email if exists
          let winner_email: string | undefined;
          if (t.winner_id) {
            const { data: winnerProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', t.winner_id)
              .maybeSingle();
            winner_email = winnerProfile?.email;
          }

          return { ...t, participant_count: count || 0, has_joined, winner_email };
        })
      );

      setTournaments(enriched);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!newTournament.title || !newTournament.start_time) {
      toast.error('Please fill in title and start time');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('tournaments').insert({
        title: newTournament.title,
        description: newTournament.description || null,
        game_name: newTournament.game_name,
        game_mode: newTournament.game_mode,
        max_players: parseInt(newTournament.max_players),
        entry_fee: parseFloat(newTournament.entry_fee),
        prize_pool: parseFloat(newTournament.prize_pool),
        start_time: newTournament.start_time,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success('Tournament created!');
      setShowCreateForm(false);
      setNewTournament({ title: '', description: '', game_name: 'Free Fire', game_mode: 'Battle Royale', max_players: '50', entry_fee: '0', prize_pool: '0', start_time: '' });
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  const openJoinDialog = (tournament: Tournament) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!profile) return;
    if (tournament.entry_fee > 0 && profile.balance < tournament.entry_fee) {
      toast.error('Insufficient balance! Please add money first.');
      return;
    }
    setJoinTarget(tournament);
    setFfName('');
    setFfUid('');
    
  };

  const handleJoinConfirm = async () => {
    if (!user || !profile || !joinTarget) return;

    if (!ffName.trim() || !ffUid.trim()) {
      toast.error('Please enter your Free Fire Name and UID');
      return;
    }

    setJoiningId(joinTarget.id);
    
    try {
      if (joinTarget.entry_fee > 0) {
        const newBalance = profile.balance - joinTarget.entry_fee;
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('user_id', user.id);
        if (balanceError) throw balanceError;
      }

      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: joinTarget.id,
          user_id: user.id,
          ff_name: ffName.trim(),
          ff_uid: ffUid.trim(),
        });

      if (error) throw error;

      toast.success('Successfully joined the tournament!');
      await refreshProfile();
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join tournament');
    } finally {
      setJoiningId(null);
      setJoinTarget(null);
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
          {user && (
            <Button variant="gaming" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-1" /> Create Tournament
            </Button>
          )}
        </div>
      </section>

      {/* Create Tournament Form */}
      {showCreateForm && (
        <section className="container py-6">
          <Card className="card-gaming max-w-2xl mx-auto">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-display font-bold text-lg">Create New Tournament</h3>
              <Input placeholder="Tournament Title *" value={newTournament.title} onChange={(e) => setNewTournament({...newTournament, title: e.target.value})} />
              <Input placeholder="Game Name (e.g. Free Fire, PUBG, COD) *" value={newTournament.game_name} onChange={(e) => setNewTournament({...newTournament, game_name: e.target.value})} />
              <Textarea placeholder="Description (optional)" value={newTournament.description} onChange={(e) => setNewTournament({...newTournament, description: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Game Mode" value={newTournament.game_mode} onChange={(e) => setNewTournament({...newTournament, game_mode: e.target.value})} />
                <Input type="number" placeholder="Max Players" value={newTournament.max_players} onChange={(e) => setNewTournament({...newTournament, max_players: e.target.value})} />
                <Input type="number" placeholder="Entry Fee (₹)" value={newTournament.entry_fee} onChange={(e) => setNewTournament({...newTournament, entry_fee: e.target.value})} />
                <Input type="number" placeholder="Prize Pool (₹)" value={newTournament.prize_pool} onChange={(e) => setNewTournament({...newTournament, prize_pool: e.target.value})} />
              </div>
              <Input type="datetime-local" value={newTournament.start_time} onChange={(e) => setNewTournament({...newTournament, start_time: e.target.value})} />
              <div className="flex gap-2">
                <Button variant="gaming" onClick={handleCreateTournament} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Tournament'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

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
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-lg">{t.title}</h3>
                    <Badge variant="outline" className="text-xs">{t.game_name}</Badge>
                  </div>
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

                  {/* Winner Display */}
                  {t.winner_id && t.winner_email && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-500">Winner: {t.winner_email}</span>
                    </div>
                  )}

                  {/* Room ID & Password - visible only to joined participants */}
                  {t.has_joined && t.room_id && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Key className="h-4 w-4 text-primary" />
                        <span>Room Details</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Room ID:</span>
                        <button
                          className="flex items-center gap-1 text-sm font-mono font-bold hover:text-primary transition-colors"
                          onClick={() => { navigator.clipboard.writeText(t.room_id!); toast.success('Room ID copied!'); }}
                        >
                          {t.room_id} <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      {t.room_password && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Password:</span>
                          <button
                            className="flex items-center gap-1 text-sm font-mono font-bold hover:text-primary transition-colors"
                            onClick={() => { navigator.clipboard.writeText(t.room_password!); toast.success('Password copied!'); }}
                          >
                            {t.room_password} <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

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
                          onClick={() => openJoinDialog(t)}
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

                  {t.status === 'completed' && !t.winner_id && (
                    <Badge className="w-full justify-center py-2" variant="secondary">
                      Tournament Ended
                    </Badge>
                  )}

                  {t.status === 'completed' && t.winner_id && !t.winner_email && (
                    <Badge className="w-full justify-center py-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      <Crown className="h-4 w-4 mr-1" /> Prize Distributed
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

      {/* Join Dialog for FF Name & UID */}
      <Dialog open={!!joinTarget} onOpenChange={(open) => { if (!open) setJoinTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Your Game Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Tournament: <span className="font-semibold text-foreground">{joinTarget?.title}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="ff-name">Free Fire Name *</Label>
              <Input id="ff-name" placeholder="Enter your in-game name" value={ffName} onChange={(e) => setFfName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ff-uid">Free Fire UID *</Label>
              <Input id="ff-uid" placeholder="Enter your UID" value={ffUid} onChange={(e) => setFfUid(e.target.value)} />
            </div>
            {joinTarget && joinTarget.entry_fee > 0 && (
              <p className="text-sm text-muted-foreground">Entry Fee: <span className="font-bold text-yellow-500">{formatPrice(joinTarget.entry_fee)}</span> will be deducted from your balance.</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setJoinTarget(null)}>Cancel</Button>
              <Button variant="gaming" onClick={handleJoinConfirm} disabled={joiningId !== null}>
                {joiningId !== null ? 'Joining...' : 'Join Now'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultTab="login" />
    </div>
  );
};

export default TournamentsPage;
