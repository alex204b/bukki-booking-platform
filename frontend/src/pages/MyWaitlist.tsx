import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { bookingService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { Clock, X, Building2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface WaitlistEntry {
  id: string;
  business: {
    id: string;
    name: string;
  };
  service?: {
    id: string;
    name: string;
  };
  preferredDate?: string;
  notes?: string;
  status: 'active' | 'notified' | 'booked' | 'cancelled';
  notifiedAt?: string;
  createdAt: string;
}

export const MyWaitlist: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: waitlist = [], isLoading } = useQuery(
    'my-waitlist',
    () => bookingService.getMyWaitlist(),
    {
      select: (response) => response.data || [],
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const leaveWaitlistMutation = useMutation(
    (id: string) => bookingService.leaveWaitlist(id),
    {
      onSuccess: () => {
        toast.success(t('leftWaitlist') || 'Left waitlist successfully');
        queryClient.invalidateQueries('my-waitlist');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || t('failedToLeaveWaitlist') || 'Failed to leave waitlist');
      },
    }
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'notified':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            {t('notified') || 'Notified'}
          </span>
        );
      case 'booked':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {t('booked') || 'Booked'}
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            {t('waiting') || 'Waiting'}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('myWaitlist') || 'My Waitlist'}</h1>
        <p className="text-gray-600 mt-2">
          {t('waitlistDescription') || 'Get notified when slots become available'}
        </p>
      </div>

      {waitlist.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('noWaitlistEntries') || 'You are not on any waitlist'}
          </h3>
          <p className="text-gray-500">
            {t('joinWaitlistFromBooking') || 'Join a waitlist from the booking page when slots are full'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {waitlist.map((entry: WaitlistEntry) => (
            <div key={entry.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {entry.business.name}
                      </h3>
                      {entry.service && (
                        <p className="text-sm text-gray-600">{entry.service.name}</p>
                      )}
                    </div>
                  </div>

                  {entry.preferredDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {t('preferredDate') || 'Preferred'}: {format(new Date(entry.preferredDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}

                  {entry.notes && (
                    <p className="text-sm text-gray-600 mb-2">{entry.notes}</p>
                  )}

                  {entry.notifiedAt && (
                    <p className="text-xs text-green-600 mb-2">
                      {t('notifiedAt') || 'Notified'}: {format(new Date(entry.notifiedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {getStatusBadge(entry.status)}
                    {entry.service && entry.status === 'notified' && (
                      <Link
                        to={`/book/${entry.service.id}`}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {t('bookNow') || 'Book Now'} →
                      </Link>
                    )}
                  </div>
                </div>

                {entry.status === 'active' && (
                  <button
                    onClick={() => leaveWaitlistMutation.mutate(entry.id)}
                    disabled={leaveWaitlistMutation.isLoading}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title={t('leaveWaitlist') || 'Leave Waitlist'}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

