import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { serviceService, bookingService } from '../services/api';
import { Calendar, Clock, DollarSign, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const BookingForm: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: service, isLoading } = useQuery(
    ['service', serviceId],
    () => serviceService.getById(serviceId!),
    {
      enabled: !!serviceId,
      select: (response) => response.data,
    }
  );

  const { data: availableSlots } = useQuery(
    ['available-slots', serviceId, selectedDate],
    () => serviceService.getAvailableSlots(serviceId!, selectedDate),
    {
      enabled: !!serviceId && !!selectedDate,
      select: (response) => response.data,
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time');
      return;
    }

    setLoading(true);
    
    try {
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
      
      await bookingService.create({
        serviceId,
        appointmentDate: appointmentDateTime.toISOString(),
        notes,
      });
      
      toast.success('Booking created successfully!');
      navigate('/my-bookings');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Service not found</h2>
        <button onClick={() => navigate(-1)} className="btn btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="btn btn-ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      {/* Service Info */}
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Book Service</h1>
        
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {service.name}
            </h2>
            <p className="text-gray-600 mb-2">{service.business.name}</p>
            {service.description && (
              <p className="text-gray-600">{service.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600">
              {formatPrice(service.price)}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>{formatDuration(service.duration)}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>Payment required</span>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Select Date & Time</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedTime(''); // Reset time when date changes
            }}
            min={new Date().toISOString().split('T')[0]}
            className="input"
            required
          />
        </div>
        
        {selectedDate && availableSlots && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Times
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot: any, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedTime(slot.time.split('T')[1].substring(0, 5))}
                  disabled={!slot.available}
                  className={`p-3 text-sm rounded-lg border ${
                    selectedTime === slot.time.split('T')[1].substring(0, 5)
                      ? 'border-primary-600 bg-primary-50 text-primary-600'
                      : slot.available
                      ? 'border-gray-300 hover:border-primary-600 hover:bg-primary-50'
                      : 'border-gray-200 bg-primary-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {format(new Date(slot.time), 'h:mm a')}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input"
            placeholder="Any special requests or notes..."
          />
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(service.price)}
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading || !selectedDate || !selectedTime}
            className="btn btn-primary btn-lg"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Booking...
              </div>
            ) : (
              <>
                <Calendar className="h-5 w-5 mr-2" />
                Confirm Booking
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
