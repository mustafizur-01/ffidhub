import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Shield, Search, Users, ShoppingBag, Eye, Trash2, Wallet, IndianRupee, Plus, Minus, History, ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, Clock, Trophy, Gamepad2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Message {
  id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_id: string;
  receiver_id: string;
  listing_id: string;
}

interface MessageWithDetails extends Message {
  sender_email?: string;
  receiver_email?: string;
  listing_level?: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  balance: number;
}

interface BalanceTransaction {
  id: string;
  profile_id: string;
  admin_id: string;
  amount: number;
  transaction_type: 'add' | 'remove';
  previous_balance: number;
  new_balance: number;
  note: string | null;
  created_at: string;
  user_email?: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [removeUser, setRemoveUser] = useState<UserProfile | null>(null);
  const [removeAmount, setRemoveAmount] = useState('');
  const [removeNote, setRemoveNote] = useState('');
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(true);
  
  // Tournament state
  const [tournamentsList, setTournamentsList] = useState<any[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [newTournament, setNewTournament] = useState({
    title: '', description: '', game_mode: 'Battle Royale', max_players: '50',
    entry_fee: '0', prize_pool: '0', start_time: '',
  });
  const [creatingTournament, setCreatingTournament] = useState(false);

  const [stats, setStats] = useState({
    totalMessages: 0,
    unreadMessages: 0,
    totalListings: 0,
    totalUsers: 0,
    pendingDeposits: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }

    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchMessages();
      fetchStats();
      fetchUsers();
      fetchTransactions();
      fetchDepositRequests();
      fetchTournaments();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const [messagesResult, listingsResult, profilesResult, depositsResult] = await Promise.all([
        supabase.from('messages').select('id, read', { count: 'exact' }),
        supabase.from('id_listings').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('deposit_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      ]);

      const unreadCount = messagesResult.data?.filter(m => !m.read).length || 0;

      setStats({
        totalMessages: messagesResult.count || 0,
        unreadMessages: unreadCount,
        totalListings: listingsResult.count || 0,
        totalUsers: profilesResult.count || 0,
        pendingDeposits: depositsResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, balance')
        .order('email', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('balance_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionsError) throw transactionsError;

      // Get profile emails
      const profileIds = [...new Set((transactionsData || []).map(t => t.profile_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', profileIds);

      const profileMap = new Map(profilesData?.map(p => [p.id, p.email]));

      const enrichedTransactions: BalanceTransaction[] = (transactionsData || []).map(t => ({
        ...t,
        transaction_type: t.transaction_type as 'add' | 'remove',
        user_email: profileMap.get(t.profile_id) || 'Unknown',
      }));

      setTransactions(enrichedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      // Fetch all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Get unique user IDs
      const userIds = [...new Set([
        ...(messagesData || []).map(m => m.sender_id),
        ...(messagesData || []).map(m => m.receiver_id),
      ])];

      // Get unique listing IDs
      const listingIds = [...new Set((messagesData || []).map(m => m.listing_id))];

      // Fetch profiles for email lookup
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      // Fetch listings for level lookup
      const { data: listingsData } = await supabase
        .from('id_listings')
        .select('id, id_level')
        .in('id', listingIds);

      // Create lookup maps
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p.email]));
      const listingMap = new Map(listingsData?.map(l => [l.id, l.id_level]));

      // Enrich messages with details
      const enrichedMessages: MessageWithDetails[] = (messagesData || []).map(msg => ({
        ...msg,
        sender_email: profileMap.get(msg.sender_id) || 'Unknown',
        receiver_email: profileMap.get(msg.receiver_id) || 'Unknown',
        listing_level: listingMap.get(msg.listing_id),
      }));

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchMessages();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast.success('Message deleted successfully');
      setDeletingMessageId(null);
      fetchMessages();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    }
  };

  const handleAddBalance = async () => {
    if (!selectedUser || !addAmount || !user) return;

    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const newBalance = selectedUser.balance + amount;
      
      // Update balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      // Log transaction
      const { error: logError } = await supabase
        .from('balance_transactions')
        .insert({
          profile_id: selectedUser.id,
          admin_id: user.id,
          amount: amount,
          transaction_type: 'add',
          previous_balance: selectedUser.balance,
          new_balance: newBalance,
          note: addNote || null,
        });

      if (logError) console.error('Failed to log transaction:', logError);

      toast.success(`₹${amount} added to ${selectedUser.email}`);
      setSelectedUser(null);
      setAddAmount('');
      setAddNote('');
      fetchUsers();
      fetchStats();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add balance');
    }
  };

  const handleRemoveBalance = async () => {
    if (!removeUser || !removeAmount || !user) return;

    const amount = parseFloat(removeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > removeUser.balance) {
      toast.error('Cannot remove more than current balance');
      return;
    }

    try {
      const newBalance = removeUser.balance - amount;
      
      // Update balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', removeUser.id);

      if (updateError) throw updateError;

      // Log transaction
      const { error: logError } = await supabase
        .from('balance_transactions')
        .insert({
          profile_id: removeUser.id,
          admin_id: user.id,
          amount: amount,
          transaction_type: 'remove',
          previous_balance: removeUser.balance,
          new_balance: newBalance,
          note: removeNote || null,
        });

      if (logError) console.error('Failed to log transaction:', logError);

      toast.success(`₹${amount} removed from ${removeUser.email}`);
      setRemoveUser(null);
      setRemoveAmount('');
      setRemoveNote('');
      fetchUsers();
      fetchStats();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove balance');
    }
  };

  const fetchDepositRequests = async () => {
    try {
      setDepositsLoading(true);
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const enriched = await Promise.all((data || []).map(async (d: any) => {
        const { data: profile } = await supabase.from('profiles').select('email').eq('user_id', d.user_id).maybeSingle();
        return { ...d, user_email: profile?.email || 'Unknown' };
      }));
      setDepositRequests(enriched);
    } catch (error) {
      console.error('Error fetching deposit requests:', error);
    } finally {
      setDepositsLoading(false);
    }
  };

  const handleApproveDeposit = async (deposit: any) => {
    if (!user) return;
    try {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('id, balance').eq('user_id', deposit.user_id).single();
      if (profileError || !profile) throw new Error('Profile not found');
      const newBalance = profile.balance + Number(deposit.amount);
      await supabase.from('profiles').update({ balance: newBalance }).eq('id', profile.id);
      await supabase.from('balance_transactions').insert({
        profile_id: profile.id, admin_id: user.id, amount: Number(deposit.amount),
        transaction_type: 'add', previous_balance: profile.balance, new_balance: newBalance,
        note: `Deposit approved (UTR: ${deposit.utr_number})`,
      });
      await supabase.from('deposit_requests').update({ status: 'approved' }).eq('id', deposit.id);
      toast.success(`₹${deposit.amount} approved for ${deposit.user_email}`);
      fetchDepositRequests(); fetchUsers(); fetchStats(); fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve deposit');
    }
  };

  const handleRejectDeposit = async (deposit: any) => {
    try {
      await supabase.from('deposit_requests').update({ status: 'rejected', admin_note: 'Rejected by admin' }).eq('id', deposit.id);
      toast.success('Deposit request rejected');
      fetchDepositRequests(); fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject deposit');
    }
  };

  const fetchTournaments = async () => {
    try {
      setTournamentsLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (t: any) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', t.id);
          return { ...t, participant_count: count || 0 };
        })
      );
      setTournamentsList(enriched);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setTournamentsLoading(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!newTournament.title || !newTournament.start_time || !user) return;
    setCreatingTournament(true);
    try {
      const { error } = await supabase.from('tournaments').insert({
        title: newTournament.title,
        description: newTournament.description || null,
        game_mode: newTournament.game_mode,
        max_players: parseInt(newTournament.max_players),
        entry_fee: parseFloat(newTournament.entry_fee),
        prize_pool: parseFloat(newTournament.prize_pool),
        start_time: newTournament.start_time,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success('Tournament created!');
      setShowCreateTournament(false);
      setNewTournament({ title: '', description: '', game_mode: 'Battle Royale', max_players: '50', entry_fee: '0', prize_pool: '0', start_time: '' });
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tournament');
    } finally {
      setCreatingTournament(false);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Tournament deleted');
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tournament');
    }
  };

  const handleUpdateTournamentStatus = async (id: string, status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase.from('tournaments').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success(`Tournament status updated to ${status}`);
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const filteredTransactions = transactions.filter(t =>
    t.user_email?.toLowerCase().includes(transactionSearchTerm.toLowerCase()) ||
    t.note?.toLowerCase().includes(transactionSearchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.sender_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.receiver_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'read' && msg.read) ||
      (filterStatus === 'unread' && !msg.read);

    return matchesSearch && matchesFilter;
  });

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Messages
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unread Messages
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.unreadMessages}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Listings
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalListings}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Deposits Stat */}
        

        {/* Deposit Requests */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Deposit Requests
              {stats.pendingDeposits > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{stats.pendingDeposits} pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {depositsLoading ? (
              <Skeleton className="h-32" />
            ) : depositRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No deposit requests</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>UTR</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depositRequests.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{d.user_email}</TableCell>
                        <TableCell className="font-bold">₹{d.amount}</TableCell>
                        <TableCell className="font-mono text-xs">{d.utr_number}</TableCell>
                        <TableCell>
                          {d.status === 'approved' && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>}
                          {d.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                          {d.status === 'pending' && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(d.created_at), 'dd MMM yyyy, hh:mm a')}</TableCell>
                        <TableCell>
                          {d.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApproveDeposit(d)} className="bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectDeposit(d)}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Management */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Balance Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchUsers}>
                Refresh
              </Button>
            </div>

            {usersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            <IndianRupee className="h-3 w-3 mr-1" />
                            {user.balance.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-1"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                              onClick={() => setRemoveUser(user)}
                            >
                              <Minus className="h-4 w-4" />
                              Remove
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

        {/* Transaction History */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or note..."
                  value={transactionSearchTerm}
                  onChange={(e) => setTransactionSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchTransactions}>
                Refresh
              </Button>
            </div>

            {transactionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Previous</TableHead>
                      <TableHead>New</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {transaction.transaction_type === 'add' ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              Add
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              Remove
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {transaction.user_email}
                        </TableCell>
                        <TableCell>
                          <span className={transaction.transaction_type === 'add' ? 'text-green-500' : 'text-red-500'}>
                            {transaction.transaction_type === 'add' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          ₹{transaction.previous_balance.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ₹{transaction.new_balance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {transaction.note || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Moderation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages, sender, or receiver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterStatus}
                onValueChange={(value: 'all' | 'read' | 'unread') => setFilterStatus(value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Messages</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchMessages}>
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Receiver</TableHead>
                      <TableHead>Listing</TableHead>
                      <TableHead className="max-w-[300px]">Message</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          <Badge variant={message.read ? 'secondary' : 'destructive'}>
                            {message.read ? 'Read' : 'Unread'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="text-xs text-muted-foreground">
                            {message.sender_email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {message.receiver_email}
                          </span>
                        </TableCell>
                        <TableCell>
                          {message.listing_level && (
                            <Badge variant="outline">
                              Level {message.listing_level}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate text-sm">{message.content}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingMessageId(message.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingMessageId} onOpenChange={() => setDeletingMessageId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this message? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingMessageId && handleDeleteMessage(deletingMessageId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Balance Dialog */}
        <AlertDialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setAddAmount(''); setAddNote(''); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Add Balance
              </AlertDialogTitle>
              <AlertDialogDescription>
                Add balance to <strong>{selectedUser?.email}</strong>
                <br />
                Current balance: <strong>₹{selectedUser?.balance.toFixed(2)}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <Input
                placeholder="Note (optional)"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAddBalance}>
                Add Balance
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Balance Dialog */}
        <AlertDialog open={!!removeUser} onOpenChange={() => { setRemoveUser(null); setRemoveAmount(''); setRemoveNote(''); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Wallet className="h-5 w-5" />
                Remove Balance
              </AlertDialogTitle>
              <AlertDialogDescription>
                Remove balance from <strong>{removeUser?.email}</strong>
                <br />
                Current balance: <strong>₹{removeUser?.balance.toFixed(2)}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount to remove"
                  value={removeAmount}
                  onChange={(e) => setRemoveAmount(e.target.value)}
                  min="0"
                  max={removeUser?.balance || 0}
                  step="0.01"
                />
              </div>
              <Input
                placeholder="Note (optional)"
                value={removeNote}
                onChange={(e) => setRemoveNote(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRemoveBalance}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Balance
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
