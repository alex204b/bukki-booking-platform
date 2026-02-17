import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService, businessService, favoritesService, bookingService, api } from '../services/api';
import {
  User,
  Mail,
  Save,
  Edit3,
  Heart,
  Star,
  ExternalLink,
  ChevronDown,
  Settings,
  Check,
  Calendar,
  Eye,
  LogOut,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TrustScore } from '../components/TrustScore';
import { TrustScoreBreakdown } from '../components/TrustScoreBreakdown';
import { NotificationSettings } from '../components/NotificationSettings';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency, CURRENCY_SYMBOLS } from '../contexts/CurrencyContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, Link } from 'react-router-dom';

type AccordionKey = 'personal' | 'settings' | 'activity' | 'favorites' | 'invites' | 'trust' | null;

/** Use fallback when translation is missing (i18n often returns the key, e.g. "accountSettings"). */
function sectionLabel(t: (k: string) => string, key: string, fallback: string): string {
  const val = t(key);
  return val && val !== key ? val : fallback;
}

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openSection, setOpenSection] = useState<AccordionKey>(null);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    };
    if (currencyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [currencyDropdownOpen]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const { data: invites } = useQuery('my-invites', () => businessService.myInvites(), {
    select: (res) => res.data,
  });

  const { data: favorites, isLoading: favoritesLoading } = useQuery(
    'favorites',
    () => favoritesService.getAll(),
    { select: (res) => res.data, enabled: !!user }
  );

  const { data: bookings = [] } = useQuery(
    ['my-bookings', user?.id, user?.role],
    async () => {
      const res = await bookingService.getAll();
      let all: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      if (user?.role === 'business_owner' || user?.role === 'employee') {
        try {
          const biz = (await api.get('/businesses/my-business')).data;
          const work = biz?.id ? all.filter((b: any) => b.business?.id === biz.id || b.businessId === biz.id) : [];
          const personal = all.filter((b: any) => b.customer?.id === user?.id || b.customerId === user?.id);
          const seen = new Set<string>();
          return [...work, ...personal].filter((b: any) => {
            if (seen.has(b.id)) return false;
            seen.add(b.id);
            return true;
          });
        } catch {
          return all.filter((b: any) => b.customer?.id === user?.id || b.customerId === user?.id);
        }
      }
      return all.filter((b: any) => b.customer?.id === user?.id || b.customerId === user?.id);
    },
    { enabled: !!user }
  );

  const acceptInviteMutation = useMutation(
    (businessId: string) => businessService.acceptInvite(businessId, user?.email || ''),
    {
      onSuccess: () => {
        toast.success(t('invitationAcceptedYouAreNowEmployee'));
        queryClient.invalidateQueries('my-invites');
      },
      onError: (e: any) => {
        toast.error(e.response?.data?.message || t('failedToAcceptInvitation'));
      },
    }
  );

  const removeFavoriteMutation = useMutation(
    (businessId: string) => favoritesService.remove(businessId),
    {
      onSuccess: () => {
        toast.success(t('removedFromFavorites') || 'Removed from favorites');
        queryClient.invalidateQueries('favorites');
      },
      onError: () => {
        toast.error(t('failedToRemoveFavorite') || 'Failed to remove favorite');
      },
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userService.updateProfile(formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
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

  const toggle = (key: AccordionKey) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b: any) => b.status === 'completed').length;
  const upcomingBookings = bookings.filter((b: any) => ['pending', 'confirmed'].includes(b.status)).length;
  const favCount = Array.isArray(favorites) ? favorites.length : 0;
  const recentActivity = [...bookings]
    .sort((a: any, b: any) => new Date(b.appointmentDate || b.createdAt).getTime() - new Date(a.appointmentDate || a.createdAt).getTime())
    .slice(0, 8);

  const formatRole = (r: string) => {
    if (r === 'business_owner') return 'Business Owner';
    if (r === 'super_admin') return 'Admin';
    return (r || '').replace(/_/g, ' ');
  };

  return (
    <div className="profile-page bg-white">
      <div className="w-full mx-auto px-3 sm:px-4 md:px-6 pt-8 pb-24 lg:pb-4">
        {/* Profile Hero - single column, original sizing; only tighter spacing */}
        <div className="profile-hero-card bg-white rounded-[20px] p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-3 relative">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-5 relative z-10">
            <div className="profile-avatar-wrap shrink-0">
              <div
                className="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-[0_8px_30px_rgba(220,20,60,0.3)]"
                style={{ background: 'linear-gradient(135deg, #DC143C, #4A0E0E)' }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  (() => {
                    const f = user?.firstName?.[0]?.toUpperCase() || '';
                    const l = user?.lastName?.[0]?.toUpperCase() || '';
                    return (f + l) || '?';
                  })()
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">
                {user?.firstName} {user?.lastName}
              </h1>
              <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #FFF7ED, #FED7AA)',
                    color: '#F59E0B',
                  }}
                >
                  <User className="w-4 h-4" />
                  {formatRole(user?.role || '')}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-sm bg-[#F5F5F5] text-[#666]">
                  <Calendar className="w-4 h-4" />
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </span>
                {user?.trustScore !== undefined && (
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-sm font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
                      color: '#10B981',
                    }}
                  >
                    <Check className="w-4 h-4" />
                    <span className="font-bold" style={{ fontFamily: 'var(--profile-font)' }}>{user.trustScore}/100</span>
                    <span className="text-xs opacity-80">Trust Score</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 relative z-10">
            {[
              { label: 'Total Bookings', value: totalBookings },
              { label: 'Completed', value: completedBookings },
              { label: 'Upcoming', value: upcomingBookings },
              { label: 'Favorites', value: favCount },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="profile-stat-card bg-gradient-to-br from-[#F5F5F5] to-white p-3 sm:p-4 rounded-[15px] border border-[#E0E0E0] h-24 sm:h-39"
              >
                <div className="text-xs sm:text-sm text-[#666] uppercase tracking-wider font-semibold mb-1" style={{ fontFamily: 'var(--profile-font)' }}>
                  {label}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--profile-font)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible: Personal Information */}
        <div className="mt-5 mb-5">
          <button
            type="button"
            onClick={() => toggle('personal')}
            className={`profile-section-toggle w-full flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-0 cursor-pointer text-left ${openSection === 'personal' ? 'active' : ''}`}
          >
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-[#DC143C]" />
              <span className="text-lg sm:text-xl font-bold text-[#1A1A1A]">
                {sectionLabel(t, 'personalInformation', 'Personal Information')}
              </span>
            </div>
            <ChevronDown className="profile-chevron w-6 h-6 text-[#1A1A1A] transition-transform duration-300" />
          </button>
          <div className={`profile-section-content ${openSection === 'personal' ? 'active' : ''}`}>
            <div className="pt-3">
              <div className="bg-white rounded-[20px] p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-[#E8E8E8]">
                    <span className="text-sm text-[#666]">Edit your details</span>
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="profile-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Information
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="profile-btn-secondary inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="profile-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold disabled:opacity-50"
                        >
                          {loading ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 sm:gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1A1A1A]">First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] text-[#1A1A1A] bg-[#F5F5F5] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1A1A1A]">Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] text-[#1A1A1A] bg-[#F5F5F5] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1A1A1A]">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] text-[#1A1A1A] bg-[#F5F5F5] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1A1A1A]">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={!isEditing}
                          placeholder="Not provided"
                          className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] text-[#1A1A1A] bg-[#F5F5F5] placeholder:text-[#666] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-[#1A1A1A]">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="Street address"
                        className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] text-[#1A1A1A] bg-[#F5F5F5] placeholder:text-[#666] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1A1A1A]">City</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] bg-[#F5F5F5] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1A1A1A]">State</label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] bg-[#F5F5F5] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1A1A1A]">ZIP Code</label>
                        <input
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] bg-[#F5F5F5] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1A1A1A]">Country</label>
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="profile-form-input w-full px-4 py-3.5 border-2 border-[#E0E0E0] rounded-[10px] bg-[#F5F5F5] disabled:bg-[#E8E8E8] disabled:text-[#666] disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible: Account Settings */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => toggle('settings')}
            className={`profile-section-toggle w-full flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-0 cursor-pointer text-left ${openSection === 'settings' ? 'active' : ''}`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-[#DC143C]" />
              <span className="text-lg sm:text-xl font-bold text-[#1A1A1A]">
                {sectionLabel(t, 'accountSettings', 'Account Settings')}
              </span>
            </div>
            <ChevronDown className="profile-chevron w-6 h-6 text-[#1A1A1A] transition-transform duration-300" />
          </button>
          <div className={`profile-section-content ${openSection === 'settings' ? 'active' : ''}`}>
            <div className="pt-3">
              <div className="bg-white rounded-[20px] p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#F5F5F5] rounded-xl hover:bg-[#E8E8E8] transition-colors">
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A] mb-1">Change Password</h4>
                    <p className="text-sm text-[#666]">Update your account password</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="profile-btn-secondary px-5 py-2.5 rounded-[10px] font-semibold"
                  >
                    Change
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#F5F5F5] rounded-xl">
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A] mb-1">{t('currencyPreference')}</h4>
                    <p className="text-sm text-[#666]">{t('currencyNote')}</p>
                  </div>
                  <div ref={currencyDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setCurrencyDropdownOpen((o) => !o)}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-[#E0E0E0] rounded-[10px] bg-white text-[#1A1A1A] font-medium hover:border-[#DC143C] focus:border-[#DC143C] focus:outline-none transition-colors"
                    >
                      <span className="text-base font-bold">{CURRENCY_SYMBOLS[currency]}</span>
                      <span>{currency}</span>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${currencyDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {currencyDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 min-w-[180px] py-1 rounded-[10px] bg-white shadow-lg border-2 border-[#E0E0E0] z-50">
                        {[
                          { code: 'USD' as const, label: t('currencyUSD') },
                          { code: 'GBP' as const, label: t('currencyGBP') },
                          { code: 'EUR' as const, label: t('currencyEUR') },
                          { code: 'RON' as const, label: t('currencyRON') },
                          { code: 'MDL' as const, label: t('currencyMDL') },
                        ].map(({ code }) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              setCurrency(code);
                              setCurrencyDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                              currency === code
                                ? 'bg-[#330007] text-white'
                                : 'text-gray-800 hover:bg-gray-100'
                            }`}
                          >
                            <span className="text-base font-bold w-8">{CURRENCY_SYMBOLS[code]}</span>
                            <span>{code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <NotificationSettings />
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible: Recent Activity */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => toggle('activity')}
            className={`profile-section-toggle w-full flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-0 cursor-pointer text-left ${openSection === 'activity' ? 'active' : ''}`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-[#DC143C]" />
              <span className="text-lg sm:text-xl font-bold text-[#1A1A1A]">
                {sectionLabel(t, 'recentActivity', 'Recent Activity')}
              </span>
              {recentActivity.length > 0 && (
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(220,20,60,0.1)', color: '#DC143C' }}
                >
                  {recentActivity.length} new
                </span>
              )}
            </div>
            <ChevronDown className="profile-chevron w-6 h-6 text-[#1A1A1A] transition-transform duration-300" />
          </button>
          <div className={`profile-section-content ${openSection === 'activity' ? 'active' : ''}`}>
            <div className="pt-3">
              <div className="bg-white rounded-[20px] p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((b: any) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-4 p-4 bg-[#F5F5F5] rounded-xl hover:bg-[#E8E8E8] transition-all cursor-pointer"
                        onClick={() => navigate('/my-bookings')}
                      >
                        <div
                          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(220,20,60,0.15)' }}
                        >
                          {b.status === 'completed' ? (
                            <Check className="w-5 h-5 text-[#DC143C]" />
                          ) : ['pending', 'confirmed'].includes(b.status) ? (
                            <Calendar className="w-5 h-5 text-[#DC143C]" />
                          ) : (
                            <Eye className="w-5 h-5 text-[#DC143C]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#1A1A1A]">
                            {b.service?.name || 'Booking'} {b.status === 'completed' ? 'Completed' : ''}
                          </div>
                          <div className="text-sm text-[#666] truncate">
                            {b.business?.name || '—'} •{' '}
                            {b.appointmentDate
                              ? new Date(b.appointmentDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </div>
                        </div>
                        {['completed', 'confirmed'].includes(b.status) && (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0"
                            style={{
                              background: '#D1FAE5',
                              color: '#10B981',
                            }}
                          >
                            {b.status === 'completed' ? 'Completed' : 'Confirmed'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-[#E0E0E0]" />
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">No activity yet</h3>
                    <p className="text-[#666] mb-4">Your bookings and activity will appear here</p>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="profile-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold"
                    >
                      Discover Businesses
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible: Favorite Businesses */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => toggle('favorites')}
            className={`profile-section-toggle w-full flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-0 cursor-pointer text-left ${openSection === 'favorites' ? 'active' : ''}`}
          >
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-[#DC143C]" />
              <span className="text-lg sm:text-xl font-bold text-[#1A1A1A]">
                {sectionLabel(t, 'favoriteBusinesses', 'Favorite Businesses')}
              </span>
            </div>
            <ChevronDown className="profile-chevron w-6 h-6 text-[#1A1A1A] transition-transform duration-300" />
          </button>
          <div className={`profile-section-content ${openSection === 'favorites' ? 'active' : ''}`}>
            <div className="pt-3">
              <div className="bg-white rounded-[20px] p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                {favoritesLoading ? (
                  <div className="flex justify-center py-10">
                    <span className="animate-spin rounded-full h-10 w-10 border-2 border-[#DC143C]/30 border-t-[#DC143C]" />
                  </div>
                ) : favorites && favorites.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {favorites.map((fav: any) => (
                      <div
                        key={fav.id}
                        className="flex items-start justify-between p-4 rounded-xl border border-[#E0E0E0] bg-[#F5F5F5] hover:bg-[#E8E8E8] transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-[#1A1A1A] mb-1 truncate">
                            {fav.business?.name}
                          </h4>
                          {fav.business?.category && (
                            <p className="text-sm text-[#666] capitalize truncate">
                              {(fav.business.category || '').replace(/_/g, ' ')}
                            </p>
                          )}
                          {fav.business?.rating != null && !isNaN(Number(fav.business.rating)) && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              <span className="text-sm font-medium">{Number(fav.business.rating).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavoriteMutation.mutate(fav.business.id);
                            }}
                            className="p-2 text-[#330007] hover:bg-[#330007]/10 rounded-lg transition-colors"
                            title={t('removeFromFavorites') || 'Remove'}
                          >
                            <Heart className="w-5 h-5 fill-current" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/businesses/${fav.business.id}`)}
                            className="p-2 text-[#330007] hover:bg-[#330007]/10 rounded-lg transition-colors"
                            title={t('viewDetails') || 'View'}
                          >
                            <ExternalLink className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Heart className="w-20 h-20 mx-auto mb-4 text-[#E0E0E0]" />
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
                      {t('noFavoriteBusinesses') || 'No Favorites Yet'}
                    </h3>
                    <p className="text-[#666] mb-6">
                      Start adding your favorite businesses to quickly book again
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="profile-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold"
                    >
                      {t('discoverBusinesses') || 'Discover Businesses'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info page link - visible on smaller screens only (since removed from bottom nav) */}
        <div className="mb-5 lg:hidden">
          <Link
            to="/info"
            className="w-full flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-0 cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Info className="w-6 h-6 text-[#DC143C]" />
              <span className="text-lg sm:text-xl font-bold text-[#1A1A1A]">
                {t('info') || 'Info'}
              </span>
            </div>
            <ChevronDown className="w-6 h-6 text-[#1A1A1A] -rotate-90" />
          </Link>
        </div>

        {/* Collapsible: Trust Score (customers only) */}
        {user?.role === 'customer' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => toggle('trust')}
              className={`profile-section-toggle w-full flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-0 cursor-pointer text-left ${openSection === 'trust' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-[#DC143C]" />
                <span className="text-lg sm:text-xl font-bold text-[#1A1A1A]">Trust Score</span>
              </div>
              <ChevronDown className="profile-chevron w-6 h-6 text-[#1A1A1A] transition-transform duration-300" />
            </button>
            <div className={`profile-section-content ${openSection === 'trust' ? 'active' : ''}`}>
              <div className="pt-3">
                <div className="bg-white rounded-[20px] p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                  <TrustScoreBreakdown />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout button - phones only (hidden on md and up) */}
        <div className="mt-5 mb-4 md:hidden">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] font-semibold text-[#E7001E] bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t('Log out') || 'Log out'}
          </button>
        </div>
      </div>

      {/* Logout confirmation - styled modal */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title={t('Log out') || 'Log out'}
        message={t('Confirm logout lessage') || "Are you sure you want to log out? You'll need to sign in again to access your account."}
        confirmText={t('Log out') || 'Log Out'}
        cancelText={t('Cancel') || 'Cancel'}
        variant="danger"
        onConfirm={() => {
          logout();
          setShowLogoutConfirm(false);
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};
