import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService, businessService } from '../services/api';
import { User, Mail, Phone, MapPin, Save, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { TrustScore } from '../components/TrustScore';
import { TrustScoreBreakdown } from '../components/TrustScoreBreakdown';
import { NotificationSettings } from '../components/NotificationSettings';
import { useI18n } from '../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    zipCode: user?.zipCode || '',
    country: user?.country || '',
  });

  // Note: Trust score functionality removed as it's not implemented in the new review system
  // const { data: trustScore } = useQuery(
  //   'trustScore',
  //   () => reviewService.getTrustScore(),
  //   {
  //     select: (response) => response.data.trustScore,
  //   }
  // );

  const queryClient = useQueryClient();
  const { data: invites } = useQuery(
    'my-invites',
    () => businessService.myInvites(),
    { select: (res) => res.data }
  );

  const acceptInviteMutation = useMutation(
    (businessId: string) => businessService.acceptInvite(businessId, user?.email || ''),
    {
      onSuccess: () => {
        toast.success(t('invitationAcceptedYouAreNowEmployee'));
        queryClient.invalidateQueries('my-invites');
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || t('failedToAcceptInvitation')); }
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await userService.updateProfile(formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      // Refresh user data
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zipCode: user?.zipCode || '',
      country: user?.country || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account information</p>
      </div>

      {/* Profile Header */}
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-primary-600" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-gray-600 capitalize">{user?.role}</p>
            <p className="text-sm text-gray-500">Member since {new Date(user?.createdAt || '').toLocaleDateString()}</p>
          </div>
          {user?.trustScore !== undefined && (
            <div className="ml-auto">
              <TrustScore score={user.trustScore} size="lg" />
            </div>
          )}
        </div>
      </div>

      {/* Trust Score Breakdown */}
      {user?.role === 'customer' && (
        <TrustScoreBreakdown />
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn btn-outline btn-sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-sm"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditing}
                className="input pl-10"
                placeholder="Street address"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={!isEditing}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              disabled={!isEditing}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code
            </label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              disabled={!isEditing}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={!isEditing}
              className="input"
            />
          </div>
        </div>
      </form>

      {/* Pending Invites */}
      {Array.isArray(invites) && invites.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pendingInvites') || 'Pending Business Invites'}</h3>
          <div className="space-y-3">
            {invites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium text-gray-900">{inv.business?.name || t('business')}</div>
                  <div className="text-sm text-gray-500">{inv.email}</div>
                </div>
                <button
                  onClick={() => acceptInviteMutation.mutate(inv.business.id)}
                  className="btn btn-primary btn-sm"
                >
                  {t('accept') || 'Accept'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Settings */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-sm text-gray-600">Update your account password</p>
            </div>
            <button className="btn btn-outline btn-sm">
              Change Password
            </button>
          </div>
          
        </div>
      </div>

      {/* Push Notification Settings */}
      <div className="card p-6">
        <NotificationSettings />
      </div>
    </div>
  );
};
