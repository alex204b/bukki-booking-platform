import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Bell, X, CheckCircle, AlertCircle, Calendar, MessageCircle, Star } from 'lucide-react';
import { api } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { EmptyNotifications } from './EmptyState';
import { ListSkeleton } from './LoadingSkeleton';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Fetch notifications (using messages as notifications for now)
  const { data: notifications, isLoading } = useQuery(
    ['notifications', filter],
    async () => {
      const response = await api.get('/messages');
      let messages = response.data || [];
      
      // Filter based on type
      if (filter === 'unread') {
        messages = messages.filter((m: any) => !m.readAt);
      } else if (filter === 'read') {
        messages = messages.filter((m: any) => m.readAt);
      }
      
      return messages.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    {
      refetchInterval: 15000, // Refresh every 15 seconds
    }
  );

  const markAsReadMutation = useMutation(
    async (messageId: string) => {
      // If it's a chat message, use chat endpoint
      if (notifications?.find((n: any) => n.id === messageId)?.type === 'CHAT') {
        const message = notifications.find((n: any) => n.id === messageId);
        if (message?.businessId) {
          await api.patch(`/messages/chat/${message.businessId}/read`);
        }
      }
      // For other message types, mark as read via messages endpoint
      await api.patch(`/messages/${messageId}/read`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
      },
    }
  );

  const markAllAsReadMutation = useMutation(
    async () => {
      const unread = notifications?.filter((n: any) => !n.readAt) || [];
      await Promise.all(unread.map((n: any) => markAsReadMutation.mutateAsync(n.id)));
    },
    {
      onSuccess: () => {
        toast.success('All notifications marked as read');
        queryClient.invalidateQueries(['notifications']);
      },
    }
  );

  const getNotificationIcon = (type: string) => {
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
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationTitle = (notification: any) => {
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
      default:
        return notification.subject || 'Notification';
    }
  };

  const unreadCount = notifications?.filter((n: any) => !n.readAt).length || 0;

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
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-sm text-primary-600 hover:text-primary-700"
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
        <div className="flex gap-2 p-4 border-b bg-gray-50">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'read'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
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
            <div className="divide-y">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.readAt ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    if (!notification.readAt) {
                      markAsReadMutation.mutate(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {getNotificationTitle(notification)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.content || notification.body || notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.readAt && (
                          <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-2" />
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
    </div>
  );
};

