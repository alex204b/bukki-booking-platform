import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, Users, Building2, BarChart3, PieChart, Activity } from 'lucide-react';

interface AnalyticsData {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  cancellationRate: number;
}

interface BookingTrend {
  date: string;
  count: number;
}

interface TopService {
  serviceName: string;
  bookingCount: number;
  averageRating: number;
}

interface AnalyticsDashboardProps {
  businessId?: string;
  isAdmin?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  businessId, 
  isAdmin = false 
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    completionRate: 0,
    cancellationRate: 0,
  });
  const [bookingTrends, setBookingTrends] = useState<BookingTrend[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Mock data - replace with API calls
  useEffect(() => {
    if (isAdmin) {
      // Platform-wide analytics
      setAnalytics({
        totalBookings: 342,
        completedBookings: 298,
        cancelledBookings: 44,
        totalRevenue: 15420,
        averageRating: 4.6,
        completionRate: 87.1,
        cancellationRate: 12.9,
      });
    } else {
      // Business-specific analytics
      setAnalytics({
        totalBookings: 45,
        completedBookings: 38,
        cancelledBookings: 7,
        totalRevenue: 2840,
        averageRating: 4.8,
        completionRate: 84.4,
        cancellationRate: 15.6,
      });
    }

    // Mock booking trends
    setBookingTrends([
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 8 },
      { date: '2024-01-03', count: 12 },
      { date: '2024-01-04', count: 15 },
      { date: '2024-01-05', count: 18 },
      { date: '2024-01-06', count: 22 },
      { date: '2024-01-07', count: 25 },
    ]);

    // Mock top services
    setTopServices([
      { serviceName: 'Haircut & Style', bookingCount: 18, averageRating: 4.9 },
      { serviceName: 'Hair Coloring', bookingCount: 12, averageRating: 4.8 },
      { serviceName: 'Manicure & Pedicure', bookingCount: 15, averageRating: 4.7 },
    ]);
  }, [isAdmin, businessId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Platform Analytics' : 'Business Analytics'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Platform-wide performance metrics' : 'Your business performance overview'}
          </p>
        </div>
        
        <div className="flex space-x-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                timeRange === range
                  ? 'bg-accent-100 text-accent-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-accent-100 rounded-lg">
              <Calendar className="h-6 w-6 text-accent-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalBookings}</p>
              <p className="text-sm text-accent-600">+12% from last period</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-accent-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-accent-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(analytics.completionRate)}</p>
              <p className="text-sm text-accent-600">+2.1% from last period</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-accent-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-accent-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
              <p className="text-sm text-accent-600">+8.5% from last period</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-accent-100 rounded-lg">
              <Star className="h-6 w-6 text-accent-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.averageRating.toFixed(1)}</p>
              <p className="text-sm text-accent-600">+0.2 from last period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Trends Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Booking Trends</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {bookingTrends.map((trend, index) => (
              <div key={trend.date} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-accent-500 rounded-t"
                  style={{ height: `${(trend.count / 25) * 200}px` }}
                ></div>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs font-medium text-gray-700">{trend.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Services</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {topServices.map((service, index) => (
              <div key={service.serviceName} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-accent-500' : 
                    index === 1 ? 'bg-accent-400' : 'bg-accent-300'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.serviceName}</p>
                    <p className="text-xs text-gray-500">{service.bookingCount} bookings</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{service.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">rating</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Breakdown */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Completed Bookings</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(analytics.totalRevenue * 0.87)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cancelled Refunds</span>
              <span className="text-sm font-medium text-red-600">
                -{formatCurrency(analytics.totalRevenue * 0.13)}
              </span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">Net Revenue</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(analytics.totalRevenue * 0.87)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-medium text-gray-900">{formatPercentage(analytics.completionRate)}</span>
              </div>
              <div className="w-full bg-accent-200 rounded-full h-2">
                <div 
                  className="bg-accent-600 h-2 rounded-full" 
                  style={{ width: `${analytics.completionRate}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Cancellation Rate</span>
                <span className="text-sm font-medium text-gray-900">{formatPercentage(analytics.cancellationRate)}</span>
              </div>
              <div className="w-full bg-accent-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ width: `${analytics.cancellationRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full btn btn-outline justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
            <button className="w-full btn btn-outline justify-start">
              <Share className="h-4 w-4 mr-2" />
              Share Analytics
            </button>
            <button className="w-full btn btn-outline justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Configure Alerts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Missing icon components - these would be imported from lucide-react
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Star = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.118 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const Download = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Share = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
  </svg>
);

const Settings = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
