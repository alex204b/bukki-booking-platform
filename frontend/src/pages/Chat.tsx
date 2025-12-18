import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { messageService, businessService, bookingService, offerService, api } from '../services/api';
import { Send, ArrowLeft, User, Building2, MoreVertical, Search, Menu, X, Clock, MessageCircle, Mail, Gift, Users, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';
import { format, formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
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
    avatar?: string;
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
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'messages' | 'invitations' | 'offers' | 'archived'>('messages');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | SystemMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Get bookingId from URL search params if available
  const searchParams = new URLSearchParams(window.location.search);
  const bookingIdFromUrl = searchParams.get('bookingId');

  // Get all conversations for sidebar
  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError } = useQuery(
    'chat-conversations',
    () => messageService.getConversations(),
    {
      select: (response) => {
        // Handle paginated response - extract the data array
        let convs: any[] = [];
        if (Array.isArray(response.data)) {
          convs = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          convs = response.data.data;
        }

        console.log('[Chat] Conversations received:', {
          count: convs.length,
          conversations: convs,
          userRole: user?.role,
        });
        return convs;
      },
      refetchInterval: 5000, // Poll every 5 seconds
      retry: false,
      onError: (error: any) => {
        console.error('[Chat] Error fetching conversations:', error);
        if (!error.response) {
          console.warn('[Chat] Backend not available, conversations will not load');
        }
      },
    }
  );

  // Get all system messages (invitations)
  const { data: systemMessages = [], isLoading: systemMessagesLoading } = useQuery(
    'all-messages',
    () => messageService.getMessages(),
    {
      select: (response) => {
        // Handle paginated response - extract the data array
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        return [];
      },
      refetchInterval: 30000, // Poll every 30 seconds
    }
  );

  // Get offers from the new offers API
  const { data: offers = [], isLoading: offersLoading } = useQuery(
    'user-offers-for-chat',
    async () => {
      try {
        const response = await offerService.getUserOffers();
        // Handle paginated response - extract the data array
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        return [];
      } catch (error) {
        console.error('[Chat] Error fetching offers:', error);
        return [];
      }
    },
    {
      refetchInterval: 30000, // Poll every 30 seconds
    }
  );

  // Fetch user's business memberships to check if they're already a member
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
          } catch (err) {
            // User might not have a business yet, that's okay
          }
        }
        
        return Array.from(new Set(activeMemberships));
      } catch (error) {
        console.error('Failed to fetch business memberships:', error);
        return [];
      }
    },
    {
      enabled: !!user?.id,
      refetchInterval: 60000,
    }
  );

  // Filter messages by type and status
  const teamInvitations = systemMessages.filter((msg: SystemMessage) => 
    msg.type === 'team_invitation' && msg.status !== 'archived'
  );
  
  // Convert offers to SystemMessage format for display
  const promotionalOffers: SystemMessage[] = offers.map((offer: any) => {
    if (!offer.business || !offer.business.id) {
      console.warn('[Chat] Offer missing business relation:', offer);
    }
    return {
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
    };
  });
  
  const archivedMessages = systemMessages.filter((msg: SystemMessage) => 
    msg.status === 'archived'
  );

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv: Conversation) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.business.name.toLowerCase().includes(query) ||
      conv.lastMessage.content.toLowerCase().includes(query) ||
      (conv.customer && `${conv.customer.firstName} ${conv.customer.lastName}`.toLowerCase().includes(query))
    );
  });

  // Filter system messages by search
  const filteredSystemMessages = systemMessages.filter((msg: SystemMessage) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(query) ||
      msg.content.toLowerCase().includes(query) ||
      (msg.business && msg.business.name.toLowerCase().includes(query))
    );
  });

  // Get user's bookings to find a bookingId for this business (for business owners/employees)
  const { data: userBookings = [] } = useQuery(
    ['user-bookings-for-chat', businessId, user?.id],
    () => bookingService.getAll(),
    {
      enabled: !!businessId && !!user?.id && (user?.role === 'business_owner' || user?.role === 'employee'),
      select: (response) => {
        const bookings = response.data || [];
        // Find bookings for this business
        return bookings.filter((b: any) => 
          b.business?.id === businessId || b.businessId === businessId
        );
      },
    }
  );

  // Find a bookingId for this business
  const getBookingIdForBusiness = () => {
    if (bookingIdFromUrl) return bookingIdFromUrl;
    
    // For business owners/employees, find a booking with this business
    if ((user?.role === 'business_owner' || user?.role === 'employee') && userBookings.length > 0) {
      // Get the most recent booking
      const booking = userBookings[0];
      return booking?.id;
    }
    
    // For customers, find their booking with this business
    if (user?.role === 'customer' && userBookings.length > 0) {
      const booking = userBookings.find((b: any) => 
        (b.business?.id === businessId || b.businessId === businessId) &&
        (b.customer?.id === user?.id || b.customerId === user?.id)
      );
      return booking?.id;
    }
    
    return undefined;
  };

  // Get business info
  const { data: business } = useQuery(
    ['business', businessId],
    () => businessService.getById(businessId!),
    {
      enabled: !!businessId,
      select: (response) => response.data,
    }
  );

  // Get conversation messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery(
    ['chat-conversation', businessId],
    () => messageService.getConversation(businessId!),
    {
      enabled: !!businessId, // Enable when businessId exists, even if no conversation selected yet
      select: (response: any) => {
        const data = response.data || [];
        return data as ChatMessage[];
      },
      refetchInterval: 3000, // Poll every 3 seconds for new messages
      onSuccess: () => {
        // Mark conversation as read when messages are loaded
        if (businessId) {
          messageService.markConversationAsRead(businessId).catch(console.error);
        }
      },
      onError: (error: any) => {
        // If conversation doesn't exist yet (404), that's okay - it will be created on first message
        if (error.response?.status !== 404) {
          console.error('[Chat] Error fetching messages:', error);
        }
      },
    }
  );
  
  // Type assertion for messages to ensure it's always ChatMessage[]
  const typedMessages: ChatMessage[] = Array.isArray(messages) ? messages : [];

  // Get customer ID from selected conversation (for business owners/employees)
  const getCustomerIdFromConversation = () => {
    if (selectedConversation && 'business' in selectedConversation) {
      const conv = selectedConversation as Conversation;
      if (conv.customer) {
        return conv.customer.id;
      }
    }
    // Also check current conversation from the list
    const currentConv = conversations.find((conv: Conversation) => conv.business.id === businessId);
    if (currentConv?.customer) {
      return currentConv.customer.id;
    }
    return null;
  };

  // Send message mutation
  const sendMessageMutation = useMutation(
    (content: string) => {
      // For business owners/employees, try to get customer ID from conversation first
      // Then fall back to bookingId
      const customerId = getCustomerIdFromConversation();
      let bookingId = getBookingIdForBusiness();
      
      // If we have a customer ID, try to find their booking
      if (customerId && userBookings.length > 0) {
        const customerBooking = userBookings.find((b: any) => 
          (b.business?.id === businessId || b.businessId === businessId) &&
          (b.customer?.id === customerId || b.customerId === customerId)
        );
        if (customerBooking) {
          bookingId = customerBooking.id;
        }
      }
      
      return messageService.sendChatMessage(businessId!, content, bookingId);
    },
    {
      onSuccess: () => {
        setMessage('');
        queryClient.invalidateQueries(['chat-conversation', businessId]);
        queryClient.invalidateQueries('chat-conversations');
      },
      onError: (error: any) => {
        const errorData = error.response?.data;
        const errorMessage = errorData?.message || errorData?.error || error.message || t('failedToSendMessage') || 'Failed to send message';
        
        console.error('[Chat] Error sending message - FULL DETAILS:', {
          error,
          response: error.response,
          data: errorData,
          message: errorMessage,
          status: error.response?.status,
          statusText: error.response?.statusText,
        });
        
        // Show error in toast
        toast.error(errorMessage);
        
        // Also log to console with a clear message
        console.error('=== MESSAGE SEND ERROR ===');
        console.error('Error Message:', errorMessage);
        console.error('Status Code:', error.response?.status);
        console.error('Full Response:', error.response);
        console.error('==========================');
      },
    }
  );

  // Accept invitation mutation
  const acceptInviteMutation = useMutation(
    ({ businessId, email }: { businessId: string; email: string }) =>
      businessService.acceptInvite(businessId, email),
    {
      onSuccess: async (data: any) => {
        toast.success(t('invitationAcceptedRedirecting') || 'Invitation accepted! Redirecting...');
        queryClient.invalidateQueries('all-messages');
        queryClient.invalidateQueries('my-business-memberships');
        
        // Refresh user data to update role
        try {
          const profileRes = await api.get('/auth/profile');
          const updatedUser = profileRes.data;
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.location.reload(); // Reload to update role in context
        } catch (err) {
          setTimeout(() => {
            navigate('/business-dashboard');
          }, 1500);
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || t('failedToAcceptInvitation') || 'Failed to accept invitation');
      },
    }
  );

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    (id: string) => messageService.markAsRead(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-messages');
      },
    }
  );

  // Archive message mutation
  const archiveMutation = useMutation(
    (id: string) => messageService.archiveMessage(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-messages');
        toast.success(t('messageArchived') || 'Message archived');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || t('failedToArchive') || 'Failed to archive message');
      },
    }
  );

  // Handlers
  const handleAcceptInvite = async (msg: SystemMessage) => {
    if (!msg.business?.id || !user?.email) return;
    await acceptInviteMutation.mutateAsync({
      businessId: msg.business.id,
      email: user.email,
    });
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsReadMutation.mutateAsync(id);
  };

  const handleArchive = async (id: string) => {
    await archiveMutation.mutateAsync(id);
  };

  const isAlreadyMember = (msg: SystemMessage) => {
    if (!msg.business?.id) return false;
    return myBusinessMemberships.includes(msg.business.id);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [typedMessages]);

  // Auto-scroll on mount
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  // Set selected conversation when businessId changes
  useEffect(() => {
    if (businessId) {
      const conv = conversations.find((c: Conversation) => c.business.id === businessId);
      if (conv) {
        setSelectedConversation(conv);
        setActiveTab('messages');
      }
    }
  }, [businessId, conversations]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending || !businessId) {
      console.warn('[Chat] Cannot send message:', { message: message.trim(), sending, businessId });
      return;
    }

    console.log('[Chat] Attempting to send message:', { businessId, messageLength: message.trim().length });
    setSending(true);
    try {
      await sendMessageMutation.mutateAsync(message.trim());
      // After sending, refresh conversations to get the new one
      queryClient.invalidateQueries('chat-conversations');
    } catch (error: any) {
      // Error is already handled in the mutation's onError, but log it here too
      console.error('[Chat] Error in handleSend:', error);
    } finally {
      setSending(false);
    }
  };

  const isMyMessage = (msg: ChatMessage) => {
    if (!user?.id || !msg.sender?.id) {
      console.warn('[isMyMessage] Missing user or sender ID', {
        userId: user?.id,
        senderId: msg.sender?.id,
        messageId: msg.id
      });
      return false;
    }
    
    // Compare IDs as strings to handle any type mismatches
    const senderId = String(msg.sender.id).trim();
    const userId = String(user.id).trim();
    const result = senderId === userId;
    
    // Debug logging for first few messages
    if (process.env.NODE_ENV === 'development' && typedMessages.indexOf(msg) < 3) {
      console.log('[isMyMessage]', {
        senderId,
        userId,
        match: result,
        senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
        userName: `${user?.firstName} ${user?.lastName}`,
        messagePreview: msg.content.substring(0, 30),
        rawSenderId: msg.sender.id,
        rawUserId: user.id,
        senderIdType: typeof msg.sender.id,
        userIdType: typeof user.id
      });
    }
    
    return result;
  };

  const getOtherUser = (msg: ChatMessage) => {
    return isMyMessage(msg) ? msg.recipient : msg.sender;
  };

  // Get current conversation info
  const currentConversation = conversations.find((conv: Conversation) => conv.business.id === businessId);
  const otherUser = typedMessages.length > 0 ? getOtherUser(typedMessages[0]) : null;
  const displayName = user?.role === 'business_owner' || user?.role === 'employee'
    ? (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : (currentConversation?.customer ? `${currentConversation.customer.firstName} ${currentConversation.customer.lastName}` : (t('customer') || 'Customer')))
    : (business?.name || t('business') || 'Business');
  const displaySubtitle = user?.role === 'business_owner' || user?.role === 'employee'
    ? (business?.name || t('business') || 'Business')
    : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : (t('chat') || 'Chat'));

  // Group messages by date
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

  // Auto-select conversation when businessId is provided in URL
  useEffect(() => {
    if (businessId && conversations.length > 0) {
      const conversation = conversations.find((conv: Conversation) => conv.business.id === businessId);
      if (conversation && (!selectedConversation || (selectedConversation && 'business' in selectedConversation && selectedConversation.business && selectedConversation.business.id !== businessId))) {
        setSelectedConversation(conversation);
        setActiveTab('messages');
      }
    } else if (businessId && !selectedConversation) {
      // If businessId exists but no conversation found, we can still allow messaging
      // The conversation will be created when the first message is sent
      // For now, we'll create a temporary conversation object
      if (business) {
        const tempConversation: Conversation = {
          business: {
            id: business.id,
            name: business.name,
          },
          lastMessage: {
            content: '',
            createdAt: new Date().toISOString(),
            sender: {
              id: user?.id || '',
              firstName: user?.firstName || '',
              lastName: user?.lastName || '',
            },
          },
          unreadCount: 0,
        };
        setSelectedConversation(tempConversation);
        setActiveTab('messages');
      }
    }
  }, [businessId, conversations, selectedConversation, business, user]);

  // Get conversations for current tab
  const getCurrentTabConversations = () => {
    if (activeTab === 'messages') {
      return filteredConversations;
    } else if (activeTab === 'invitations') {
      return (searchQuery ? filteredSystemMessages : teamInvitations).filter((msg: SystemMessage) => msg.type === 'team_invitation');
    } else if (activeTab === 'offers') {
      return (searchQuery ? filteredSystemMessages : promotionalOffers).filter((msg: SystemMessage) => msg.type === 'promotional_offer');
    } else if (activeTab === 'archived') {
      return searchQuery ? filteredSystemMessages : archivedMessages;
    }
    return [];
  };

  // Get conversation display info
  const getConversationDisplay = (conv: Conversation | SystemMessage) => {
    if ('business' in conv && 'lastMessage' in conv) {
      // It's a Conversation
      const convTyped = conv as Conversation;
      const name = user?.role === 'business_owner' || user?.role === 'employee'
        ? (convTyped.customer ? `${convTyped.customer.firstName} ${convTyped.customer.lastName}` : t('customer') || 'Customer')
        : convTyped.business.name;
      const avatar = user?.role === 'business_owner' || user?.role === 'employee'
        ? (convTyped.customer ? `${convTyped.customer.firstName[0]}${convTyped.customer.lastName[0]}` : 'C')
        : convTyped.business.name.substring(0, 2).toUpperCase();
      return { name, avatar, lastMessage: convTyped.lastMessage.content, time: formatDistanceToNow(new Date(convTyped.lastMessage.createdAt), { addSuffix: true }), unread: convTyped.unreadCount };
    } else {
      // It's a SystemMessage
      const msgTyped = conv as SystemMessage;
      const name = msgTyped.business?.name || msgTyped.subject;
      const avatar = msgTyped.type === 'team_invitation' ? 'TI' : 'PO';
      return { name, avatar, lastMessage: msgTyped.content, time: formatDistanceToNow(new Date(msgTyped.createdAt), { addSuffix: true }), unread: msgTyped.status === 'unread' ? 1 : 0, type: msgTyped.type, status: msgTyped.status };
    }
  };

  const tabs = [
    { id: 'messages', label: t('messages') || 'Messages', icon: MessageCircle, count: conversations.length },
    { id: 'invitations', label: t('invitations') || 'Invitations', icon: Mail, count: teamInvitations.length },
    { id: 'offers', label: t('offers') || 'Offers', icon: Gift, count: offers.length },
    { id: 'archived', label: t('archived') || 'Archived', icon: Archive, count: archivedMessages.length },
  ];

  const currentConversations = getCurrentTabConversations();

  // Debug logging
  React.useEffect(() => {
    console.log('[Chat] Active tab:', activeTab);
    console.log('[Chat] Current conversations count:', currentConversations.length);
    console.log('[Chat] Team invitations:', teamInvitations.length);
    console.log('[Chat] Promotional offers:', promotionalOffers.length);
    console.log('[Chat] Archived messages:', archivedMessages.length);
    console.log('[Chat] Regular conversations:', conversations.length);
  }, [activeTab, currentConversations, teamInvitations, promotionalOffers, archivedMessages, conversations]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">{t('messages') || 'Messages'}</h1>
            {activeTab !== 'messages' && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                {activeTab === 'invitations' && 'Team Invitations'}
                {activeTab === 'offers' && 'Special Offers'}
                {activeTab === 'archived' && 'Archived'}
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchConversations') || 'Search conversations'}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  console.log('[Chat] Tab clicked:', tab.id);
                  setActiveTab(tab.id as any);
                  setSelectedConversation(null);
                  // Navigate away from specific conversation when switching tabs
                  if (tab.id !== 'messages') {
                    navigate('/chat');
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading || systemMessagesLoading || (activeTab === 'offers' && offersLoading) ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent"></div>
            </div>
          ) : currentConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
              {activeTab === 'messages' && <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />}
              {activeTab === 'invitations' && <Mail className="h-12 w-12 text-gray-300 mb-4" />}
              {activeTab === 'offers' && <Gift className="h-12 w-12 text-gray-300 mb-4" />}
              {activeTab === 'archived' && <Archive className="h-12 w-12 text-gray-300 mb-4" />}

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? (t('noResults') || 'No results') : (
                  activeTab === 'messages' ? (t('noConversations') || 'No conversations yet') :
                  activeTab === 'invitations' ? 'No team invitations' :
                  activeTab === 'offers' ? 'No offers available' :
                  'No archived messages'
                )}
              </h3>

              {!searchQuery && (
                <p className="text-sm text-gray-500 max-w-sm">
                  {activeTab === 'messages' && 'Start a conversation with a business to see it here'}
                  {activeTab === 'invitations' && 'Team invitations from businesses will appear here'}
                  {activeTab === 'offers' && 'Special offers from businesses you\'ve booked with will appear here'}
                  {activeTab === 'archived' && 'Archived messages will appear here'}
                </p>
              )}
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
                    // Only mark as read for system messages that are NOT offers (offers don't use the messages API)
                    if (isSystemMessage && (conv as SystemMessage).status === 'unread' && (conv as SystemMessage).type !== 'promotional_offer') {
                      handleMarkAsRead((conv as SystemMessage).id);
                    }
                    if ('business' in conv && 'lastMessage' in conv) {
                      navigate(`/chat/${(conv as Conversation).business.id}`);
                    }
                  }}
                  className={`flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {display.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{display.name}</h3>
                      <span className="text-xs text-gray-500">{display.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">{display.lastMessage}</p>
                      {display.unread > 0 && (
                        <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                          {display.unread}
                        </span>
                      )}
                    </div>
                    {isSystemMessage && (conv as SystemMessage).type === 'team_invitation' && !isAlreadyMember(conv as SystemMessage) && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptInvite(conv as SystemMessage);
                          }}
                          disabled={acceptInviteMutation.isLoading}
                          className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 disabled:opacity-50"
                        >
                          {acceptInviteMutation.isLoading ? (t('accepting') || 'Accepting...') : (t('accept') || 'Accept')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(conv.id);
                          }}
                          className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                        >
                          {t('decline') || 'Decline'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {((selectedConversation && 'business' in selectedConversation && 'lastMessage' in selectedConversation) || businessId) ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden"
                  onClick={() => {
                    setSelectedConversation(null);
                    navigate('/chat-list');
                  }}
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{displayName}</h2>
                  <p className="text-sm text-gray-500">{displaySubtitle}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 bg-gray-50 w-full"
            >
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent"></div>
                </div>
              ) : Object.keys(messageGroups).length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t('noMessages') || 'No messages yet'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.entries(messageGroups).map(([date, msgs]) => (
                    <React.Fragment key={date}>
                      <div className="text-center my-4">
                        <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy') === format(new Date(), 'EEEE, MMMM d, yyyy')
                            ? t('today') || 'Today'
                            : format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>
                      {msgs.map((msg) => {
                        const isMyMsg = isMyMessage(msg);
                        const otherUser = isMyMsg ? msg.recipient : msg.sender;
                        const otherUserInitials = `${otherUser.firstName[0]}${otherUser.lastName[0]}`;
                        const myInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'ME';
                        
                        // Debug log for first message
                        if (msgs.indexOf(msg) === 0) {
                          console.log('[Message Render] First message debug:', {
                            isMyMsg,
                            senderId: msg.sender.id,
                            recipientId: msg.recipient.id,
                            currentUserId: user?.id,
                            senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
                            recipientName: `${msg.recipient.firstName} ${msg.recipient.lastName}`,
                            currentUserName: `${user?.firstName} ${user?.lastName}`,
                          });
                        }
                        
                        // RECEIVED MESSAGE (LEFT SIDE)
                        if (!isMyMsg) {
                          return (
                            <div
                              key={msg.id}
                              className="flex items-end gap-2 mb-3 w-full"
                            >
                              {/* Avatar on left */}
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 bg-gray-400">
                                {otherUserInitials}
                              </div>
                              
                              {/* Message bubble on left */}
                              <div className="flex flex-col items-start max-w-[70%]">
                                <span className="text-xs text-gray-500 mb-1 px-1">
                                  {otherUser.firstName} {otherUser.lastName}
                                </span>
                                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-none">
                                  <p className="break-words whitespace-pre-wrap text-sm">{msg.content}</p>
                                  <span className="text-xs mt-1 block text-gray-600">
                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Spacer to push to left */}
                              <div className="flex-1"></div>
                            </div>
                          );
                        }
                        
                        // SENT MESSAGE (RIGHT SIDE)
                        return (
                          <div
                            key={msg.id}
                            className="flex items-end gap-2 mb-3 w-full"
                          >
                            {/* Spacer to push to right */}
                            <div className="flex-1"></div>
                            
                            {/* Message bubble on right */}
                            <div className="flex flex-col items-end max-w-[70%]">
                              <div className="bg-orange-500 text-white px-4 py-2 rounded-2xl rounded-br-none">
                                <p className="break-words whitespace-pre-wrap text-sm">{msg.content}</p>
                                <span className="text-xs mt-1 block text-orange-100">
                                  {format(new Date(msg.createdAt), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Avatar on right */}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 bg-orange-500">
                              {myInitials}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('typeMessage') || 'Type a message...'}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : selectedConversation && 'type' in selectedConversation ? (
          <>
            {/* System Message Detail View */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                  selectedConversation.type === 'team_invitation' ? 'bg-blue-500' : 'bg-orange-500'
                }`}>
                  {selectedConversation.type === 'team_invitation' ? <Users className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedConversation.subject}</h2>
                  <p className="text-sm text-gray-500">{selectedConversation.business?.name || selectedConversation.type}</p>
                </div>
              </div>
              <button
                onClick={() => handleArchive(selectedConversation.id)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Archive className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-orange-50 via-white to-orange-50">
              {selectedConversation.type === 'promotional_offer' ? (
                <div className="max-w-3xl mx-auto p-6">
                  {/* Offer Hero Card */}
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl overflow-hidden mb-6">
                    <div className="p-8 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Gift className="h-8 w-8" />
                          </div>
                          <div>
                            <h1 className="text-3xl font-bold mb-1">{selectedConversation.subject}</h1>
                            {selectedConversation.business?.name && (
                              <p className="text-orange-100 text-lg">{selectedConversation.business.name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {selectedConversation.metadata?.discount && (
                        <div className="mt-6 inline-block">
                          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                            <p className="text-sm text-orange-100 mb-1">Special Discount</p>
                            <p className="text-4xl font-bold">
                              {typeof selectedConversation.metadata.discount === 'number' 
                                ? `${selectedConversation.metadata.discount}% OFF`
                                : selectedConversation.metadata.discount}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Offer Details Card */}
                  <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Offer Details</h2>
                    <div className="prose prose-lg max-w-none">
                      <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap mb-6">
                        {selectedConversation.content}
                      </p>
                    </div>

                    {selectedConversation.metadata && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                        {selectedConversation.metadata.offerCode && (
                          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                            <p className="text-sm font-medium text-gray-600 mb-2">Promo Code</p>
                            <div className="flex items-center gap-3">
                              <code className="text-2xl font-bold text-orange-700 font-mono bg-white px-4 py-2 rounded-lg border-2 border-orange-300">
                                {selectedConversation.metadata.offerCode}
                              </code>
                              <button
                                onClick={() => {
                                  if (selectedConversation.metadata?.offerCode) {
                                    navigator.clipboard.writeText(selectedConversation.metadata.offerCode);
                                    toast.success('Promo code copied!');
                                  }
                                }}
                                className="p-2 hover:bg-orange-200 rounded-lg transition-colors"
                                title="Copy code"
                              >
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {selectedConversation.metadata.validUntil && (
                          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <p className="text-sm font-medium text-gray-600 mb-2">Valid Until</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {new Date(selectedConversation.metadata.validUntil).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(selectedConversation.metadata.validUntil), { addSuffix: true })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedConversation.business?.id && (
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <button
                          onClick={() => {
                            if (selectedConversation.business?.id) {
                              navigate(`/businesses/${selectedConversation.business.id}`);
                            }
                          }}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
                        >
                          <Building2 className="h-5 w-5" />
                          View Business & Book Now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  {selectedConversation.business?.name && (
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">From</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedConversation.business.name}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Team Invitation View */
                <div className="max-w-2xl mx-auto p-6">
                  <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">{selectedConversation.subject}</h3>
                    <p className="text-gray-700 mb-6 text-lg leading-relaxed whitespace-pre-wrap">{selectedConversation.content}</p>
                    {selectedConversation.type === 'team_invitation' && !isAlreadyMember(selectedConversation) && (
                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={() => handleAcceptInvite(selectedConversation)}
                          disabled={acceptInviteMutation.isLoading}
                          className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 font-semibold transition-all shadow-lg hover:shadow-xl"
                        >
                          {acceptInviteMutation.isLoading ? (t('accepting') || 'Accepting...') : (t('accept') || 'Accept Invitation')}
                        </button>
                        <button
                          onClick={() => handleArchive(selectedConversation.id)}
                          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
                        >
                          {t('decline') || 'Decline'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center px-4">
              {activeTab === 'messages' && (
                <>
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">{t('selectConversation') || 'Select a conversation to start messaging'}</p>
                </>
              )}
              {activeTab === 'invitations' && (
                <>
                  <Mail className="h-16 w-16 mx-auto mb-4 text-blue-300" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">Team Invitations</p>
                  <p className="text-sm text-gray-600 max-w-md">
                    {teamInvitations.length > 0
                      ? 'Select an invitation from the left to view details and accept or decline'
                      : 'No team invitations yet. When a business invites you to join their team, it will appear here.'}
                  </p>
                </>
              )}
              {activeTab === 'offers' && (
                <>
                  <Gift className="h-16 w-16 mx-auto mb-4 text-orange-300" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">Special Offers</p>
                  <p className="text-sm text-gray-600 max-w-md">
                    {promotionalOffers.length > 0
                      ? 'Select an offer from the left to view details and discount codes'
                      : 'No offers available yet. Book with a business to receive exclusive deals and promotions!'}
                  </p>
                </>
              )}
              {activeTab === 'archived' && (
                <>
                  <Archive className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">Archived Messages</p>
                  <p className="text-sm text-gray-600 max-w-md">
                    {archivedMessages.length > 0
                      ? 'Select an archived message from the left to view it'
                      : 'No archived messages. Archive messages you want to hide from your main inbox.'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
