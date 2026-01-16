import React, { useState } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, Search } from 'lucide-react';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  businessId: string;
  onBookingCreated: () => void;
}

export const CreateBookingModal: React.FC<CreateBookingModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  businessId,
  onBookingCreated,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Calculate end time based on selected service duration
  const calculatedEndDate = selectedService 
    ? new Date(selectedDate.getTime() + selectedService.duration * 60000)
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

    setLoading(true);

    try {
      // Create booking with customer email (backend will handle customer lookup/creation)
      const bookingData: any = {
        serviceId,
        appointmentDate: selectedDate.toISOString(),
        notes,
        customerEmail, // Backend will find or create customer
      };
      
      await api.post('/bookings', bookingData);

      toast.success(`Booking created! Confirmation email sent to ${customerEmail}`);
      onBookingCreated();
      onClose();
      
      // Reset form
      setCustomerEmail('');
      setServiceId('');
      setSelectedService(null);
      setNotes('');
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking');
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
          {/* Selected Date/Time */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-[#330007] rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-900 mb-1">
              <Calendar className="h-5 w-5 text-[#E7001E]" />
              <span className="font-semibold">Selected Time:</span>
            </div>
            <p className="text-lg font-bold text-[#E7001E] ml-7">
              {selectedDate.toLocaleString()}
              {calculatedEndDate && (
                <span className="text-sm text-gray-600 ml-2">
                  → {calculatedEndDate.toLocaleTimeString()} ({durationMinutes} min)
                </span>
              )}
            </p>
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
                  {service.name} - {service.duration} min - ${service.price}
                </option>
              ))}
            </select>
          </div>

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

