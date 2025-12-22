import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, bookingService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { Building2, Calendar, DollarSign, Users, Plus, Eye, Edit, CheckCircle, XCircle, QrCode, Clock, Bell, MessageCircle, Settings } from 'lucide-react';
import { RevenueChart } from '../components/RevenueChart';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface Booking {
  id: string;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  status: string;
  totalAmount: number;
}

export const BusinessDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });
  const [myBusiness, setMyBusiness] = useState<any | null>(null);
  const [statsApi, setStatsApi] = useState<any | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'upcoming' | 'pending' | 'done'>('all');

  // Determine if user is an employee (staff)
  useEffect(() => {
    setIsStaff(user?.role === 'employee');
  }, [user]);

  // Load real data from API only (no mock fallbacks)
  useEffect(() => {
    (async () => {
      try {
        const bRes = await api.get('/businesses/my-business');
        setMyBusiness(bRes.data);
        if (bRes.data?.id) {
          const [sRes, servicesRes, bookingsRes, waitlistRes] = await Promise.all([
            api.get(`/businesses/${bRes.data.id}/stats`),
            api.get(`/services/business/${bRes.data.id}`),
            api.get('/bookings', { params: { businessId: bRes.data.id } }), // Get bookings filtered for this business
            api.get(`/waitlist/business/${bRes.data.id}`).catch(() => ({ data: [] })), // Waitlist (optional)
          ]);
          setStatsApi(sRes.data);
          setServices(servicesRes.data || []);
          setWaitlist(waitlistRes.data || []);
          
          // Format bookings (already filtered by backend if businessId param was used)
          const allBookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
          
          console.log('[BusinessDashboard] Bookings data:', {
            totalBookings: allBookings.length,
            businessId: bRes.data.id,
            sampleBooking: allBookings[0],
            bookingsWithBusiness: allBookings.filter((b: any) => b.business).length,
          });
          
          const businessBookings = allBookings
            .map((b: any) => ({
              id: b.id,
              customerName: `${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim() || t('customer'),
              serviceName: b.service?.name || t('serviceName'),
              appointmentDate: b.appointmentDate,
              status: b.status,
              totalAmount: Number(b.totalAmount) || 0,
            }));
          
          console.log('[BusinessDashboard] Formatted bookings:', {
            formattedCount: businessBookings.length,
            businessId: bRes.data.id,
          });
          
          setBookings(businessBookings);
        }
      } catch (err: any) {
        console.error('Failed to load business data', err?.response?.data || err?.message);
      }
    })();
  }, [user, t]);

  const handleAddService = () => {
    if (newService.name && newService.price && newService.duration) {
      const service: Service = {
        id: Date.now().toString(),
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration),
        isActive: true,
      };
      setServices([...services, service]);
      setNewService({ name: '', price: '', duration: '' });
      setShowAddService(false);
    }
  };

  const toggleServiceStatus = (serviceId: string) => {
    setServices(services.map(service => 
      service.id === serviceId ? { ...service, isActive: !service.isActive } : service
    ));
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await bookingService.updateStatus(bookingId, status);
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId ? { ...booking, status } : booking
      ));
      // Invalidate queries to refresh data everywhere (including customer view)
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries('my-bookings');
      
      if (status === 'confirmed') {
        toast.success(t('bookingAccepted') || 'Booking accepted successfully');
      } else if (status === 'cancelled') {
        toast.success(t('bookingRejected') || 'Booking rejected');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update booking status');
    }
  };

  const stats = [
    { name: t('totalBookings'), value: String(statsApi?.totalBookings ?? 0), icon: Calendar, change: '+0%', changeType: 'neutral' },
    ...(!isStaff && myBusiness?.showRevenue && (statsApi?.totalRevenue !== undefined) ? [{ name: t('totalRevenue'), value: `$${(statsApi?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, change: '+0%', changeType: 'neutral' }] : []),
    { name: t('customers'), value: '0', icon: Users, change: '+0%', changeType: 'neutral' },
    { name: t('services'), value: String(services.filter(s => s.isActive).length), icon: Building2, change: '+0%', changeType: 'neutral' },
  ];

  const toggleRevenue = async () => {
    if (!myBusiness?.id) return;
    try {
      const next = !myBusiness.showRevenue;
      await api.patch(`/businesses/${myBusiness.id}`, { showRevenue: next });
      setMyBusiness({ ...myBusiness, showRevenue: next });
      if (next) {
        const sRes = await api.get(`/businesses/${myBusiness.id}/stats`);
        setStatsApi(sRes.data);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Revenue Visibility (owner only) */}
      {!isStaff && (
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('revenueTracking')}</h3>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!myBusiness?.showRevenue} onChange={toggleRevenue} />
            {myBusiness?.showRevenue ? t('enabled') : t('disabled')}
          </label>
        </div>
        <p className="text-sm text-gray-600 mt-2">{t('controlRevenueVisibility')}</p>
      </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isStaff ? t('businessSchedule') : t('businessDashboard')}
          </h1>
          <p className="text-gray-600 mt-2">
            {isStaff 
              ? `${t('viewScheduleAndBookings')} ${myBusiness?.name || t('theBusiness')}`
              : t('manageBusinessAndTrack')}
          </p>
        </div>
        <div className="flex gap-3">
          {!isStaff && (
            <button
              onClick={() => navigate('/business-settings')}
              className="btn btn-outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t('settings') || 'Settings'}
            </button>
          )}
          <button
            onClick={() => navigate('/chat-list')}
            className="btn btn-outline"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {t('messages') || 'Messages'}
          </button>
          <button
            onClick={() => navigate('/qr-scanner')}
            className="btn btn-primary"
          >
            <QrCode className="h-4 w-4 mr-2" />
            {t('scanQRCode')}
          </button>
          {!isStaff && (
            <button
              onClick={() => setShowAddService(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addService')}
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
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

      {/* Revenue Chart - Only for business owners with revenue enabled */}
      {!isStaff && myBusiness?.showRevenue && myBusiness?.id && (
        <RevenueChart businessId={myBusiness.id} period="month" />
      )}

      {/* Services Management - Only for business owners */}
      {!isStaff && (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('servicesManagement')}</h3>
          <button 
            onClick={() => setShowAddService(true)}
            className="btn btn-outline btn-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addService')}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serviceName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('price')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('duration')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${service.price}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{service.duration} {t('minutes')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {service.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => toggleServiceStatus(service.id)}
                      className={`${service.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                    >
                      {service.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Waitlist Management - Only for business owners */}
      {!isStaff && waitlist.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              {t('waitlist') || 'Waitlist'} ({waitlist.length})
            </h3>
          </div>
          
          <div className="space-y-3">
            {waitlist.slice(0, 5).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {entry.customer?.firstName} {entry.customer?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {entry.service?.name || t('service')}
                  </p>
                  {entry.preferredDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('preferredDate') || 'Preferred'}: {new Date(entry.preferredDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {entry.service && (
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/waitlist/notify/${myBusiness.id}/${entry.service.id}`, {
                          availableDate: new Date().toISOString(),
                        });
                        toast.success(t('waitlistNotified') || 'Waitlist customers notified!');
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || t('failedToNotifyWaitlist') || 'Failed to notify waitlist');
                      }
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <Bell className="h-4 w-4 mr-1" />
                    {t('notify') || 'Notify'}
                  </button>
                )}
              </div>
            ))}
            {waitlist.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                {t('andMore') || 'and'} {waitlist.length - 5} {t('more') || 'more'}...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('bookings')}</h3>
          {/* Booking Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setBookingFilter('all')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                bookingFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('all') || 'All'}
            </button>
            <button
              onClick={() => setBookingFilter('upcoming')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                bookingFilter === 'upcoming'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('upcoming') || 'Upcoming'}
            </button>
            <button
              onClick={() => setBookingFilter('pending')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                bookingFilter === 'pending'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('pending') || 'Pending'}
            </button>
            <button
              onClick={() => setBookingFilter('done')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                bookingFilter === 'done'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('done') || 'Done'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('customerName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serviceName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('appointmentDate')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('totalAmount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                // Filter bookings based on selected filter
                const now = new Date();
                let filteredBookings = bookings;
                
                if (bookingFilter === 'upcoming') {
                  filteredBookings = bookings.filter((b: Booking) => {
                    const appointmentDate = new Date(b.appointmentDate);
                    return appointmentDate >= now && b.status !== 'cancelled';
                  });
                } else if (bookingFilter === 'pending') {
                  filteredBookings = bookings.filter((b: Booking) => b.status === 'pending');
                } else if (bookingFilter === 'done') {
                  filteredBookings = bookings.filter((b: Booking) => {
                    const appointmentDate = new Date(b.appointmentDate);
                    return appointmentDate < now || b.status === 'completed' || b.status === 'cancelled';
                  });
                }
                
                if (filteredBookings.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        {bookingFilter === 'all' 
                          ? `${t('noBookingsFound')}. ${isStaff ? t('bookingsWillAppearStaff') : t('bookingsWillAppearOwner')}`
                          : `${t('noBookingsFound')} for ${bookingFilter} bookings.`}
                      </td>
                    </tr>
                  );
                }
                
                return filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.serviceName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(booking.appointmentDate).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${booking.totalAmount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-primary-100 text-primary-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {booking.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Service Modal - Only for business owners */}
      {!isStaff && showAddService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('addNewService')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceName')}</label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({...newService, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Haircut & Style"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('price')} ($)</label>
                <input
                  type="number"
                  value={newService.price}
                  onChange={(e) => setNewService({...newService, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="65.00"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('duration')}</label>
                <input
                  type="number"
                  value={newService.duration}
                  onChange={(e) => setNewService({...newService, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="60"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddService(false)}
                className="btn btn-outline"
              >
{t('cancel')}
              </button>
              <button
                onClick={handleAddService}
                className="btn btn-primary"
              >
      {t('addService')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
