import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, Search, Table2 } from 'lucide-react';
import { useQuery } from 'react-query';
import { api, resourceService } from '../services/api';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  businessId: string;
  onBookingCreated: () => void;
  /** When true (parallel/restaurant businesses), always show table selector */
  showTableSelector?: boolean;
  /** When true (personal_service businesses), show worker/employee selector */
  showWorkerSelector?: boolean;
}

export const CreateBookingModal: React.FC<CreateBookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  businessId,
  onBookingCreated,
  showTableSelector = false,
  showWorkerSelector = false,
}) => {
  const { t } = useI18n();
  const { formatPrice, formatPriceRange } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [partySize, setPartySize] = useState<number>(2);
  const [resourceId, setResourceId] = useState<string>('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('12:00');
  const isTableService = showTableSelector || selectedService?.resourceType === 'table' || selectedService?.resourceType === 'TABLE';

  // Sync date/time from selectedDate when modal opens
  useEffect(() => {
    if (isOpen && selectedDate) {
      const d = new Date(selectedDate);
      setDateStr(d.toISOString().slice(0, 10));
      setTimeStr(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    }
  }, [isOpen, selectedDate]);

  // Build selected date from dateStr + timeStr
  const effectiveDate = dateStr && timeStr
    ? new Date(`${dateStr}T${timeStr}:00`)
    : selectedDate;

  // Calculate end time based on selected service duration
  const calculatedEndDate = selectedService 
    ? new Date(effectiveDate.getTime() + selectedService.duration * 60000)
    : null;
  
  const durationMinutes = selectedService ? selectedService.duration : 0;

  // Fetch services for the business
  const { data: services } = useQuery(
    ['business-services', businessId],
    async () => {
      const response = await api.get(`/services/business/${businessId}`);
      return response.data;
    },
    { enabled: isOpen && !!businessId }
  );

  // Fetch tables/resources - when showTableSelector or table service selected
  const { data: resourcesData } = useQuery(
    ['resources-tables', businessId],
    () => resourceService.getAll(businessId).then((r) => r.data),
    { enabled: isOpen && !!businessId && (showTableSelector || isTableService) }
  );
  const tables = (Array.isArray(resourcesData) ? resourcesData : resourcesData?.data || []).filter(
    (r: any) => (r.type === 'table' || r.type === 'TABLE') && r.isActive !== false
  );

  // Fetch staff/workers - when showWorkerSelector (personal_service)
  const { data: staffResourcesData } = useQuery(
    ['resources-staff', businessId],
    () => resourceService.getAll(businessId).then((r) => r.data),
    { enabled: isOpen && !!businessId && showWorkerSelector }
  );
  const workers = (Array.isArray(staffResourcesData) ? staffResourcesData : staffResourcesData?.data || []).filter(
    (r: any) => (r.type === 'staff' || r.type === 'STAFF') && r.isActive !== false
  );


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceId) {
      toast.error('Please select a service');
      return;
    }

    if (!customerEmail) {
      toast.error('Please enter customer email');
      return;
    }

    if (showTableSelector && tables.length > 0 && !resourceId) {
      toast.error(t('pleaseSelectTable') || 'Please select a table');
      return;
    }

    if (showWorkerSelector && workers.length > 0 && !resourceId) {
      toast.error(t('pleaseSelectWorker') || 'Please select a worker');
      return;
    }

    setLoading(true);

    try {
      // Create booking with customer email (backend will handle customer lookup/creation)
      const bookingData: any = {
        serviceId,
        appointmentDate: effectiveDate.toISOString(),
        notes: notes || undefined,
        customerEmail, // Backend will find or create customer
      };
      if (isTableService && partySize) bookingData.partySize = partySize;
      if (resourceId) bookingData.resourceId = resourceId;
      
      console.log('[CreateBookingModal] Creating booking with data:', bookingData);
      console.log('[CreateBookingModal] Selected date:', selectedDate);
      console.log('[CreateBookingModal] Service ID:', serviceId);
      console.log('[CreateBookingModal] Customer email:', customerEmail);
      
      const response = await api.post('/bookings', bookingData);
      
      console.log('[CreateBookingModal] ✅ Booking created successfully:', response.data);

      toast.success(`Booking created! Confirmation email sent to ${customerEmail}`);
      onBookingCreated();
      onClose();
      
      // Reset form
      setCustomerEmail('');
      setServiceId('');
      setSelectedService(null);
      setNotes('');
      setResourceId('');
    } catch (error: any) {
      console.error('[CreateBookingModal] ❌ Error creating booking:', error);
      console.error('[CreateBookingModal] Error response:', JSON.stringify(error.response?.data, null, 2));
      console.error('[CreateBookingModal] Error status:', error.response?.status);
      console.error('[CreateBookingModal] Full error object:', error);
      
      // Log the actual error message from backend
      const backendError = error.response?.data;
      if (backendError) {
        console.error('[CreateBookingModal] Backend error message:', backendError.message);
        console.error('[CreateBookingModal] Backend error:', backendError.error);
        console.error('[CreateBookingModal] Full backend response:', backendError);
      }
      
      // Extract error message - check multiple possible locations
      let errorMessage = 'Failed to create booking';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || 
                      errorData.error || 
                      errorData.error?.message ||
                      (typeof errorData === 'string' ? errorData : errorMessage);
        
        // Log all error data to help debug
        console.error('[CreateBookingModal] Complete error data:', {
          message: errorData.message,
          error: errorData.error,
          statusCode: errorData.statusCode,
          status: error.response.status,
          fullData: errorData
        });
      }
      
      // Show detailed error
      const displayMessage = errorMessage.includes('Failed to create booking') 
        ? errorMessage 
        : `Failed to create booking: ${errorMessage}`;
      
      toast.error(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('createBooking') || 'Create Booking'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date and Time Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900 mb-1">
              <Calendar className="h-5 w-5 text-[#E7001E]" />
              <span className="font-semibold">{t('selectDateAndTime') || 'Select date and time'}:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('date') || 'Date'}</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('time') || 'Time'}</label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                  required
                />
              </div>
            </div>
            {calculatedEndDate && (
              <p className="text-sm text-gray-600">
                {effectiveDate.toLocaleString()} → {calculatedEndDate.toLocaleTimeString()} ({durationMinutes} min)
              </p>
            )}
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Mail className="h-4 w-4 inline mr-1" />
              {t('customerEmail') || 'Customer Email'} *
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              placeholder="customer@example.com"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
            />
            <p className="text-xs text-gray-500">
              💌 Confirmation email with QR code will be sent automatically
            </p>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              {t('selectService') || 'Select Service'} *
            </label>
            <select
              value={serviceId}
              onChange={(e) => {
                const selected = services?.find((s: any) => s.id === e.target.value);
                setServiceId(e.target.value);
                setSelectedService(selected || null);
              }}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
            >
              <option value="">{t('chooseService') || 'Choose a service...'}</option>
              {services?.map((service: any) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.duration} min - {service.priceMax != null && Number(service.priceMax) > Number(service.price) ? formatPriceRange(Number(service.price), Number(service.priceMax)) : formatPrice(Number(service.price || 0))}
                </option>
              ))}
            </select>
          </div>

          {isTableService && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('partySize') || 'Number of guests'} *
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={partySize}
                  onChange={(e) => setPartySize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                  required
                />
              </div>
              {tables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Table2 className="h-4 w-4 inline mr-1" />
                    {t('selectTable') || 'Select table'} *
                  </label>
                  <select
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                    required={showTableSelector}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                  >
                    <option value="">{t('chooseTable') || 'Choose a table...'}</option>
                    {tables.map((tbl: any) => (
                      <option key={tbl.id} value={tbl.id}>
                        {tbl.name} ({tbl.capacity || 0} {t('seats') || 'seats'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {showWorkerSelector && workers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                {t('assignToWorker') || 'Assign to worker'} *
              </label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                required={showWorkerSelector}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
              >
                <option value="">{t('chooseWorker') || 'Choose a worker...'}</option>
                {workers.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name || `${w.user?.firstName || ''} ${w.user?.lastName || ''}`.trim() || `Worker ${w.id?.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
              placeholder={t('additionalNotes') || 'Phone booking, special requests, etc...'}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#E7001E] text-white rounded-lg hover:bg-[#c70019] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('creating') || 'Creating...' : t('createBooking') || 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

