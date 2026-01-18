import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  X,
  ChevronLeft,
  Circle
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  last_message_at: string;
  other_user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
  product?: {
    name: string;
  } | null;
  unread_count?: number;
  last_message?: string;
}

interface ChatInterfaceProps {
  currentUserId: string;
  sellerId?: string;
  productId?: string;
  productName?: string;
  triggerButton?: React.ReactNode;
}

const ChatInterface = ({ 
  currentUserId, 
  sellerId, 
  productId,
  productName,
  triggerButton 
}: ChatInterfaceProps) => {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open && currentUserId) {
      loadConversations();
    }
  }, [open, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!activeConversation) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          
          // Mark as read if not from current user
          if (newMsg.sender_id !== currentUserId) {
            markAsRead(newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation?.id, currentUserId]);

  const loadConversations = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        product:products(name)
      `)
      .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false });

    if (data) {
      // Fetch other user details for each conversation
      const conversationsWithUsers = await Promise.all(
        data.map(async (conv: any) => {
          const otherUserId = conv.buyer_id === currentUserId ? conv.seller_id : conv.buyer_id;
          
          const { data: userData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .eq('id', otherUserId)
            .single();

          // Get last message
          const { data: lastMsgData } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', currentUserId);

          return {
            ...conv,
            other_user: userData,
            last_message: lastMsgData?.content,
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithUsers);
    }
    
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      
      // Mark unread messages as read
      const unreadIds = data
        .filter(m => !m.is_read && m.sender_id !== currentUserId)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const startConversation = async () => {
    if (!sellerId || !currentUserId) return;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', currentUserId)
      .eq('seller_id', sellerId)
      .eq('product_id', productId || null)
      .single();

    if (existing) {
      setActiveConversation(existing);
      await loadMessages(existing.id);
      return;
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        buyer_id: currentUserId,
        seller_id: sellerId,
        product_id: productId || null
      })
      .select()
      .single();

    if (newConv) {
      setActiveConversation(newConv);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    setSending(true);
    
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversation.id,
        sender_id: currentUserId,
        content: newMessage.trim()
      });

    if (!error) {
      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversation.id);

      setNewMessage("");
    }

    setSending(false);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm');
    }
    return format(date, 'MMM d, HH:mm');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && sellerId) {
      startConversation();
    }
    if (!isOpen) {
      setActiveConversation(null);
      setMessages([]);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm" className="gap-2 relative">
            <MessageCircle className="h-4 w-4" />
            Messages
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <AnimatePresence mode="wait">
          {!activeConversation ? (
            // Conversations List
            <motion.div
              key="conversations"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-secondary" />
                  Messages
                  {totalUnread > 0 && (
                    <Badge variant="secondary">{totalUnread} new</Badge>
                  )}
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-20 px-4">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start a conversation by messaging a seller
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          setActiveConversation(conv);
                          loadMessages(conv.id);
                        }}
                        className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conv.other_user?.avatar_url || undefined} />
                            <AvatarFallback>
                              {conv.other_user?.full_name?.[0] || conv.other_user?.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">
                                {conv.other_user?.full_name || conv.other_user?.email}
                              </p>
                              {conv.unread_count! > 0 && (
                                <Circle className="h-2.5 w-2.5 fill-secondary text-secondary" />
                              )}
                            </div>
                            {conv.product?.name && (
                              <p className="text-xs text-secondary truncate">
                                Re: {conv.product.name}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {conv.last_message || "No messages yet"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          ) : (
            // Active Chat
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full"
            >
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setActiveConversation(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activeConversation.other_user?.avatar_url || undefined} />
                  <AvatarFallback>
                    {activeConversation.other_user?.full_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {activeConversation.other_user?.full_name || 'User'}
                  </p>
                  {activeConversation.product?.name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activeConversation.product.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.sender_id === currentUserId ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2",
                          message.sender_id === currentUserId
                            ? "bg-secondary text-white rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          message.sender_id === currentUserId
                            ? "text-white/70"
                            : "text-muted-foreground"
                        )}>
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
};

export default ChatInterface;