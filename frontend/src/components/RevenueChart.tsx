import React from 'react';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface RevenueChartProps {
  businessId: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ businessId, period = 'month' }) => {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  const { data: revenueData, isLoading } = useQuery(
    ['revenue', businessId, period],
    () => api.get(`/analytics/business/revenue?period=${period}`),
    {
      enabled: !!businessId,
      select: (response) => response.data,
    }
  );

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!revenueData) {
    return null;
  }

  const { totalRevenue, revenueTrends, bookingsByStatus } = revenueData;
  const maxRevenue = Math.max(...(revenueTrends?.map((t: any) => t.revenue) || [0]), 1);

  // Calculate trend
  const trend = revenueTrends && revenueTrends.length >= 2
    ? revenueTrends[revenueTrends.length - 1].revenue - revenueTrends[0].revenue
    : 0;
  const trendPercent = revenueTrends && revenueTrends.length >= 2 && revenueTrends[0].revenue > 0
    ? ((trend / revenueTrends[0].revenue) * 100).toFixed(1)
    : '0';

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('revenue') || 'Revenue'}</h3>
          <p className="text-sm text-gray-600 capitalize">{period}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(totalRevenue / 100)}
          </div>
          {trend !== 0 && (
            <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {Math.abs(parseFloat(trendPercent))}%
            </div>
          )}
        </div>
      </div>

      {/* Simple Bar Chart */}
      {revenueTrends && revenueTrends.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-1 h-48">
            {revenueTrends.map((trend: any, index: number) => {
              const height = (trend.revenue / maxRevenue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary-600 rounded-t transition-all hover:bg-primary-700"
                    style={{ height: `${height}%` }}
                    title={`${new Date(trend.date).toLocaleDateString()}: ${formatPrice(trend.revenue / 100)}`}
                  />
                  <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                    {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
        <div>
          <p className="text-sm text-gray-600">{t('confirmed') || 'Confirmed'}</p>
          <p className="text-lg font-semibold text-gray-900">
            {bookingsByStatus?.confirmed || 0}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">{t('pending') || 'Pending'}</p>
          <p className="text-lg font-semibold text-gray-900">
            {bookingsByStatus?.pending || 0}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">{t('cancelled') || 'Cancelled'}</p>
          <p className="text-lg font-semibold text-gray-900">
            {bookingsByStatus?.cancelled || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

