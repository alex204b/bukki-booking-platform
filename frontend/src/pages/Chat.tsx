// Chat page with #330007 color scheme
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { messageService, businessService, bookingService, offerService, api } from '../services/api';
import { Send, ArrowLeft, MoreVertical, Search, MessageCircle, Mail, Gift, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';
import { format, formatDistanceToNow } from 'date-fns';
import { useChat } from '../hooks/useChat';

interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  status: 'unread' | 'read' | 'archived';
}

interface Conversation {
  business: {
    id: string;
    name: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  unreadCount: number;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface SystemMessage {
  id: string;
  type: 'team_invitation' | 'promotional_offer';
  subject: string;
  content: string;
  status: 'unread' | 'read' | 'archived';
  business?: {
    id: string;
    name: string;
  };
  metadata?: {
    offerCode?: string;
    discount?: number;
    validUntil?: string;
    businessMemberId?: string;
  };
  createdAt: string;
}

export const Chat: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bookingIdFromUrl = searchParams.get('bookingId');
  const tabFromUrl = searchParams.get('tab') as 'messages' | 'invitations' | 'offers' | 'archived' | null;
  const [activeTab, setActiveTab] = useState<'messages' | 'invitations' | 'offers' | 'archived'>(tabFromUrl || 'messages');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | SystemMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery(
    'chat-conversations',
    () => messageService.getConversations(),
    {
      select: (response) => {
        let convs: any[] = [];
        if (Array.isArray(response.data)) {
          convs = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          convs = response.data.data;
        }
        return convs;
      },
      refetchInterval: 5000,
      retry: false,
    }
  );

  const { data: systemMessages = [] } = useQuery(
    'all-messages',
    () => messageService.getMessages(),
    {
      select: (response) => {
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        return [];
      },
      refetchInterval: 30000,
    }
  );

  const { data: offers = [] } = useQuery(
    'user-offers-for-chat',
    async () => {
      try {
        const response = await offerService.getUserOffers();
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        return [];
      } catch (error) {
        return [];
      }
    },
    { refetchInterval: 30000 }
  );

  const { data: myBusinessMemberships = [] } = useQuery(
    'my-business-memberships',
    async () => {
      if (!user?.id) return [];
      try {
        const invitesRes = await businessService.myInvites();
        const invites = invitesRes.data || [];
        const activeMemberships = invites
          .filter((invite: any) => invite.status === 'active' || invite.status === 'accepted')
          .map((invite: any) => invite.business?.id)
          .filter(Boolean);

        if (user.role === 'employee') {
          try {
            const myBusinessRes = await businessService.getMyBusiness();
            if (myBusinessRes.data?.id) {
              activeMemberships.push(myBusinessRes.data.id);
            }
          } catch (err) {}
        }
        return Array.from(new Set(activeMemberships));
      } catch (error) {
        return [];
      }
    },
    { enabled: !!user?.id, refetchInterval: 60000 }
  );

  const teamInvitations = systemMessages.filter((msg: SystemMessage) =>
    msg.type === 'team_invitation' && msg.status !== 'archived'
  );

  const promotionalOffers: SystemMessage[] = offers.map((offer: any) => ({
    id: offer.id,
    type: 'promotional_offer' as const,
    subject: offer.title,
    content: offer.description,
    status: 'unread' as const,
    business: offer.business ? {
      id: offer.business.id,
      name: offer.business.name || 'Unknown Business',
    } : undefined,
    metadata: {
      offerCode: offer.discountCode,
      discount: offer.discountAmount || offer.discountPercentage,
      validUntil: offer.validUntil,
    },
    createdAt: offer.createdAt,
  }));

  const archivedMessages = systemMessages.filter((msg: SystemMessage) => msg.status === 'archived');

  const filteredConversations = conversations.filter((conv: Conversation) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.business.name.toLowerCase().includes(query) ||
      conv.lastMessage.content.toLowerCase().includes(query) ||
      (conv.customer && `${conv.customer.firstName} ${conv.customer.lastName}`.toLowerCase().includes(query))
    );
  });

  const { data: userBookings = [] } = useQuery(
    ['user-bookings-for-chat', businessId, user?.id],
    () => bookingService.getAll(),
    {
      enabled: !!businessId && !!user?.id && (user?.role === 'business_owner' || user?.role === 'employee'),
      select: (response) => {
        const bookings = response.data || [];
        if (!Array.isArray(bookings)) return [];
        return bookings.filter((b: any) => b.business?.id === businessId || b.businessId === businessId);
      },
    }
  );

  const { data: business } = useQuery(
    ['business', businessId],
    () => businessService.getById(businessId!),
    {
      enabled: !!businessId,
      select: (response) => response.data,
    }
  );

  const getCustomerIdFromConversation = () => {
    if (selectedConversation && 'business' in selectedConversation) {
      const conv = selectedConversation as Conversation;
      if (conv.customer) return conv.customer.id;
    }
    const currentConv = conversations.find((conv: Conversation) => conv.business.id === businessId);
    return currentConv?.customer?.id || null;
  };

  const conversationId = useMemo(() => {
    if (!businessId || !user?.id || !business?.owner?.id) return undefined;
    const businessOwnerId = String(business.owner.id);
    const userId = String(user.id);
    if (user.role === 'customer') {
      const ids = [userId, businessOwnerId].sort();
      return `${ids[0]}-${ids[1]}`;
    } else {
      const customerId = getCustomerIdFromConversation();
      if (customerId) {
        const ids = [customerId, businessOwnerId].sort();
        return `${ids[0]}-${ids[1]}`;
      }
      const ids = [userId, businessOwnerId].sort();
      return `${ids[0]}-${ids[1]}`;
    }
  }, [businessId, user?.id, business?.owner?.id, selectedConversation, conversations]);

  const { messages: wsMessages, isConnected: wsConnected } = useChat(conversationId);

  const { data: initialMessages = [], isLoading: messagesLoading } = useQuery(
    ['chat-conversation', businessId],
    () => messageService.getConversation(businessId!),
    {
      enabled: !!businessId,
      select: (response: any) => {
        const data = response.data || [];
        return data as ChatMessage[];
      },
      refetchInterval: 3000,
      refetchOnWindowFocus: true,
      cacheTime: 0,
      staleTime: 0,
      onSuccess: (data) => {
        if (businessId) {
          messageService.markConversationAsRead(businessId).catch(() => {});
        }
      },
    }
  );

  const allMessages: ChatMessage[] = useMemo(() => {
    return Array.isArray(initialMessages) ? initialMessages : [];
  }, [initialMessages]);

  const typedMessages: ChatMessage[] = useMemo(() => {
    if (!user?.id || allMessages.length === 0) return [];
    if (user.role === 'business_owner' || user.role === 'employee') {
      const customerId = getCustomerIdFromConversation();
      if (!customerId) return allMessages;
      return allMessages.filter(msg => {
        const senderId = msg.sender?.id;
        const recipientId = msg.recipient?.id;
        return recipientId === customerId || senderId === customerId;
      });
    }
    if (user.role === 'customer') {
      const businessOwnerId = business?.owner?.id;
      if (!businessOwnerId) return allMessages;
      return allMessages.filter(msg => {
        const senderId = msg.sender?.id;
        const recipientId = msg.recipient?.id;
        return (senderId === user.id && recipientId === businessOwnerId) ||
               (senderId === businessOwnerId && recipientId === user.id);
      });
    }
    return allMessages;
  }, [allMessages, user, business, selectedConversation, conversations]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !businessId) return;
    setSending(true);
    try {
      const customerId = getCustomerIdFromConversation();
      let bookingId = bookingIdFromUrl;
      if (customerId && userBookings.length > 0) {
        const customerBooking = userBookings.find((b: any) =>
          (b.business?.id === businessId || b.businessId === businessId) &&
          (b.customer?.id === customerId || b.customerId === customerId)
        );
        if (customerBooking) bookingId = customerBooking.id;
      }
      await messageService.sendChatMessage(businessId, content.trim(), bookingId || undefined);
      setMessage('');
      await queryClient.invalidateQueries(['chat-conversation', businessId]);
      await queryClient.refetchQueries(['chat-conversation', businessId]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send message';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setSending(false);
    }
  };

  const acceptInviteMutation = useMutation(
    ({ businessId, email }: { businessId: string; email: string }) =>
      businessService.acceptInvite(businessId, email),
    {
      onSuccess: async (data: any) => {
        toast.success(t('invitationAcceptedRedirecting') || 'Invitation accepted!');
        queryClient.invalidateQueries('all-messages');
        queryClient.invalidateQueries('my-business-memberships');
        try {
          const profileRes = await api.get('/auth/profile');
          const updatedUser = profileRes.data;
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.location.reload();
        } catch (err) {
          setTimeout(() => navigate('/business-dashboard'), 1500);
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || t('failedToAcceptInvitation') || 'Failed to accept invitation');
      },
    }
  );

  const archiveMutation = useMutation(
    (id: string) => messageService.archiveMessage(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-messages');
        toast.success(t('messageArchived') || 'Message archived');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || t('failedToArchive') || 'Failed to archive');
      },
    }
  );

  const handleAcceptInvite = async (msg: SystemMessage) => {
    if (!msg.business?.id || !user?.email) return;
    await acceptInviteMutation.mutateAsync({
      businessId: msg.business.id,
      email: user.email,
    });
  };

  const handleArchive = async (id: string) => {
    await archiveMutation.mutateAsync(id);
  };

  const isAlreadyMember = (msg: SystemMessage) => {
    if (!msg.business?.id) return false;
    return myBusinessMemberships.includes(msg.business.id);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [typedMessages]);

  // Read tab from URL and set it on mount/URL change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['messages', 'invitations', 'offers', 'archived'].includes(tabParam)) {
      setActiveTab(tabParam as 'messages' | 'invitations' | 'offers' | 'archived');
    } else if (!businessId && !tabParam) {
      // Default to messages if no tab or businessId
      setActiveTab('messages');
    }
  }, [searchParams, businessId]);

  useEffect(() => {
    if (businessId) {
      const conv = conversations.find((c: Conversation) => c.business.id === businessId);
      if (conv) {
        setSelectedConversation(conv);
        setActiveTab('messages');
        // Update URL to remove tab param when viewing a specific conversation
        if (searchParams.get('tab')) {
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('tab');
          setSearchParams(newSearchParams, { replace: true });
        }
      }
    }
  }, [businessId, conversations, searchParams, setSearchParams]);

  // Prevent body scrollbar on mount, restore on unmount
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending || !businessId) return;
    await handleSendMessage(message.trim());
  };

  const currentConversation = conversations.find((conv: Conversation) => conv.business.id === businessId);
  const displayName = user?.role === 'business_owner' || user?.role === 'employee'
    ? (currentConversation?.customer ? `${currentConversation.customer.firstName} ${currentConversation.customer.lastName}` : (t('customer') || 'Customer'))
    : (business?.name || t('business') || 'Business');

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    msgs.forEach((msg) => {
      const date = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const messageGroups = typedMessages.length > 0 ? groupMessagesByDate(typedMessages) : {};

  const getCurrentTabConversations = () => {
    if (activeTab === 'messages') return filteredConversations;
    if (activeTab === 'invitations') return teamInvitations;
    if (activeTab === 'offers') return promotionalOffers;
    if (activeTab === 'archived') return archivedMessages;
    return [];
  };

  const getConversationDisplay = (conv: Conversation | SystemMessage) => {
    if ('business' in conv && 'lastMessage' in conv) {
      const convTyped = conv as Conversation;
      const name = user?.role === 'business_owner' || user?.role === 'employee'
        ? (convTyped.customer ? `${convTyped.customer.firstName} ${convTyped.customer.lastName}` : t('customer') || 'Customer')
        : convTyped.business.name;
      const avatar = user?.role === 'business_owner' || user?.role === 'employee'
        ? (convTyped.customer ? `${convTyped.customer.firstName[0]}${convTyped.customer.lastName[0]}` : 'C')
        : convTyped.business.name.substring(0, 2).toUpperCase();
      return {
        name,
        avatar,
        lastMessage: convTyped.lastMessage.content,
        time: formatDistanceToNow(new Date(convTyped.lastMessage.createdAt), { addSuffix: true }),
        unread: convTyped.unreadCount
      };
    } else {
      const msgTyped = conv as SystemMessage;
      return {
        name: msgTyped.business?.name || msgTyped.subject,
        avatar: msgTyped.type === 'team_invitation' ? 'TI' : 'PO',
        lastMessage: msgTyped.content,
        time: formatDistanceToNow(new Date(msgTyped.createdAt), { addSuffix: true }),
        unread: msgTyped.status === 'unread' ? 1 : 0
      };
    }
  };

  const tabs = [
    { id: 'messages', label: t('messages') || 'Messages', icon: MessageCircle, count: conversations.length },
    { id: 'invitations', label: t('invitations') || 'Invitations', icon: Mail, count: teamInvitations.length },
    { id: 'offers', label: t('offers') || 'Offers', icon: Gift, count: offers.length },
    { id: 'archived', label: t('archived') || 'Archived', icon: Archive, count: archivedMessages.length },
  ];

  const currentConversations = getCurrentTabConversations();

  return (
    <div className="h-full bg-white overflow-hidden">
        <div className="flex gap-0 h-full overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchConversations') || 'Search'}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#330007]"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setSelectedConversation(null);
                      if (tab.id !== 'messages') {
                        const newSearchParams = new URLSearchParams();
                        newSearchParams.set('tab', tab.id);
                        navigate(`/chat?${newSearchParams.toString()}`);
                      } else {
                        navigate('/chat');
                      }
                    }}
                    className={`flex-1 flex flex-col items-center gap-0.5 px-1.5 py-2 text-[10px] font-medium border-b-2 ${
                      activeTab === tab.id
                        ? 'border-[#330007] text-[#330007]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                    style={activeTab === tab.id ? { borderBottomColor: '#330007', color: '#330007' } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.count > 0 && (
                      <span className="bg-[#330007] text-white text-[10px] px-1 rounded-full" style={{ backgroundColor: '#330007' }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#330007] border-t-transparent"></div>
                </div>
              ) : currentConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-3 py-6">
                  <MessageCircle className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">No conversations yet</p>
                </div>
              ) : (
                currentConversations.map((conv: Conversation | SystemMessage) => {
                  const display = getConversationDisplay(conv);
                  const isSystemMessage = 'type' in conv;
                  const convId = isSystemMessage ? (conv as SystemMessage).id : (conv as Conversation).business.id;
                  const isSelected = selectedConversation && (
                    isSystemMessage
                      ? (selectedConversation as SystemMessage).id === (conv as SystemMessage).id
                      : 'business' in selectedConversation && (selectedConversation as Conversation).business.id === (conv as Conversation).business.id
                  );

                  return (
                    <div
                      key={convId}
                      onClick={() => {
                        setSelectedConversation(conv);
                        if ('business' in conv && 'lastMessage' in conv) {
                          navigate(`/chat/${(conv as Conversation).business.id}`);
                        }
                      }}
                      className={`flex items-center gap-2 p-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        isSelected ? 'bg-[#FFF5F5]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#330007] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0" style={{ backgroundColor: '#330007' }}>
                        {display.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="font-semibold text-xs text-gray-900 truncate">{display.name}</h3>
                          <span className="text-[10px] text-gray-500 ml-2">{display.time}</span>
                        </div>
                        <p className="text-[10px] text-gray-600 truncate">{display.lastMessage}</p>
                        {isSystemMessage && (conv as SystemMessage).type === 'team_invitation' && !isAlreadyMember(conv as SystemMessage) && (
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptInvite(conv as SystemMessage);
                              }}
                              disabled={acceptInviteMutation.isLoading}
                              className="text-[10px] bg-[#330007] text-white px-2 py-0.5 rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                              style={{ backgroundColor: '#330007' }}
                            >
                              {t('accept') || 'Accept'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(conv.id);
                              }}
                              className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded hover:bg-gray-300"
                            >
                              {t('decline') || 'Decline'}
                            </button>
                          </div>
                        )}
                      </div>
                      {display.unread > 0 && !isSystemMessage && (
                        <span className="bg-[#330007] text-white text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#330007' }}>
                          {display.unread}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-white flex flex-col overflow-hidden">
            {businessId ? (
              <>
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#330007] flex items-center justify-center text-white font-semibold text-xs" style={{ backgroundColor: '#330007' }}>
                      {displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-gray-900">{displayName}</h2>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                {/* Messages */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 p-3 bg-gray-50 overflow-y-auto"
                >
                  {messagesLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#330007] border-t-transparent"></div>
                    </div>
                  ) : Object.keys(messageGroups).length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <MessageCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">{t('noMessages') || 'No messages yet'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(messageGroups).map(([date, msgs]) => (
                        <div key={date}>
                          <div className="text-center my-1.5">
                            <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full">
                              {format(new Date(date), 'EEEE, MMMM d, yyyy') === format(new Date(), 'EEEE, MMMM d, yyyy')
                                ? t('today') || 'Today'
                                : format(new Date(date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {msgs.map((msg) => {
                            const isMyMessage = msg.sender?.id && user?.id && String(msg.sender.id) === String(user.id);
                            return isMyMessage ? (
                              <div key={msg.id} className="flex justify-end mb-1.5">
                                <div className="max-w-[70%] bg-[#330007] text-white px-3 py-1.5 rounded-2xl" style={{ backgroundColor: '#330007' }}>
                                  <p className="text-xs">{msg.content}</p>
                                  <span className="text-[10px] opacity-75 mt-0.5 block text-right">
                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div key={msg.id} className="flex items-start gap-1.5 mb-1.5">
                                <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                                  {msg.sender?.firstName?.[0] || '?'}
                                </div>
                                <div className="max-w-[70%]">
                                  <span className="text-[10px] text-gray-600 mb-0.5 block">
                                    {msg.sender?.firstName} {msg.sender?.lastName}
                                  </span>
                                  <div className="bg-white px-3 py-1.5 rounded-2xl shadow-sm">
                                    <p className="text-xs text-gray-900">{msg.content}</p>
                                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                                      {format(new Date(msg.createdAt), 'h:mm a')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="bg-white border-t border-gray-200 p-3">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('typeMessage') || 'Type a message...'}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#330007]"
                    />
                    <button
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="bg-[#330007] text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                      style={{ backgroundColor: '#330007' }}
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">{t('selectConversation') || 'Select a conversation'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};
