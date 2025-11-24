import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { serviceService, bookingService } from '../services/api';
import { Calendar, Clock, ArrowLeft, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';

interface CustomField {
  fieldName: string;
  fieldType: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
  isRequired: boolean;
  options?: string[];
}

export const BookingForm: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistNotes, setWaitlistNotes] = useState('');
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

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

  // Build a quick availability map for the selected date (30-min increments)
  const buildSchedule = () => {
    if (!selectedDate || !availableSlots) return [] as { time: string; available: boolean }[];
    
    // Use the actual available slots from backend
    const items: { time: string; available: boolean }[] = [];
    
    availableSlots.forEach((slot: any) => {
      items.push({ 
        time: slot.time, 
        available: slot.available 
      });
    });
    
    // Sort by time
    items.sort((a, b) => a.time.localeCompare(b.time));
    
    return items;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error(t('pleaseSelectDateAndTime'));
      return;
    }

    setLoading(true);
    
    try {
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
      
      // Validate required custom fields
      if (service.customFields && service.customFields.length > 0) {
        for (const field of service.customFields) {
          if (field.isRequired && !customFieldValues[field.fieldName]) {
            toast.error(`${t('pleaseFillRequiredField')}: ${field.fieldName}`);
            setLoading(false);
            return;
          }
        }
      }
      
      const response = await bookingService.create({
        serviceId,
        appointmentDate: appointmentDateTime.toISOString(),
        notes,
        customFieldValues: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : undefined,
        recurrenceEndDate: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
      });
      
      // Handle recurring bookings (array) or single booking
      const booking = Array.isArray(response.data) ? response.data[0] : response.data;
      const bookingId = booking?.id;
      
      if (bookingId) {
        // Redirect to confirmation page
        navigate(`/booking-confirmation/${bookingId}`);
      } else {
        toast.success(t('bookingCreatedSuccessfully'));
        navigate('/my-bookings');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('failedToCreateBooking'));
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('serviceNotFound')}</h2>
        <button onClick={() => navigate(-1)} className="btn btn-primary">
          {t('goBack')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="btn btn-ghost">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('back')}
      </button>

      {/* Service Info */}
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('bookService')}</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {service.name}
          </h2>
          <p className="text-gray-600 mb-2">{service.business.name}</p>
          {service.description && (
            <p className="text-gray-600">{service.description}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>{formatDuration(service.duration)}</span>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('selectDateAndTime')}</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('date')}
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('availableTimes')} ({buildSchedule().filter(s => s.available).length} {t('available') || 'available'})
              </label>
              {buildSchedule().filter(s => s.available).length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowWaitlist(!showWaitlist)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {t('joinWaitlist') || 'Join Waitlist'}
                </button>
              )}
            </div>
            
            {showWaitlist && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{t('joinWaitlist') || 'Join Waitlist'}</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {t('waitlistDescription') || 'Get notified when a slot becomes available for this service.'}
                </p>
                <textarea
                  value={waitlistNotes}
                  onChange={(e) => setWaitlistNotes(e.target.value)}
                  rows={2}
                  className="input mb-3"
                  placeholder={t('preferredDateOrNotes') || 'Preferred date or special notes (optional)'}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!service?.business?.id) return;
                      setJoiningWaitlist(true);
                      try {
                        await bookingService.joinWaitlist(
                          service.business.id,
                          serviceId!,
                          selectedDate || undefined,
                          waitlistNotes || undefined,
                        );
                        toast.success(t('waitlistJoined') || 'You have been added to the waitlist!');
                        setShowWaitlist(false);
                        setWaitlistNotes('');
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || t('failedToJoinWaitlist') || 'Failed to join waitlist');
                      } finally {
                        setJoiningWaitlist(false);
                      }
                    }}
                    disabled={joiningWaitlist}
                    className="btn btn-primary btn-sm"
                  >
                    {joiningWaitlist ? t('joining') || 'Joining...' : t('joinWaitlist') || 'Join Waitlist'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWaitlist(false);
                      setWaitlistNotes('');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-none overflow-visible">
              {buildSchedule().map((slot, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  className={`p-2 text-xs rounded-md border ${
                    selectedTime === slot.time
                      ? 'border-primary-600 bg-primary-50 text-primary-600'
                      : slot.available
                      ? 'border-gray-300 hover:border-primary-600 hover:bg-primary-50'
                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                  title={slot.available ? t('available') : t('unavailable')}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Custom Fields */}
        {service.customFields && service.customFields.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900">{t('additionalInformation')}</h3>
            {service.customFields.map((field: CustomField, index: number) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.fieldName}
                  {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.fieldType === 'text' && (
                  <input
                    type="text"
                    value={customFieldValues[field.fieldName] || ''}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.fieldName]: e.target.value
                    })}
                    className="input"
                    required={field.isRequired}
                  />
                )}
                
                {field.fieldType === 'number' && (
                  <input
                    type="number"
                    value={customFieldValues[field.fieldName] || ''}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.fieldName]: e.target.value
                    })}
                    className="input"
                    required={field.isRequired}
                  />
                )}
                
                {field.fieldType === 'textarea' && (
                  <textarea
                    value={customFieldValues[field.fieldName] || ''}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.fieldName]: e.target.value
                    })}
                    rows={3}
                    className="input"
                    required={field.isRequired}
                  />
                )}
                
                {field.fieldType === 'select' && field.options && (
                  <select
                    value={customFieldValues[field.fieldName] || ''}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.fieldName]: e.target.value
                    })}
                    className="input"
                    required={field.isRequired}
                  >
                    <option value="">{t('selectAnOption')}</option>
                    {field.options.map((option: string, optIndex: number) => (
                      <option key={optIndex} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                
                {field.fieldType === 'checkbox' && (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customFieldValues[field.fieldName] === true || customFieldValues[field.fieldName] === 'true'}
                      onChange={(e) => setCustomFieldValues({
                        ...customFieldValues,
                        [field.fieldName]: e.target.checked
                      })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      required={field.isRequired}
                    />
                    <span className="text-sm text-gray-700">{t('yes')}</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Recurring Booking Option */}
        <div className="pt-4 border-t">
          <label className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              {t('recurringBooking') || 'Make this a recurring booking'}
            </span>
          </label>
          
          {isRecurring && (
            <div className="ml-6 space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('repeatEvery') || 'Repeat every'}
                </label>
                <select
                  value={recurrencePattern}
                  onChange={(e) => setRecurrencePattern(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                  className="input"
                >
                  <option value="weekly">{t('weekly') || 'Weekly'}</option>
                  <option value="biweekly">{t('biweekly') || 'Bi-weekly'}</option>
                  <option value="monthly">{t('monthly') || 'Monthly'}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('repeatUntil') || 'Repeat until'}
                </label>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  min={selectedDate}
                  className="input"
                  required={isRecurring}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('additionalNotesOptional')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input"
            placeholder={t('anySpecialRequests')}
          />
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={loading || !selectedDate || !selectedTime}
            className="btn btn-primary btn-lg"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {t('booking')}
              </div>
            ) : (
              <>
                <Calendar className="h-5 w-5 mr-2" />
                {t('confirmBooking')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
