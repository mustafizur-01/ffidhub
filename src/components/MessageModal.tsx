import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowLeft, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message must be less than 1000 characters")
});

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface BuyerThread {
  buyer_id: string;
  buyer_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  sellerId: string;
  sellerEmail?: string;
}

const MessageModal = ({ isOpen, onClose, listingId, sellerId, sellerEmail }: MessageModalProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [buyerThreads, setBuyerThreads] = useState<BuyerThread[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerThread | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isSeller = user?.id === sellerId;

  useEffect(() => {
    if (isOpen && user) {
      if (isSeller) {
        fetchBuyerThreads();
      } else {
        fetchMessages(sellerId);
        markMessagesAsRead();
      }
      
      const channel = supabase
        .channel(`messages-${listingId}-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `listing_id=eq.${listingId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
              if (isSeller) {
                fetchBuyerThreads();
                if (selectedBuyer && (newMsg.sender_id === selectedBuyer.buyer_id || newMsg.receiver_id === selectedBuyer.buyer_id)) {
                  setMessages((prev) => [...prev, newMsg]);
                }
              } else {
                setMessages((prev) => [...prev, newMsg]);
              }
              if (newMsg.receiver_id === user.id) {
                markMessagesAsRead();
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, user, listingId, isSeller, selectedBuyer]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchBuyerThreads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('listing_id', listingId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const buyerMap = new Map<string, BuyerThread>();
      
      for (const msg of allMessages || []) {
        const buyerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (buyerId === user.id) continue;
        
        if (!buyerMap.has(buyerId)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', buyerId)
            .single();

          const unreadCount = (allMessages || []).filter(
            m => m.sender_id === buyerId && m.receiver_id === user.id && !m.read
          ).length;

          buyerMap.set(buyerId, {
            buyer_id: buyerId,
            buyer_email: profile?.email || 'Unknown',
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: unreadCount
          });
        }
      }

      setBuyerThreads(Array.from(buyerMap.values()));
    } catch (error: any) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('listing_id', listingId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('listing_id', listingId)
      .eq('receiver_id', user.id)
      .eq('read', false);
  };

  const handleSelectBuyer = (buyer: BuyerThread) => {
    setSelectedBuyer(buyer);
    fetchMessages(buyer.buyer_id);
    supabase
      .from('messages')
      .update({ read: true })
      .eq('listing_id', listingId)
      .eq('sender_id', buyer.buyer_id)
      .eq('receiver_id', user?.id)
      .eq('read', false)
      .then(() => fetchBuyerThreads());
  };

  const handleBackToThreads = () => {
    setSelectedBuyer(null);
    setMessages([]);
    fetchBuyerThreads();
  };

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;

    const validation = messageSchema.safeParse({ content: newMessage });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const receiverId = isSeller ? selectedBuyer?.buyer_id : sellerId;
    if (!receiverId) {
      toast.error('Cannot send message');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: validation.data.content,
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canSendMessage = isSeller ? !!selectedBuyer : true;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSeller && selectedBuyer && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleBackToThreads}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {isSeller 
              ? selectedBuyer 
                ? `Chat with ${selectedBuyer.buyer_email}`
                : 'Buyer Messages'
              : `Message Seller${sellerEmail ? ` (${sellerEmail})` : ''}`
            }
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[400px]">
          {isSeller && !selectedBuyer ? (
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : buyerThreads.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No messages from buyers yet.
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {buyerThreads.map((thread) => (
                    <button
                      key={thread.buyer_id}
                      onClick={() => handleSelectBuyer(thread)}
                      className="w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{thread.buyer_email}</span>
                        </div>
                        {thread.unread_count > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                            {thread.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{thread.last_message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(thread.last_message_time)}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          ) : (
            <>
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No messages yet. Start a conversation!
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            msg.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {canSendMessage && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="min-h-[60px] resize-none"
                    maxLength={1000}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon" className="h-[60px]">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageModal;
