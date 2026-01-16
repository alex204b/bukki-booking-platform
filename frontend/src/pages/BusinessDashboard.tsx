import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, bookingService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { Building2, Calendar, DollarSign, Users, Plus, Eye, Edit, CheckCircle, XCircle, QrCode, Clock, Bell, MessageCircle, Settings } from 'lucide-react';
import { RevenueChart } from '../components/RevenueChart';
import { BookingActionModal } from '../components/BookingActionModal';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
  maxBookingsPerCustomerPerDay?: number;
  maxBookingsPerCustomerPerWeek?: number;
  bookingCooldownHours?: number;
  allowMultipleActiveBookings?: boolean;
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
  const [showEditService, setShowEditService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editServiceData, setEditServiceData] = useState({ 
    name: '', 
    price: '', 
    duration: '',
    maxBookingsPerCustomerPerDay: '1',
    maxBookingsPerCustomerPerWeek: '',
    bookingCooldownHours: '0',
    allowMultipleActiveBookings: true
  });
  const [myBusiness, setMyBusiness] = useState<any | null>(null);
  const [statsApi, setStatsApi] = useState<any | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'upcoming' | 'pending' | 'done'>('all');
  const [servicesLoading, setServicesLoading] = useState(true);
  const [bookingActionModal, setBookingActionModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    action: 'accept' | 'reject';
  }>({
    isOpen: false,
    booking: null,
    action: 'accept',
  });
  const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);

  // Determine if user is an employee (staff)
  useEffect(() => {
    setIsStaff(user?.role === 'employee');
  }, [user]);

  // Function to load bookings - can be called manually
  const loadBookings = async (businessId: string) => {
    try {
      console.log('[BusinessDashboard] 🔄 Loading bookings for business:', businessId);
      const bookingsRes = await api.get(`/bookings/business/${businessId}`);

      console.log('[BusinessDashboard] Raw bookings response:', {
        data: bookingsRes.data,
        dataType: typeof bookingsRes.data,
        isArray: Array.isArray(bookingsRes.data),
        count: Array.isArray(bookingsRes.data) ? bookingsRes.data.length : 0,
      });

      const allBookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

      const businessBookings = allBookings.map((b: any) => ({
        id: b.id,
        customerName: `${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim() || t('customer'),
        serviceName: b.service?.name || t('serviceName'),
        appointmentDate: b.appointmentDate,
        status: b.status,
        totalAmount: Number(b.totalAmount) || 0,
      }));

      console.log('[BusinessDashboard] ✅ Formatted bookings:', {
        count: businessBookings.length,
        bookings: businessBookings.slice(0, 3),
      });

      setBookings(businessBookings);
      return businessBookings;
    } catch (err: any) {
      console.error('[BusinessDashboard] ❌ Error loading bookings:', err);
      console.error('[BusinessDashboard] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      return [];
    }
  };

  // Load real data from API only (no mock fallbacks)
  useEffect(() => {
    (async () => {
      try {
        setServicesLoading(true);
        const bRes = await api.get('/businesses/my-business');
        setMyBusiness(bRes.data);
        if (bRes.data?.id) {
          console.log('[BusinessDashboard] Loading data for business:', bRes.data.id);
          
          const [sRes, servicesRes, waitlistRes] = await Promise.all([
            api.get(`/businesses/${bRes.data.id}/stats`).catch((err) => {
              console.error('[BusinessDashboard] ❌ Error fetching stats:', err);
              return { data: {} };
            }),
            api.get(`/services/business/${bRes.data.id}`).catch((err) => {
              console.error('[BusinessDashboard] ❌ Error fetching services:', err);
              console.error('[BusinessDashboard] Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
              });
              return { data: [] };
            }),
            api.get(`/waitlist/business/${bRes.data.id}`).catch(() => ({ data: [] })), // Waitlist (optional)
          ]);
          
          setStatsApi(sRes.data);
          
          // Handle services response - it might be an array directly or wrapped in data
          let servicesData: Service[] = [];
          if (Array.isArray(servicesRes.data)) {
            servicesData = servicesRes.data;
          } else if (servicesRes.data?.data && Array.isArray(servicesRes.data.data)) {
            servicesData = servicesRes.data.data;
          } else if (servicesRes.data && typeof servicesRes.data === 'object') {
            // Try to extract array from response
            servicesData = [];
            console.warn('[BusinessDashboard] Unexpected services response format:', servicesRes.data);
          }
          
          console.log('[BusinessDashboard] ✅ Services loaded:', servicesData.length, 'services');
          console.log('[BusinessDashboard] Services data:', servicesData);
          setServices(servicesData);
          setServicesLoading(false);
          setWaitlist(waitlistRes.data || []);

          // Load bookings using the dedicated function
          await loadBookings(bRes.data.id);
        }
      } catch (err: any) {
        console.error('[BusinessDashboard] ❌ Failed to load business data:', err?.response?.data || err?.message);
        setServicesLoading(false);
      }
    })();
  }, [user, t]);

  const handleAddService = async () => {
    if (!newService.name || !newService.price || !newService.duration) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!myBusiness?.id) {
      toast.error('Business not found');
      return;
    }

    try {
      const response = await api.post('/services', {
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration),
        isActive: true,
        businessId: myBusiness.id,
      });

      toast.success('Service added successfully!');
      setNewService({ name: '', price: '', duration: '' });
      setShowAddService(false);
      
      // Refresh services list
      await refreshServices();
    } catch (error: any) {
      console.error('Error adding service:', error);
      toast.error(error.response?.data?.message || 'Failed to add service');
    }
  };

  const refreshServices = async () => {
    if (!myBusiness?.id) return;
    try {
      const servicesRes = await api.get(`/services/business/${myBusiness.id}`);
      const servicesData = Array.isArray(servicesRes.data) 
        ? servicesRes.data 
        : (servicesRes.data?.data || []);
      console.log('[BusinessDashboard] Services refreshed:', servicesData.length, 'services');
      setServices(servicesData);
    } catch (error: any) {
      console.error('[BusinessDashboard] Error refreshing services:', error);
    }
  };

  const handleEditService = async () => {
    if (!editingService || !myBusiness?.id) {
      toast.error('Service not found');
      return;
    }

    if (!editServiceData.name || !editServiceData.price || !editServiceData.duration) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const updateData: any = {
        name: editServiceData.name,
        price: parseFloat(editServiceData.price),
        duration: parseInt(editServiceData.duration),
        maxBookingsPerCustomerPerDay: parseInt(editServiceData.maxBookingsPerCustomerPerDay) || 1,
        bookingCooldownHours: parseInt(editServiceData.bookingCooldownHours) || 0,
        allowMultipleActiveBookings: editServiceData.allowMultipleActiveBookings,
      };

      // Only include weekly limit if it's set
      if (editServiceData.maxBookingsPerCustomerPerWeek) {
        updateData.maxBookingsPerCustomerPerWeek = parseInt(editServiceData.maxBookingsPerCustomerPerWeek);
      }

      await api.patch(`/services/${editingService.id}`, updateData);

      toast.success('Service updated successfully!');
      setShowEditService(false);
      setEditingService(null);
      setEditServiceData({ 
        name: '', 
        price: '', 
        duration: '',
        maxBookingsPerCustomerPerDay: '1',
        maxBookingsPerCustomerPerWeek: '',
        bookingCooldownHours: '0',
        allowMultipleActiveBookings: true
      });
      
      // Refresh services list
      await refreshServices();
    } catch (error: any) {
      console.error('Error updating service:', error);
      toast.error(error.response?.data?.message || 'Failed to update service');
    }
  };

  const toggleServiceStatus = (serviceId: string) => {
    setServices(services.map(service => 
      service.id === serviceId ? { ...service, isActive: !service.isActive } : service
    ));
  };

  const handleBookingAction = (booking: Booking, action: 'accept' | 'reject') => {
    setBookingActionModal({
      isOpen: true,
      booking,
      action,
    });
  };

  const handleConfirmBookingAction = async (reason?: string) => {
    if (!bookingActionModal.booking) return;

    setIsUpdatingBooking(true);
    try {
      const status = bookingActionModal.action === 'accept' ? 'confirmed' : 'cancelled';
      await bookingService.updateStatus(bookingActionModal.booking.id, status, reason);
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingActionModal.booking!.id ? { ...booking, status } : booking
      ));
      
      // Invalidate queries to refresh data everywhere (including customer view)
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries('my-bookings');
      
      // Refresh bookings from API using the dedicated function
      if (myBusiness?.id) {
        console.log('[BusinessDashboard] Refreshing bookings after status update...');
        await loadBookings(myBusiness.id);
      }
      
      if (bookingActionModal.action === 'accept') {
        toast.success(t('bookingAccepted') || 'Booking accepted successfully');
      } else {
        toast.success(t('bookingRejected') || 'Booking rejected');
      }
      
      setBookingActionModal({ isOpen: false, booking: null, action: 'accept' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update booking status');
    } finally {
      setIsUpdatingBooking(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    // Legacy method - redirect to new modal-based approach
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      handleBookingAction(booking, status === 'confirmed' ? 'accept' : 'reject');
    }
  };

  const stats = [
    { name: t('totalBookings'), value: String(statsApi?.totalBookings ?? 0), icon: Calendar, change: '+0%', changeType: 'neutral' },
    ...(!isStaff && myBusiness?.showRevenue && (statsApi?.totalRevenue !== undefined) ? [{ name: t('totalRevenue'), value: `$${(statsApi?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, change: '+0%', changeType: 'neutral' }] : []),
    { name: t('customers'), value: String(statsApi?.totalCustomers ?? 0), icon: Users, change: '+0%', changeType: 'neutral' },
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
        
        {servicesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-accent-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('serviceName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('price')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('duration')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <p className="text-sm">{t('noServices') || 'No services found. Add your first service to get started.'}</p>
                  </td>
                </tr>
              ) : (
              services.map((service) => (
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
                    <button 
                      onClick={() => {
                        setEditingService(service);
                        setEditServiceData({
                          name: service.name,
                          price: service.price.toString(),
                          duration: service.duration.toString(),
                          maxBookingsPerCustomerPerDay: (service.maxBookingsPerCustomerPerDay || 1).toString(),
                          maxBookingsPerCustomerPerWeek: service.maxBookingsPerCustomerPerWeek?.toString() || '',
                          bookingCooldownHours: (service.bookingCooldownHours || 0).toString(),
                          allowMultipleActiveBookings: service.allowMultipleActiveBookings !== false
                        });
                        setShowEditService(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                      title={t('edit') || 'Edit'}
                    >
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
              ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
      )}

      {/* Waitlist Management - Only for business owners */}
      {!isStaff && waitlist.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent-600" />
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
                  ? 'bg-accent-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('all') || 'All'}
            </button>
            <button
              onClick={() => setBookingFilter('upcoming')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                bookingFilter === 'upcoming'
                  ? 'bg-accent-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('upcoming') || 'Upcoming'}
            </button>
            <button
              onClick={() => setBookingFilter('pending')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                bookingFilter === 'pending'
                  ? 'bg-accent-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('pending') || 'Pending'}
            </button>
            <button
              onClick={() => setBookingFilter('done')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                bookingFilter === 'done'
                  ? 'bg-accent-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('done') || 'Done'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-accent-50">
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
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-accent-100 text-accent-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {booking.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleBookingAction(booking, 'accept')}
                            className="text-green-600 hover:text-green-900"
                            title={t('accept') || 'Accept'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleBookingAction(booking, 'reject')}
                            className="text-red-600 hover:text-red-900"
                            title={t('reject') || 'Reject'}
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

      {/* Edit Service Modal - Only for business owners */}
      {!isStaff && showEditService && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('editService') || 'Edit Service'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceName')}</label>
                <input
                  type="text"
                  value={editServiceData.name}
                  onChange={(e) => setEditServiceData({...editServiceData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Haircut & Style"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('price')} ($)</label>
                <input
                  type="number"
                  value={editServiceData.price}
                  onChange={(e) => setEditServiceData({...editServiceData, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="65.00"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('duration')} ({t('minutes') || 'minutes'})</label>
                <input
                  type="number"
                  value={editServiceData.duration}
                  onChange={(e) => setEditServiceData({...editServiceData, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="60"
                />
              </div>

              {/* Booking Limitations */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('bookingLimitations') || 'Booking Limitations'}</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('maxBookingsPerDay') || 'Max bookings per customer per day'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editServiceData.maxBookingsPerCustomerPerDay}
                      onChange={(e) => setEditServiceData({...editServiceData, maxBookingsPerCustomerPerDay: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('maxBookingsPerDayHelp') || 'e.g., 1 for restaurants (one booking per day)'}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('maxBookingsPerWeek') || 'Max bookings per customer per week (optional)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editServiceData.maxBookingsPerCustomerPerWeek}
                      onChange={(e) => setEditServiceData({...editServiceData, maxBookingsPerCustomerPerWeek: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Leave empty for no limit"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('bookingCooldown') || 'Cooldown between bookings (hours)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editServiceData.bookingCooldownHours}
                      onChange={(e) => setEditServiceData({...editServiceData, bookingCooldownHours: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('bookingCooldownHelp') || 'Minimum hours between bookings (0 = no restriction)'}</p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowMultiple"
                      checked={editServiceData.allowMultipleActiveBookings}
                      onChange={(e) => setEditServiceData({...editServiceData, allowMultipleActiveBookings: e.target.checked})}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowMultiple" className="ml-2 block text-xs text-gray-700">
                      {t('allowMultipleActive') || 'Allow multiple active bookings'}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditService(false);
                  setEditingService(null);
                  setEditServiceData({ 
                    name: '', 
                    price: '', 
                    duration: '',
                    maxBookingsPerCustomerPerDay: '1',
                    maxBookingsPerCustomerPerWeek: '',
                    bookingCooldownHours: '0',
                    allowMultipleActiveBookings: true
                  });
                }}
                className="btn btn-outline"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleEditService}
                className="btn btn-primary"
              >
                {t('save') || 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Action Modal */}
      <BookingActionModal
        isOpen={bookingActionModal.isOpen}
        booking={bookingActionModal.booking ? {
          id: bookingActionModal.booking.id,
          customerName: bookingActionModal.booking.customerName,
          serviceName: bookingActionModal.booking.serviceName,
          appointmentDate: bookingActionModal.booking.appointmentDate,
        } : null}
        action={bookingActionModal.action}
        onConfirm={handleConfirmBookingAction}
        onCancel={() => setBookingActionModal({ isOpen: false, booking: null, action: 'accept' })}
        isLoading={isUpdatingBooking}
      />
    </div>
  );
};
