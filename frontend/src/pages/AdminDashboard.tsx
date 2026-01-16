import React, { useState, useMemo } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Building2, Users, Calendar, DollarSign, CheckCircle, XCircle, Eye, EyeOff, Settings, TrendingUp, AlertTriangle, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userService, businessService, api } from '../services/api';
import toast from 'react-hot-toast';
import { SuspendBusinessModal } from '../components/SuspendBusinessModal';
import { UnsuspendBusinessModal } from '../components/UnsuspendBusinessModal';
import { RequestResponseModal } from '../components/RequestResponseModal';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface PlatformStats {
  totalUsers: number;
  totalBusinesses: number;
  activeBusinesses: number;
  totalBookings: number;
  totalRevenue: number;
  pendingApprovals: number;
}

export const AdminDashboard: React.FC = () => {
  const { t } = useI18n();
  const capitalizeWords = (s: string) => s.replace(/\b\w/g, (letter: string): string => letter.toUpperCase());
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showOwnerEmails, setShowOwnerEmails] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedBusinessForSuspension, setSelectedBusinessForSuspension] = useState<{ id: string; name: string } | null>(null);
  const [unsuspendModalOpen, setUnsuspendModalOpen] = useState(false);
  const [selectedBusinessForUnsuspension, setSelectedBusinessForUnsuspension] = useState<{ id: string; name: string } | null>(null);
  const { data: usersData } = useQuery(['admin-users'], () => userService.getAllUsers(), { select: (r) => r.data });
  const { data: businessesData } = useQuery(['admin-businesses', statusFilter], () => businessService.getAll(statusFilter === 'all' ? undefined : statusFilter), {
    select: (r) => {
      // Handle different response structures
      const data = r.data;
      // If data has a 'data' property (nested), use that
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data;
      }
      // If data is already an array, return it
      if (Array.isArray(data)) {
        return data;
      }
      // Otherwise return empty array
      return [];
    }
  });
  const users: User[] = useMemo(() => {
    if (!usersData) return [];
    if (Array.isArray(usersData)) return usersData;
    if (usersData && typeof usersData === 'object' && 'data' in usersData && Array.isArray((usersData as any).data)) {
      return (usersData as any).data;
    }
    return [];
  }, [usersData]);
  const businesses: any[] = useMemo(() => Array.isArray(businessesData) ? businessesData : [], [businessesData]);
  const stats: PlatformStats = useMemo(() => ({
    totalUsers: users.length,
    totalBusinesses: businesses.length,
    activeBusinesses: businesses.filter((b: any) => b.isActive || b.status === 'approved').length,
    totalBookings: 0,
    totalRevenue: 0,
    pendingApprovals: businesses.filter((b: any) => b.status === 'pending').length,
  }), [users, businesses]);
  const [activeTab, setActiveTab] = useState<'overview' | 'businesses' | 'users' | 'requests'>('overview');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const approveMutation = useMutation<any, any, string>({
    mutationFn: (id: string) => businessService.approve(id),
    onSuccess: () => { toast.success(t('approve') || 'Approved'); queryClient.invalidateQueries(['admin-businesses']); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Failed to approve'); },
  });
  const rejectMutation = useMutation<any, any, { id: string; reason?: string }>({
    mutationFn: (vars) => businessService.reject(vars.id, vars.reason),
    onSuccess: () => { toast.success(t('reject') || 'Rejected'); queryClient.invalidateQueries(['admin-businesses']); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Failed to reject'); },
  });
  const suspendMutation = useMutation<any, any, { id: string; reason?: string }>({
    mutationFn: (vars) => businessService.suspend(vars.id, vars.reason),
    onSuccess: () => { toast.success('Business suspended successfully'); queryClient.invalidateQueries(['admin-businesses']); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Failed to suspend business'); },
  });
  const unsuspendMutation = useMutation<any, any, string>({
    mutationFn: (id: string) => businessService.unsuspend(id),
    onSuccess: () => { toast.success('Business unsuspended successfully'); queryClient.invalidateQueries(['admin-businesses']); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Failed to unsuspend business'); },
  });
  const toggleUserStatusMutation = useMutation<any, any, User>({
    mutationFn: (u: User) => (u.isActive ? userService.deactivateUser(u.id) : userService.activateUser(u.id)),
    onSuccess: () => { toast.success(t('updatedUser')); queryClient.invalidateQueries(['admin-users']); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || t('failedToUpdateUser')); },
  });

  // Fetch pending requests
  const { data: pendingRequestsData, isLoading: requestsLoading } = useQuery(
    ['pending-requests'],
    async () => {
      const response = await api.get('/requests/pending');
      return Array.isArray(response.data) ? response.data : response.data?.data || [];
    },
    {
      enabled: activeTab === 'requests',
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  const pendingRequests = useMemo(() => {
    if (!pendingRequestsData) return [];
    return Array.isArray(pendingRequestsData) ? pendingRequestsData : [];
  }, [pendingRequestsData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-accent-100 text-accent-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'business_owner': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-green-100 text-green-800';
      default: return 'bg-accent-100 text-accent-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('superAdminDashboard')}</h1>
          <p className="text-gray-600 mt-2">{t('platformOverviewAndManagement')}</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn btn-outline">
            <Settings className="h-4 w-4 mr-2" />
            {t('platformSettings')}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: t('overview'), icon: TrendingUp },
            { id: 'businesses', label: t('businesses'), icon: Building2 },
            { id: 'users', label: t('users'), icon: Users },
            { id: 'requests', label: 'Requests', icon: MessageSquare, badge: pendingRequests.length > 0 ? pendingRequests.length : undefined },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: t('totalUsers'), value: stats.totalUsers, icon: Users, change: '+12%', changeType: 'positive' },
              { name: t('totalBusinesses'), value: stats.totalBusinesses, icon: Building2, change: '+8%', changeType: 'positive' },
              { name: t('activeBusinesses'), value: stats.activeBusinesses, icon: CheckCircle, change: '+5%', changeType: 'positive' },
              { name: t('totalBookings'), value: stats.totalBookings, icon: Calendar, change: '+15%', changeType: 'positive' },
              { name: t('totalRevenue'), value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, change: '+18%', changeType: 'positive' },
              { name: t('pendingApprovals'), value: stats.pendingApprovals, icon: AlertTriangle, change: '-2', changeType: 'neutral' },
            ].map((stat) => (
              <div key={stat.name} className="card p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-accent-100 rounded-lg">
                    <stat.icon className="h-6 w-6 text-accent-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className={`text-sm ${stat.changeType === 'positive' ? 'text-green-600' : stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'}`}>
                      {stat.change} {t('fromLastMonth')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setActiveTab('businesses')}
                  className="w-full btn btn-outline justify-start"
                >
                  <Eye className="h-4 w-4 mr-2" />
{t('pendingApprovals')}
                </button>
                <button 
                  onClick={() => setActiveTab('users')}
                  className="w-full btn btn-outline justify-start"
                >
                  <Users className="h-4 w-4 mr-2" />
{t('users')}
                </button>
                <button className="w-full btn btn-outline justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Platform Settings
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Bella Vista Restaurant</span> was approved
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">5 new users</span> registered today
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Glamour Beauty Salon</span> is pending approval
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Businesses Tab */}
      {activeTab === 'businesses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{t('businessName')} Management</h2>
            <div className="flex items-center gap-3">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <div className="text-sm text-gray-600">
                {businesses.filter(b => b.status === 'pending').length} pending approvals
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('businessName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('owner')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      Email
                      <button
                        onClick={() => setShowOwnerEmails(!showOwnerEmails)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title={showOwnerEmails ? "Hide emails" : "Show emails"}
                      >
                        {showOwnerEmails ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('location')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(businesses || []).map((business: any) => (
                  <tr key={business.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{business.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{capitalizeWords(String(business.category || '').replace('_', ' '))}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{business.owner?.firstName} {business.owner?.lastName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {showOwnerEmails ? business.owner?.email : '••••••@••••.com'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{business.city}, {business.state}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(business.status)}`}>
                        {business.status.charAt(0).toUpperCase() + business.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(business.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {business.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => approveMutation.mutate(business.id)}
                            className="text-green-600 hover:text-green-900"
                            title={t('approve')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => rejectMutation.mutate({ id: business.id })}
                            className="text-red-600 hover:text-red-900"
                            title={t('reject')}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {business.status === 'approved' && (
                        <button
                          onClick={() => {
                            setSelectedBusinessForSuspension({ id: business.id, name: business.name });
                            setSuspendModalOpen(true);
                          }}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Suspend"
                        >
                          <AlertTriangle className="h-5 w-5" />
                        </button>
                      )}
                      {business.status === 'suspended' && (
                        <button
                          onClick={() => {
                            setSelectedBusinessForUnsuspension({ id: business.id, name: business.name });
                            setUnsuspendModalOpen(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Unsuspend"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{t('user')} Management</h2>
            <div className="text-sm text-gray-600">
              {(users || []).length} total users
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('user')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('email')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('role')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(users || []).map((user: any) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {capitalizeWords(String(user.role || '').replace('_', ' '))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
{user.isActive ? t('isActive') : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => toggleUserStatusMutation.mutate(user)}
                        className={`${user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pending Requests</h2>
            <p className="text-sm text-gray-600 mt-1">Review and manage unsuspension requests from business owners</p>
          </div>
          <div className="p-6">
            {requestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending requests</p>
                <p className="text-gray-400 text-sm mt-2">All requests have been processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.requestType === 'unsuspension' ? 'Unsuspension Request' : 'Request'}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="ml-8 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{request.business?.name || 'Unknown Business'}</span>
                          </div>
                          {request.business?.owner && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span>
                                {request.business.owner.firstName} {request.business.owner.lastName}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span>{request.business.owner.email}</span>
                            </div>
                          )}
                          {request.reason && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                              <p className="text-sm font-medium text-gray-900 mb-1">Request Reason:</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.reason}</p>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            Requested {new Date(request.requestedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => setSelectedRequestId(request.id)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                        >
                          Review Request
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suspend Business Modal */}
      <SuspendBusinessModal
        isOpen={suspendModalOpen}
        businessName={selectedBusinessForSuspension?.name || ''}
        onConfirm={(reason) => {
          if (selectedBusinessForSuspension) {
            suspendMutation.mutate({ id: selectedBusinessForSuspension.id, reason });
          }
          setSuspendModalOpen(false);
          setSelectedBusinessForSuspension(null);
        }}
        onCancel={() => {
          setSuspendModalOpen(false);
          setSelectedBusinessForSuspension(null);
        }}
      />

      {/* Unsuspend Business Modal */}
      <UnsuspendBusinessModal
        isOpen={unsuspendModalOpen}
        businessName={selectedBusinessForUnsuspension?.name || ''}
        onConfirm={() => {
          if (selectedBusinessForUnsuspension) {
            unsuspendMutation.mutate(selectedBusinessForUnsuspension.id);
          }
          setUnsuspendModalOpen(false);
          setSelectedBusinessForUnsuspension(null);
        }}
        onCancel={() => {
          setUnsuspendModalOpen(false);
          setSelectedBusinessForUnsuspension(null);
        }}
      />

      {/* Request Response Modal */}
      {selectedRequestId && (
        <RequestResponseModal
          requestId={selectedRequestId}
          onClose={() => {
            setSelectedRequestId(null);
            queryClient.invalidateQueries(['pending-requests']);
            queryClient.invalidateQueries(['admin-businesses']);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries(['pending-requests']);
            queryClient.invalidateQueries(['admin-businesses']);
          }}
        />
      )}
    </div>
  );
};
