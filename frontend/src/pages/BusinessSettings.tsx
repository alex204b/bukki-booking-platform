import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { businessService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { GeometricSymbol } from '../components/GeometricSymbols';
import toast from 'react-hot-toast';

export const BusinessSettings: React.FC = () => {
  const { t } = useI18n();
  const [maxBookings, setMaxBookings] = useState(2);
  const [isEditing, setIsEditing] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery(
    'my-business',
    () => businessService.getMyBusiness(),
    {
      select: (response) => response.data,
      onSuccess: (data) => {
        setMaxBookings(data.maxBookingsPerUserPerDay);
        setAutoAccept(!!data.autoAcceptBookings);
      },
    }
  );

  const updateSettingsMutation = useMutation(
    (data: { maxBookingsPerUserPerDay: number; autoAcceptBookings: boolean }) =>
      businessService.update(business?.id.toString() || '', data),
    {
      onSuccess: () => {
        toast.success(t('settingsUpdated'));
        setIsEditing(false);
        queryClient.invalidateQueries('my-business');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || t('updateFailed'));
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ maxBookingsPerUserPerDay: maxBookings, autoAcceptBookings: autoAccept });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('noBusinessFound')}
          </h2>
          <p className="text-gray-600">{t('createBusinessFirst')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('businessSettings')}
          </h1>
          <p className="text-gray-600">{t('manageYourBusinessSettings')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 relative">
          <div className="absolute top-4 right-4 opacity-10">
            <GeometricSymbol variant="sun" size={40} strokeWidth={4} color="#f97316" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('bookingLimits')}
            </h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-outline btn-sm"
              >
                {t('edit')}
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setMaxBookings(business.maxBookingsPerUserPerDay);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={updateSettingsMutation.isLoading}
                  className="btn btn-primary btn-sm"
                >
                  {updateSettingsMutation.isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    t('save')
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('maxBookingsPerUserPerDay')}
              </label>
              <p className="text-sm text-gray-600 mb-4">
                {t('maxBookingsDescription')}
              </p>
              {isEditing ? (
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxBookings}
                  onChange={(e) => setMaxBookings(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              ) : (
                <div className="text-lg font-semibold text-gray-900">
                  {business.maxBookingsPerUserPerDay} {t('bookingsPerDay')}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={autoAccept}
                  onChange={(e) => setAutoAccept(e.target.checked)}
                  disabled={!isEditing}
                />
                {t('autoAcceptBookings') || 'Automatically accept booking requests'}
              </label>
              <p className="text-sm text-gray-600 mt-1">{t('autoAcceptHint') || 'If enabled, new booking requests are auto-confirmed.'}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    {t('important')}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>{t('bookingLimitInfo')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Management */}
        <TeamSection businessId={business.id} />

        {/* Contacts Management */}
        <ContactsSection businessId={business.id} />
      </div>
    </div>
  );
};

const TeamSection: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: members } = useQuery(
    ['business-members', businessId],
    () => businessService.listMembers(businessId),
    { select: (res) => res.data }
  );

  const inviteMutation = useMutation(
    (email: string) => businessService.inviteMember(businessId, email),
    {
      onSuccess: () => {
        toast.success(t('inviteSent') || 'Invite sent');
        setInviteEmail('');
        queryClient.invalidateQueries(['business-members', businessId]);
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to invite'); }
    }
  );

  const removeMutation = useMutation(
    (memberId: string) => businessService.removeMember(businessId, memberId),
    {
      onSuccess: () => {
        toast.success(t('memberRemoved') || 'Member removed');
        queryClient.invalidateQueries(['business-members', businessId]);
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to remove member'); }
    }
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('teamManagement') || 'Team Management'}</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder={t('inviteEmailPlaceholder') || 'staff@email.com'}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={() => inviteMutation.mutate(inviteEmail)}
          disabled={!inviteEmail || inviteMutation.isLoading}
          className="btn btn-primary"
        >
          {t('invite') || 'Invite'}
        </button>
      </div>

      <div className="divide-y border rounded">
        {(members || []).map((m: any) => (
          <div key={m.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium text-gray-900">{m.email}</div>
              <div className="text-sm text-gray-500 capitalize">{m.status}</div>
            </div>
            <button
              onClick={() => removeMutation.mutate(m.id)}
              className="btn btn-outline btn-sm text-red-600 border-red-600 hover:bg-red-50"
            >
              {t('remove') || 'Remove'}
            </button>
          </div>
        ))}
        {(!members || members.length === 0) && (
          <div className="p-4 text-gray-500">{t('noMembers') || 'No team members yet.'}</div>
        )}
      </div>
    </div>
  );
};

const ContactsSection: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');

  const { data: contacts } = useQuery(
    ['business-contacts', businessId],
    () => businessService.listContacts(businessId),
    { select: (res) => res.data }
  );

  const addMutation = useMutation(
    () => businessService.addContact(businessId, email, name),
    {
      onSuccess: () => {
        toast.success(t('contactAdded') || 'Contact added');
        setEmail('');
        setName('');
        queryClient.invalidateQueries(['business-contacts', businessId]);
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to add contact'); }
    }
  );

  const deleteMutation = useMutation(
    (contactId: string) => businessService.removeContact(businessId, contactId),
    {
      onSuccess: () => {
        toast.success(t('contactRemoved') || 'Contact removed');
        queryClient.invalidateQueries(['business-contacts', businessId]);
      }
    }
  );

  const sendCampaignMutation = useMutation(
    () => businessService.sendCampaign(businessId, subject, html),
    {
      onSuccess: (res: any) => {
        toast.success((t('campaignQueued') || 'Campaign sent') + ` (${res.data.sent || 0}/${res.data.queued})`);
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to send campaign'); }
    }
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('contacts') || 'Contacts'}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name') || 'Name'}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email') || 'Email'}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={() => addMutation.mutate()}
          disabled={!email}
          className="btn btn-primary"
        >
          {t('add') || 'Add'}
        </button>
      </div>

      <div className="divide-y border rounded mb-6">
        {(contacts || []).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium text-gray-900">{c.name || '-'}</div>
              <div className="text-sm text-gray-500">{c.email}</div>
            </div>
            <button onClick={() => deleteMutation.mutate(c.id)} className="btn btn-outline btn-sm text-red-600 border-red-600 hover:bg-red-50">
              {t('remove') || 'Remove'}
            </button>
          </div>
        ))}
        {(!contacts || contacts.length === 0) && (
          <div className="p-4 text-gray-500">{t('noContacts') || 'No contacts yet.'}</div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('sendCampaign') || 'Send Campaign'}</h3>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('subject') || 'Subject'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
        />
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={6}
          placeholder={t('campaignHtml') || 'HTML content...'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
        />
        <button
          onClick={() => sendCampaignMutation.mutate()}
          disabled={!subject || !html}
          className="btn btn-primary"
        >
          {t('send') || 'Send'}
        </button>
      </div>
    </div>
  );
};
