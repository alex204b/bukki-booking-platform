import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { businessService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Building2, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { GeometricSymbol } from '../components/GeometricSymbols';
import { format } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';

export const EmployeeInvitations: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: invites, isLoading } = useQuery(
    'my-invites',
    () => businessService.myInvites(),
    {
      select: (response) => response.data,
      enabled: !!user,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const acceptMutation = useMutation(
    ({ businessId, email }: { businessId: string; email: string }) =>
      businessService.acceptInvite(businessId, email),
    {
      onSuccess: () => {
        toast.success(t('invitationAcceptedYouAreNowEmployee'));
        queryClient.invalidateQueries('my-invites');
        // Refetch user data to update role
        window.location.reload();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || t('failedToAcceptInvitationEmployee'));
      },
    }
  );

  const handleAccept = (businessId: string, email: string) => {
    if (window.confirm(t('areYouSureAcceptInvitation'))) {
      acceptMutation.mutate({ businessId, email });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const pendingInvites = invites?.filter((invite: any) => invite.status === 'invited') || [];

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div className="absolute top-4 right-4 opacity-10">
            <GeometricSymbol variant="infinity" size={100} strokeWidth={6} color="#f97316" />
          </div>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('employeeInvitations')}
            </h1>
            <p className="text-gray-600">
              {t('viewAndAcceptInvitations')}
            </p>
          </div>

          {pendingInvites.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('noPendingInvitations')}
              </h3>
              <p className="text-gray-600">
                {t('noPendingInvitationsAtMoment')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingInvites.map((invite: any) => (
                <div
                  key={invite.id}
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mr-4">
                          <Building2 className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {invite.business?.name || t('unknownBusiness')}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {invite.business?.category?.replace('_', ' ') || t('businesses')}
                          </p>
                        </div>
                      </div>

                      {invite.business?.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {invite.business.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          <span>{invite.email}</span>
                        </div>
                        {invite.createdAt && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{t('invited')} {format(new Date(invite.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      {invite.business?.address && (
                        <p className="text-sm text-gray-500 mt-2">
                          📍 {invite.business.address}, {invite.business.city}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleAccept(invite.business?.id, invite.email)}
                        disabled={acceptMutation.isLoading}
                        className="btn btn-primary btn-sm flex items-center"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {t('acceptInvitation')}
                      </button>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {t('pending')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  {t('aboutEmployeeInvitations')}
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    {t('whenYouAcceptInvitation')}
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{t('viewBookingsForBusiness')}</li>
                    <li>{t('seeCustomerInformation')}</li>
                    <li>{t('accessLimitedBusinessInfo')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

