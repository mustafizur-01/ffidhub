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
import { MessageSquare, Shield, Search, Users, ShoppingBag, Eye, Trash2, Wallet, IndianRupee, Plus, Minus, History, ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, Clock, Trophy, Crown, LifeBuoy, Mail } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminExtraTools from '@/components/AdminExtraTools';

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
  is_verified_seller: boolean;
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
  const [depositImageUrls, setDepositImageUrls] = useState<Record<string, string>>({});
  const [depositSearch, setDepositSearch] = useState('');
  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);


  // Listings management
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingSearch, setListingSearch] = useState('');

  
  // Tournament state
  const [tournamentsList, setTournamentsList] = useState<any[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [newTournament, setNewTournament] = useState({
    title: '', description: '', game_mode: 'Battle Royale', max_players: '50',
    entry_fee: '0', prize_pool: '0', start_time: '',
  });
  const [creatingTournament, setCreatingTournament] = useState(false);

  // Support reports state
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportFilter, setReportFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [reportSearch, setReportSearch] = useState('');

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
      fetchWithdrawalRequests();
      fetchTournaments();
      fetchReports();
      fetchListings();
    }
  }, [isAdmin]);

  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      const { data, error } = await supabase
        .from('id_listings')
        .select('id, id_level, login_method, price, seller_id, created_at, image_url')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const sellerIds = [...new Set((data || []).map((l: any) => l.seller_id).filter(Boolean))];
      const listingIds = (data || []).map((l: any) => l.id);

      const [{ data: sellers }, { data: soldRows }] = await Promise.all([
        sellerIds.length
          ? supabase.from('profiles').select('user_id, email').in('user_id', sellerIds)
          : Promise.resolve({ data: [] as any[] }),
        listingIds.length
          ? supabase
              .from('purchases')
              .select('listing_id, status')
              .in('listing_id', listingIds)
              .in('status', ['pending_delivery', 'delivered', 'disputed', 'approved'])
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const sellerMap = new Map((sellers || []).map((s: any) => [s.user_id, s.email]));
      const soldSet = new Set((soldRows || []).map((p: any) => p.listing_id));

      setListings(
        (data || []).map((l: any) => ({
          ...l,
          seller_email: sellerMap.get(l.seller_id) || 'Unknown',
          is_sold: soldSet.has(l.id),
        }))
      );
    } catch (e) {
      console.error('Error fetching listings:', e);
    } finally {
      setListingsLoading(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      const { error } = await supabase.from('id_listings').delete().eq('id', id);
      if (error) throw error;
      toast.success('Listing deleted');
      fetchListings();
      fetchStats();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete listing');
    }
  };


  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const { data, error } = await supabase
        .from('support_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (e: any) {
      toast.error('Failed to load reports');
    } finally {
      setReportsLoading(false);
    }
  };

  const handleUpdateReportStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('support_reports').update({ status }).eq('id', id);
    if (error) return toast.error('Update failed');
    toast.success(`Marked as ${status}`);
    fetchReports();
  };

  const handleDeleteReport = async (id: string) => {
    const { error } = await supabase.from('support_reports').delete().eq('id', id);
    if (error) return toast.error('Delete failed');
    toast.success('Report deleted');
    fetchReports();
  };

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
        .select('id, user_id, email, balance, is_verified_seller')
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

  const handleToggleVerifiedSeller = async (target: UserProfile) => {
    try {
      const next = !target.is_verified_seller;
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified_seller: next })
        .eq('id', target.id);
      if (error) throw error;
      toast.success(
        next
          ? `${target.email} marked as Verified Seller`
          : `${target.email} verification removed`
      );
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update verification');
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

      const urlMap: Record<string, string> = {};
      await Promise.all(
        (data || []).map(async (d: any) => {
          if (d.screenshot_url) {
            const { data: signed } = await supabase.storage
              .from('payment-proofs')
              .createSignedUrl(d.screenshot_url, 3600);
            if (signed?.signedUrl) urlMap[d.id] = signed.signedUrl;
          }
        })
      );
      setDepositImageUrls(urlMap);

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

  const fetchWithdrawalRequests = async () => {
    try {
      setWithdrawalsLoading(true);
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const enriched = await Promise.all((data || []).map(async (w: any) => {
        const { data: profile } = await supabase.from('profiles').select('email').eq('user_id', w.user_id).maybeSingle();
        return { ...w, user_email: profile?.email || 'Unknown' };
      }));
      setWithdrawalRequests(enriched);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const handleApproveWithdrawal = async (w: any) => {
    try {
      // Balance was already deducted on request. Just mark approved and log txn.
      const { data: profile } = await supabase.from('profiles').select('id, balance').eq('user_id', w.user_id).maybeSingle();
      if (profile) {
        await supabase.from('balance_transactions').insert({
          profile_id: profile.id,
          admin_id: user!.id,
          amount: 0,
          transaction_type: 'withdrawal_paid',
          previous_balance: profile.balance,
          new_balance: profile.balance,
          note: `Withdrawal ₹${w.amount} paid to ${w.upi_id}`,
        });
      }
      await supabase.from('withdrawal_requests').update({ status: 'approved' }).eq('id', w.id);
      toast.success(`Withdrawal marked paid for ${w.user_email}`);
      fetchWithdrawalRequests();
      fetchTransactions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve');
    }
  };

  const handleRejectWithdrawal = async (w: any) => {
    try {
      // Refund the held balance
      const { data: profile } = await supabase.from('profiles').select('id, balance').eq('user_id', w.user_id).maybeSingle();
      if (profile) {
        const newBalance = Number(profile.balance) + Number(w.amount);
        await supabase.from('profiles').update({ balance: newBalance }).eq('id', profile.id);
        await supabase.from('balance_transactions').insert({
          profile_id: profile.id,
          admin_id: user!.id,
          amount: Number(w.amount),
          transaction_type: 'withdrawal_refund',
          previous_balance: Number(profile.balance),
          new_balance: newBalance,
          note: `Withdrawal rejected, ₹${w.amount} refunded`,
        });
      }
      await supabase.from('withdrawal_requests').update({ status: 'rejected', admin_note: 'Rejected by admin' }).eq('id', w.id);
      toast.success('Withdrawal rejected & refunded');
      fetchWithdrawalRequests();
      fetchUsers();
      fetchTransactions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
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

          // Fetch participants with emails for winner selection
          const { data: participants } = await supabase
            .from('tournament_participants')
            .select('user_id')
            .eq('tournament_id', t.id);

          let participantEmails: { user_id: string; email: string }[] = [];
          if (participants && participants.length > 0) {
            const userIds = participants.map(p => p.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, email')
              .in('user_id', userIds);
            participantEmails = profiles || [];
          }

          return { ...t, participant_count: count || 0, participants: participantEmails };
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

  const handleSelectWinner = async (tournament: any, winnerUserId: string) => {
    if (!user) return;
    try {
      // Get winner's profile
      const { data: winnerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, balance, email')
        .eq('user_id', winnerUserId)
        .single();
      if (profileError || !winnerProfile) throw new Error('Winner profile not found');

      // Add prize pool to winner's balance
      const newBalance = winnerProfile.balance + tournament.prize_pool;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', winnerProfile.id);
      if (balanceError) throw balanceError;

      // Log the transaction
      await supabase.from('balance_transactions').insert({
        profile_id: winnerProfile.id,
        admin_id: user.id,
        amount: tournament.prize_pool,
        transaction_type: 'add',
        previous_balance: winnerProfile.balance,
        new_balance: newBalance,
        note: `Tournament prize: ${tournament.title}`,
      });

      // Update tournament with winner and mark completed
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ winner_id: winnerUserId, status: 'completed' })
        .eq('id', tournament.id);
      if (updateError) throw updateError;

      toast.success(`🏆 ₹${tournament.prize_pool} prize sent to ${winnerProfile.email}!`);
      fetchTournaments();
      fetchUsers();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to select winner');
    }
  };

  const handleUpdateRoomInfo = async (id: string, roomId: string | null, roomPassword: string | null) => {
    try {
      const { error } = await supabase.from('tournaments').update({ room_id: roomId || null, room_password: roomPassword || null }).eq('id', id);
      if (error) throw error;
      toast.success('Room info updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update room info');
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

        {/* Extra admin power tools: disputes, VIP approvals, broadcast */}
        <AdminExtraTools />

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
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, UTR or amount"
                  value={depositSearch}
                  onChange={(e) => setDepositSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={depositFilter} onValueChange={(v: any) => setDepositFilter(v)}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchDepositRequests}>Refresh</Button>
            </div>
            {(() => {
              const q = depositSearch.trim().toLowerCase();
              const filteredDeposits = depositRequests.filter((d: any) => {
                const statusOk = depositFilter === 'all' || d.status === depositFilter;
                const searchOk =
                  !q ||
                  (d.user_email || '').toLowerCase().includes(q) ||
                  (d.utr_number || '').toLowerCase().includes(q) ||
                  String(d.amount).includes(q);
                return statusOk && searchOk;
              });
              return depositsLoading ? (
                <Skeleton className="h-32" />
              ) : filteredDeposits.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No deposit requests found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>UTR</TableHead>
                        <TableHead>Proof</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeposits.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-sm">{d.user_email}</TableCell>
                          <TableCell className="font-bold">₹{d.amount}</TableCell>
                          <TableCell className="font-mono text-xs">{d.utr_number}</TableCell>
                          <TableCell>
                            {depositImageUrls[d.id] ? (
                              <button
                                type="button"
                                onClick={() => setProofUrl(depositImageUrls[d.id])}
                                className="block"
                              >
                                <img
                                  src={depositImageUrls[d.id]}
                                  alt={`Payment proof from ${d.user_email}`}
                                  className="h-14 w-14 object-cover rounded border border-border hover:opacity-80 transition"
                                />
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">No proof</span>
                            )}
                          </TableCell>
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
              );
            })()}
          </CardContent>

        </Card>

        {/* Withdrawal Requests */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-400" />
              Withdrawal Requests
              {withdrawalRequests.filter((w) => w.status === 'pending').length > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  {withdrawalRequests.filter((w) => w.status === 'pending').length} pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawalsLoading ? (
              <Skeleton className="h-32" />
            ) : withdrawalRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No withdrawal requests</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Holder</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalRequests.map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm">{w.user_email}</TableCell>
                        <TableCell className="font-bold">₹{w.amount}</TableCell>
                        <TableCell className="font-mono text-xs">{w.upi_id}</TableCell>
                        <TableCell className="text-sm">{w.account_holder}</TableCell>
                        <TableCell>
                          {w.status === 'approved' && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>}
                          {w.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                          {w.status === 'pending' && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(w.created_at), 'dd MMM yyyy, hh:mm a')}</TableCell>
                        <TableCell>
                          {w.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApproveWithdrawal(w)} className="bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" /> Mark Paid
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectWithdrawal(w)}>
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

        {/* Tournament Management */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Tournament Management
              </span>
              <Button size="sm" variant="gaming" onClick={() => setShowCreateTournament(!showCreateTournament)}>
                <Plus className="h-4 w-4 mr-1" /> Create Tournament
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Create Form */}
            {showCreateTournament && (
              <div className="mb-6 p-4 border border-border rounded-lg space-y-3">
                <h4 className="font-bold text-sm">New Tournament</h4>
                <Input placeholder="Title *" value={newTournament.title} onChange={(e) => setNewTournament({...newTournament, title: e.target.value})} />
                <Textarea placeholder="Description" value={newTournament.description} onChange={(e) => setNewTournament({...newTournament, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newTournament.game_mode} onValueChange={(v) => setNewTournament({...newTournament, game_mode: v})}>
                    <SelectTrigger><SelectValue placeholder="Game Mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Battle Royale">Battle Royale</SelectItem>
                      <SelectItem value="Clash Squad">Clash Squad</SelectItem>
                      <SelectItem value="CS Custom">CS Custom</SelectItem>
                      <SelectItem value="Lone Wolf">Lone Wolf</SelectItem>
                      <SelectItem value="Craftland 1v1">Craftland 1v1</SelectItem>
                      <SelectItem value="Craftland 2v2">Craftland 2v2</SelectItem>
                      <SelectItem value="Craftland 4v4">Craftland 4v4</SelectItem>
                      <SelectItem value="Free For All">Free For All</SelectItem>
                      <SelectItem value="Custom Room">Custom Room</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Max Players" value={newTournament.max_players} onChange={(e) => setNewTournament({...newTournament, max_players: e.target.value})} />
                  <Input type="number" placeholder="Entry Fee (₹)" value={newTournament.entry_fee} onChange={(e) => setNewTournament({...newTournament, entry_fee: e.target.value})} />
                  <Input type="number" placeholder="Prize Pool (₹)" value={newTournament.prize_pool} onChange={(e) => setNewTournament({...newTournament, prize_pool: e.target.value})} />
                </div>
                <Input type="datetime-local" value={newTournament.start_time} onChange={(e) => setNewTournament({...newTournament, start_time: e.target.value})} />
                <div className="flex gap-2">
                  <Button variant="gaming" onClick={handleCreateTournament} disabled={creatingTournament}>
                    {creatingTournament ? 'Creating...' : 'Create'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateTournament(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Tournaments List */}
            {tournamentsLoading ? (
              <Skeleton className="h-32" />
            ) : tournamentsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No tournaments created yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Entry/Prize</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Room ID / Pass</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournamentsList.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          <div>{t.title}</div>
                          <div className="text-xs text-muted-foreground">{t.game_mode}</div>
                        </TableCell>
                        <TableCell>{t.participant_count}/{t.max_players}</TableCell>
                        <TableCell>₹{t.entry_fee} / ₹{t.prize_pool}</TableCell>
                        <TableCell>
                          <Select value={t.status} onValueChange={(val) => handleUpdateTournamentStatus(t.id, val as any)}>
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upcoming">Upcoming</SelectItem>
                              <SelectItem value="ongoing">Ongoing</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Input
                              placeholder="Room ID"
                              defaultValue={t.room_id || ''}
                              className="h-7 text-xs w-[120px]"
                              onBlur={(e) => handleUpdateRoomInfo(t.id, e.target.value, t.room_password)}
                            />
                            <Input
                              placeholder="Password"
                              defaultValue={t.room_password || ''}
                              className="h-7 text-xs w-[120px]"
                              onBlur={(e) => handleUpdateRoomInfo(t.id, t.room_id, e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {t.winner_id ? (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              <Crown className="h-3 w-3 mr-1" />
                              {t.participants?.find((p: any) => p.user_id === t.winner_id)?.email || 'Selected'}
                            </Badge>
                          ) : t.participants && t.participants.length > 0 ? (
                            <Select onValueChange={(userId) => handleSelectWinner(t, userId)}>
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue placeholder="Select Winner" />
                              </SelectTrigger>
                              <SelectContent>
                                {t.participants.map((p: any) => (
                                  <SelectItem key={p.user_id} value={p.user_id}>
                                    {p.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">No participants</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteTournament(t.id)}>
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

        {/* Listings Management */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Listings Management
                <Badge variant="secondary" className="ml-2">{listings.length} total</Badge>
              </span>
              <Button size="sm" variant="outline" onClick={fetchListings}>
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by seller email or login method..."
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {listingsLoading ? (
              <Skeleton className="h-32" />
            ) : (
              (() => {
                const q = listingSearch.toLowerCase();
                const filtered = listings.filter(
                  (l: any) =>
                    !q ||
                    l.seller_email?.toLowerCase().includes(q) ||
                    String(l.login_method || '').toLowerCase().includes(q) ||
                    String(l.id_level).includes(q)
                );
                if (filtered.length === 0) {
                  return (
                    <p className="text-center text-muted-foreground py-6">No listings found</p>
                  );
                }
                return (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Level</TableHead>
                          <TableHead>Login</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-semibold">Lvl {l.id_level}</TableCell>
                            <TableCell className="capitalize text-sm">{l.login_method}</TableCell>
                            <TableCell className="font-mono">₹{Number(l.price).toFixed(0)}</TableCell>
                            <TableCell className="text-sm">{l.seller_email}</TableCell>
                            <TableCell>
                              {l.is_sold ? (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Sold</Badge>
                              ) : (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(l.created_at), 'dd MMM yy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/listing/${l.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This permanently removes Lvl {l.id_level} listing by {l.seller_email}. This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteListing(l.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>

        {/* Support Reports */}

        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" />
                Support Reports
                <Badge variant="secondary" className="ml-2">
                  {reports.filter((r) => r.status === 'open').length} open
                </Badge>
              </span>
              <Button size="sm" variant="outline" onClick={fetchReports}>
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subject, email, or message..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={reportFilter} onValueChange={(v: any) => setReportFilter(v)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              (() => {
                const filtered = reports.filter((r) => {
                  if (reportFilter !== 'all' && r.status !== reportFilter) return false;
                  if (reportSearch) {
                    const q = reportSearch.toLowerCase();
                    return (
                      r.subject?.toLowerCase().includes(q) ||
                      r.contact_email?.toLowerCase().includes(q) ||
                      r.message?.toLowerCase().includes(q)
                    );
                  }
                  return true;
                });
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 text-muted-foreground">
                      <LifeBuoy className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      No reports found
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {filtered.map((r) => {
                      const statusColors: Record<string, string> = {
                        open: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                        in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                        resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
                        closed: 'bg-muted text-muted-foreground border-border',
                      };
                      return (
                        <div
                          key={r.id}
                          className="p-4 border border-border rounded-lg bg-card/50 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold truncate">{r.subject}</h4>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {r.category}
                                </Badge>
                                <Badge className={`text-xs capitalize ${statusColors[r.status] || ''}`}>
                                  {r.status?.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <a
                                    href={`mailto:${r.contact_email}?subject=Re:%20${encodeURIComponent(r.subject)}`}
                                    className="hover:text-primary underline-offset-2 hover:underline"
                                  >
                                    {r.contact_email}
                                  </a>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(r.created_at), 'PP p')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm whitespace-pre-wrap text-foreground/90 bg-muted/30 p-3 rounded-md">
                            {r.message}
                          </p>

                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={r.status}
                              onValueChange={(v) => handleUpdateReportStatus(r.id, v)}
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="h-8"
                            >
                              <a href={`mailto:${r.contact_email}?subject=Re:%20${encodeURIComponent(r.subject)}`}>
                                <Mail className="h-3 w-3" /> Reply
                              </a>
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 text-destructive">
                                  <Trash2 className="h-3 w-3" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteReport(r.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
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
                      <TableHead>Verification</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead className="w-[260px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          {user.is_verified_seller ? (
                            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verified Seller
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Not Verified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            <IndianRupee className="h-3 w-3 mr-1" />
                            {user.balance.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
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
                            <Button
                              variant={user.is_verified_seller ? 'outline' : 'gaming'}
                              size="sm"
                              className="gap-1"
                              onClick={() => handleToggleVerifiedSeller(user)}
                            >
                              <Shield className="h-4 w-4" />
                              {user.is_verified_seller ? 'Unverify' : 'Verify'}
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
        {/* Payment proof lightbox */}
        <Dialog open={!!proofUrl} onOpenChange={(o) => !o && setProofUrl(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payment Proof</DialogTitle>
            </DialogHeader>
            {proofUrl && <img src={proofUrl} alt="Payment proof full view" className="w-full rounded" />}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
