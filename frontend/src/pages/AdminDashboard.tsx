import React, { useState, useMemo } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Building2, Users, Calendar, DollarSign, CheckCircle, XCircle, Eye, Settings, TrendingUp, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userService, businessService } from '../services/api';
import toast from 'react-hot-toast';

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
  const { data: usersData } = useQuery(['admin-users'], () => userService.getAllUsers(), { select: (r) => r.data });
  const { data: businessesData } = useQuery(['admin-businesses', statusFilter], () => businessService.getAll(statusFilter === 'all' ? undefined : statusFilter), { select: (r) => r.data });
  const users: User[] = useMemo(() => usersData || [], [usersData]);
  const businesses: any[] = useMemo(() => businessesData || [], [businessesData]);
  const stats: PlatformStats = useMemo(() => ({
    totalUsers: users.length,
    totalBusinesses: businesses.length,
    activeBusinesses: businesses.filter((b: any) => b.isActive || b.status === 'approved').length,
    totalBookings: 0,
    totalRevenue: 0,
    pendingApprovals: businesses.filter((b: any) => b.status === 'pending').length,
  }), [users, businesses]);
  const [activeTab, setActiveTab] = useState<'overview' | 'businesses' | 'users'>('overview');
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
  const suspendMutation = useMutation<any, any, string>({
    mutationFn: (id: string) => businessService.suspend(id),
    onSuccess: () => { toast.success(t('suspended')); queryClient.invalidateQueries(['admin-businesses']); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || t('failedToSuspend')); },
  });
  const toggleUserStatusMutation = useMutation<any, any, User>({
    mutationFn: (u: User) => (u.isActive ? userService.deactivateUser(u.id) : userService.activateUser(u.id)),
    onSuccess: () => { toast.success(t('updatedUser')); queryClient.invalidateQueries(['admin-users']); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || t('failedToUpdateUser')); },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-primary-100 text-primary-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'business_owner': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-green-100 text-green-800';
      default: return 'bg-primary-100 text-primary-800';
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
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 inline mr-2" />
              {tab.label}
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
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <stat.icon className="h-6 w-6 text-primary-600" />
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
                      <button 
                        onClick={() => suspendMutation.mutate(business.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Suspend"
                      >
                        <AlertTriangle className="h-4 w-4" />
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
    </div>
  );
};
