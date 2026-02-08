import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCircle, AlertCircle, Calendar, MessageCircle, Star, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { EmptyNotifications } from './EmptyState';
import { ListSkeleton } from './LoadingSkeleton';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { RequestResponseModal } from './RequestResponseModal';

interface NotificationCenterProps {
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Fetch notifications (using messages as notifications for now)
  const { data: notifications, isLoading } = useQuery(
    ['notifications', filter],
    async () => {
      const response = await api.get('/messages', { params: { limit: 100, offset: 0 } });
      // Handle paginated response
      let messages = response.data?.data || response.data || [];
      
      // Filter based on status field (backend uses 'status' not 'readAt')
      if (filter === 'unread') {
        messages = messages.filter((m: any) => m.status === 'unread');
      } else if (filter === 'read') {
        messages = messages.filter((m: any) => m.status === 'read' || m.status === 'archived');
      }
      
      return messages.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds for faster updates
      staleTime: 0, // Always consider data stale to ensure fresh updates
    }
  );

  const markAsReadMutation = useMutation(
    async (messageId: string) => {
      // If it's a chat message, use chat endpoint
      const message = notifications?.find((n: any) => n.id === messageId);
      // MessageType.CHAT is 'chat' (lowercase) in the backend
      if (message && (message.type === 'chat' || message.type === 'CHAT')) {
        const businessId = message.businessId || message.business?.id;
        if (businessId) {
          await api.patch(`/messages/chat/${businessId}/read`);
        }
      }
      // For other message types, mark as read via messages endpoint
      await api.patch(`/messages/${messageId}/read`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
        queryClient.invalidateQueries(['unread-notifications-count']); // Also update the count
        // Force immediate refetch
        queryClient.refetchQueries(['unread-notifications-count']);
      },
    }
  );

  const markAllAsReadMutation = useMutation(
    async () => {
      const unread = notifications?.filter((n: any) => n.status === 'unread') || [];
      await Promise.all(unread.map((n: any) => markAsReadMutation.mutateAsync(n.id)));
    },
    {
      onSuccess: () => {
        toast.success('All notifications marked as read');
        queryClient.invalidateQueries(['notifications']);
        queryClient.invalidateQueries(['unread-notifications-count']); // Also update the count
        // Force immediate refetch
        queryClient.refetchQueries(['unread-notifications-count']);
      },
    }
  );

  const getNotificationIcon = (type: string, metadata?: any) => {
    // Check metadata for unsuspension request
    if (metadata?.type === 'UNSUSPENSION_REQUEST') {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }

    switch (type) {
      case 'TEAM_INVITATION':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'BOOKING_CONFIRMED':
        return <Calendar className="h-5 w-5 text-green-500" />;
      case 'BOOKING_CANCELLED':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'CHAT':
        return <MessageCircle className="h-5 w-5 text-purple-500" />;
      case 'REVIEW':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'system_notification':
      case 'SYSTEM_NOTIFICATION':
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationTitle = (notification: any) => {
    // Check metadata for unsuspension request
    if (notification.metadata?.type === 'UNSUSPENSION_REQUEST') {
      return 'Unsuspension Request';
    }

    switch (notification.type) {
      case 'TEAM_INVITATION':
        return 'Team Invitation';
      case 'BOOKING_CONFIRMED':
        return 'Booking Confirmed';
      case 'BOOKING_CANCELLED':
        return 'Booking Cancelled';
      case 'CHAT':
        return 'New Message';
      case 'REVIEW':
        return 'New Review';
      case 'system_notification':
      case 'SYSTEM_NOTIFICATION':
        return notification.subject || 'System Notification';
      default:
        return notification.subject || 'Notification';
    }
  };

  const unreadCount = notifications?.filter((n: any) => n.status === 'unread').length || 0;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#330007' }}>
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-[#330007]" style={{ color: '#330007' }} />
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-white text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#330007' }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-sm hover:opacity-80 transition-opacity"
                style={{ color: '#330007' }}
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-4 bg-gray-50" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#330007' }}>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            style={filter === 'all' ? { backgroundColor: '#330007' } : undefined}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            style={filter === 'unread' ? { backgroundColor: '#330007' } : undefined}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'read'
                ? 'text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            style={filter === 'read' ? { backgroundColor: '#330007' } : undefined}
          >
            Read
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6">
              <ListSkeleton count={5} />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-6">
              <EmptyNotifications />
            </div>
          ) : (
            <div>
              {notifications.map((notification: any, index: number) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    notification.status === 'unread' ? 'bg-[#FFF5F5]' : ''
                  } ${notification.metadata?.type === 'UNSUSPENSION_REQUEST' ? 'border-l-4' : ''}`}
                  style={{
                    ...(notification.metadata?.type === 'UNSUSPENSION_REQUEST' ? { borderLeftColor: '#330007', borderLeftWidth: '4px' } : {}),
                    ...(index < notifications.length - 1 ? { 
                      borderBottomWidth: '1px',
                      borderBottomStyle: 'solid',
                      borderBottomColor: '#330007' 
                    } : {})
                  }}
                  onClick={async () => {
                    // Get business ID from notification (could be businessId or business.id)
                    const businessId = notification.businessId || notification.business?.id;
                    
                    // If it's a chat message, navigate to the conversation (Messages/Chat area)
                    if ((notification.type === 'chat' || notification.type === 'CHAT') && businessId) {
                      if (notification.status === 'unread') {
                        markAsReadMutation.mutate(notification.id);
                      }
                      onClose();
                      navigate(`/chat/${businessId}`);
                      return;
                    }
                    
                    // If it's a team invitation, navigate to messages area (chat-list) with invitations tab
                    if (notification.type === 'team_invitation' || notification.type === 'TEAM_INVITATION') {
                      if (notification.status === 'unread') {
                        markAsReadMutation.mutate(notification.id);
                      }
                      onClose();
                      navigate('/chat-list?tab=invitations');
                      return;
                    }
                    
                    // If it's a promotional offer, navigate to messages area with offers tab
                    if (notification.type === 'promotional_offer' || notification.type === 'PROMOTIONAL_OFFER') {
                      if (notification.status === 'unread') {
                        markAsReadMutation.mutate(notification.id);
                      }
                      onClose();
                      navigate('/chat-list?tab=offers');
                      return;
                    }
                    
                    if (notification.status === 'unread') {
                      markAsReadMutation.mutate(notification.id);
                    }
                    
                    // If it's a request notification, open the request modal
                    if (notification.metadata?.type === 'UNSUSPENSION_REQUEST' || notification.metadata?.type === 'SUSPENSION_REQUEST') {
                      // Parse metadata if it's a string (JSONB from database)
                      let metadata = notification.metadata;
                      if (typeof metadata === 'string') {
                        try {
                          metadata = JSON.parse(metadata);
                        } catch (e) {
                          console.error('Failed to parse metadata:', e);
                        }
                      }
                      
                      // Extract request ID from metadata
                      const requestId = metadata?.requestId || metadata?.id;
                      
                      console.log('Notification clicked:', {
                        notificationId: notification.id,
                        metadataType: metadata?.type,
                        requestId,
                        fullMetadata: metadata,
                      });
                      
                      if (requestId) {
                        setSelectedRequestId(requestId);
                      } else {
                        // Try to find request by business ID
                        const businessId = metadata?.businessId;
                        if (businessId) {
                          try {
                            // If user is super admin, try fetching pending requests
                            if (user?.role === 'super_admin') {
                              try {
                                const res = await api.get('/requests/pending');
                                const requests = Array.isArray(res.data) ? res.data : res.data?.data || [];
                                const matchingRequest = requests.find((r: any) => 
                                  r.business?.id === businessId && 
                                  (r.requestType === 'unsuspension' || r.requestType === 'suspension') &&
                                  r.status === 'pending'
                                );
                                if (matchingRequest) {
                                  setSelectedRequestId(matchingRequest.id);
                                  return;
                                }
                              } catch (error: any) {
                                console.warn('Failed to fetch pending requests (may not be super admin):', error);
                              }
                            }
                            
                            // Fallback: Try fetching business requests (works for business owners too)
                            try {
                              const res = await api.get(`/requests/business/${businessId}`);
                              console.log('Business requests response:', res.data);
                              const requests = Array.isArray(res.data) ? res.data : res.data?.data || [];
                              // Find the most recent pending request
                              const matchingRequest = requests
                                .filter((r: any) => 
                                  (r.requestType === 'unsuspension' || r.requestType === 'suspension') &&
                                  r.status === 'pending'
                                )
                                .sort((a: any, b: any) => 
                                  new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
                                )[0];
                              
                              if (matchingRequest) {
                                setSelectedRequestId(matchingRequest.id);
                              } else {
                                toast.error('Request not found. It may have already been processed.');
                              }
                            } catch (error: any) {
                              console.error('Failed to fetch business requests:', error);
                              toast.error(error?.response?.data?.message || 'Failed to load request. Please check the notification metadata.');
                            }
                          } catch (error: any) {
                            console.error('Error finding request:', error);
                            toast.error('Failed to load request');
                          }
                        } else {
                          console.error('No requestId or businessId in metadata:', metadata);
                          toast.error('Request information not available in notification');
                        }
                      }
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type, notification.metadata)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {getNotificationTitle(notification)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-4 whitespace-pre-line">
                            {notification.content || notification.body || notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {notification.status === 'unread' && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: '#330007' }} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Request Response Modal */}
      {selectedRequestId && (
        <RequestResponseModal
          requestId={selectedRequestId}
          onClose={() => {
            setSelectedRequestId(null);
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['requests']);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['requests']);
          }}
        />
      )}
    </div>
  );
};

