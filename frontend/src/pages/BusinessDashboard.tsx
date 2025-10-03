import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { Building2, Calendar, DollarSign, Users, TrendingUp, Plus, Settings, Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

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
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });
  const [myBusiness, setMyBusiness] = useState<any | null>(null);
  const [statsApi, setStatsApi] = useState<any | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  // Mock data and fetch business + stats
  useEffect(() => {
    setServices([
      { id: '1', name: 'Haircut & Style', price: 65, duration: 60, isActive: true },
      { id: '2', name: 'Hair Coloring', price: 120, duration: 120, isActive: true },
      { id: '3', name: 'Manicure & Pedicure', price: 85, duration: 90, isActive: true },
    ]);

    setBookings([
      { id: '1', customerName: 'John Doe', serviceName: 'Haircut & Style', appointmentDate: '2024-01-15 10:00', status: 'confirmed', totalAmount: 65 },
      { id: '2', customerName: 'Jane Smith', serviceName: 'Hair Coloring', appointmentDate: '2024-01-16 14:00', status: 'pending', totalAmount: 120 },
    ]);
    (async () => {
      try {
        const bRes = await api.get('/businesses/my-business');
        setMyBusiness(bRes.data);
        if (bRes.data?.id) {
          const sRes = await api.get(`/businesses/${bRes.data.id}/stats`);
          setStatsApi(sRes.data);
        }
      } catch {}
    })();
  }, []);

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

  const updateBookingStatus = (bookingId: string, status: string) => {
    setBookings(bookings.map(booking => 
      booking.id === bookingId ? { ...booking, status } : booking
    ));
  };

  const stats = [
    { name: t('totalBookings'), value: (statsApi?.totalBookings ?? bookings.length).toString(), icon: Calendar, change: '+12%', changeType: 'positive' },
    ...(!isStaff && myBusiness?.showRevenue && (statsApi?.totalRevenue !== undefined) ? [{ name: t('totalRevenue'), value: `$${(statsApi?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, change: '+8%', changeType: 'positive' }] : []),
    { name: t('customers'), value: new Set(bookings.map(b => b.customerName)).size.toString(), icon: Users, change: '+5%', changeType: 'positive' },
    { name: t('services'), value: services.filter(s => s.isActive).length.toString(), icon: Building2, change: '+0%', changeType: 'neutral' },
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
          <h3 className="text-lg font-semibold text-gray-900">Revenue tracking</h3>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={!!myBusiness?.showRevenue} onChange={toggleRevenue} />
            {myBusiness?.showRevenue ? 'Enabled' : 'Disabled'}
          </label>
        </div>
        <p className="text-sm text-gray-600 mt-2">Control whether revenue appears in your dashboard stats.</p>
      </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your business and track performance</p>
        </div>
        <button 
          onClick={() => setShowAddService(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
{t('addService')}
        </button>
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
                  {stat.change} from last month
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Services Management */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('services')} Management</h3>
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
                    <div className="text-sm text-gray-900">{service.duration} min</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {service.isActive ? 'Active' : 'Inactive'}
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

      {/* Recent Bookings */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('bookings')}</h3>
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
              {bookings.map((booking) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h3>
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
