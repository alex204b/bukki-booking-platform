import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { businessService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import toast from 'react-hot-toast';

interface TeamManagementSectionProps {
  businessId: string;
}

export const TeamManagementSection: React.FC<TeamManagementSectionProps> = ({ businessId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const { data: members } = useQuery(
    ['business-members', businessId],
    () => businessService.listMembers(businessId),
    { select: (res) => res.data }
  );

  const inviteMutation = useMutation(
    ({ email, message }: { email: string; message?: string }) =>
      businessService.inviteMember(businessId, email, message),
    {
      onSuccess: () => {
        toast.success(t('inviteSent') || 'Invite sent');
        setInviteEmail('');
        setInviteMessage('');
        queryClient.invalidateQueries(['business-members', businessId]);
      },
      onError: (e: any) => {
        const msg = e?.response?.data?.message || '';
        if (msg.includes('No account found with this email')) {
          toast.error(t('inviteEmailNotRegistered') || msg);
        } else if (msg.includes('already a team member')) {
          toast.error(t('inviteAlreadyMember') || msg);
        } else if (msg.includes('invite was already sent')) {
          toast.error(t('inviteAlreadySent') || msg);
        } else if (msg.includes('Business owners cannot be invited')) {
          toast.error(t('inviteBusinessOwnerBlocked') || msg);
        } else if (msg.includes('already an employee at another business')) {
          toast.error(t('inviteEmployeeBlocked') || msg);
        } else {
          toast.error(msg || t('failedToInvite') || 'Failed to invite');
        }
      },
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
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t('inviteEmailPlaceholder') || 'staff@email.com'}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
          />
          <button
            type="button"
            onClick={() => inviteMutation.mutate({ email: inviteEmail.trim(), message: inviteMessage.trim() || undefined })}
            disabled={!inviteEmail.trim() || inviteMutation.isLoading}
            className="shrink-0 rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b91c1c] disabled:opacity-50"
          >
            {inviteMutation.isLoading ? '...' : (t('invite') || 'Invite')}
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {t('inviteMessageLabel') || 'Message (optional)'}
          </label>
          <textarea
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            placeholder={t('inviteMessagePlaceholder') || 'Add a personal message to include with the invite...'}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] resize-none"
          />
        </div>
      </div>

      <div className="divide-y rounded-lg border border-gray-200">
        {(members || []).map((m: any) => (
          <div key={m.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium text-gray-900">{m.email}</div>
              <div className="text-sm capitalize text-gray-500">{m.status}</div>
            </div>
            <button
              type="button"
              onClick={() => removeMutation.mutate(m.id)}
              className="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              {t('remove') || 'Remove'}
            </button>
          </div>
        ))}
        {(!members || members.length === 0) && (
          <div className="p-4 text-sm text-gray-500">{t('noMembers') || 'No team members yet.'}</div>
        )}
      </div>
    </div>
  );
};
