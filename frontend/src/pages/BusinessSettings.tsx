import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { businessService, serviceService, offerService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Gift, Send, Image as ImageIcon, Trash2, Upload, AlertTriangle, ChevronDown, Settings, FileText, Tag, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export const BusinessSettings: React.FC = () => {
  const { t } = useI18n();
  const [maxBookings, setMaxBookings] = useState(2);
  const [isEditing, setIsEditing] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [bookingAssignment, setBookingAssignment] = useState<'auto' | 'manual'>('auto');
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceFields, setServiceFields] = useState<any[]>([]);
  const [isEditingFields, setIsEditingFields] = useState<boolean>(false);

  // Business info edit states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    category: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  // Working hours edit states
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [workingHours, setWorkingHours] = useState<any>({});

  // Unsuspension request states
  const [showUnsuspendForm, setShowUnsuspendForm] = useState(false);
  const [unsuspendReason, setUnsuspendReason] = useState('');

  // Collapsible section state (match dashboard pattern)
  const [bookingSectionOpen, setBookingSectionOpen] = useState(false);
  const [formSectionOpen, setFormSectionOpen] = useState(false);
  const [imageSectionOpen, setImageSectionOpen] = useState(false);
  const [offersSectionOpen, setOffersSectionOpen] = useState(false);

  const { data: business, isLoading, error } = useQuery(
    'my-business',
    () => businessService.getMyBusiness(),
    {
      select: (response) => response.data,
      onSuccess: (data) => {
        if (data) {
          setMaxBookings(data.maxBookingsPerUserPerDay || 2);
          setAutoAccept(!!data.autoAcceptBookings);
          setBookingAssignment(data.bookingAssignment === 'manual' ? 'manual' : 'auto');

          // Populate business info
          setBusinessInfo({
            name: data.name || '',
            description: data.description || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            category: data.category || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
          });

          // Populate working hours
          setWorkingHours(data.workingHours || {
            monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            saturday: { isOpen: false },
            sunday: { isOpen: false },
          });
        }
      },
      onError: (err: any) => {
        console.error('Error fetching business:', err);
        if (err.response?.status === 404) {
          // Business not found - this is expected if not created yet
        } else {
          toast.error(err.response?.data?.message || t('failedToLoadBusinesses'));
        }
      },
      retry: false,
    }
  );

  // Load services for this business
  const { data: services, isLoading: servicesLoading, error: servicesError } = useQuery(
    ['business-services', business?.id],
    () => (business?.id ? serviceService.getByBusiness(String(business.id)) : Promise.resolve({ data: [] as any[] } as any)),
    {
      enabled: !!business?.id,
      select: (res) => res.data,
      onSuccess: (data: any[]) => {
        if (data?.length && !selectedServiceId) {
          setSelectedServiceId(data[0].id);
          setServiceFields(data[0].customFields || []);
        }
      },
      onError: (err: any) => {
        console.error('Error loading services:', err);
        toast.error(err?.response?.data?.message || t('errorLoadingServices'));
      },
    }
  );

  // Keep fields in sync when switching service
  const handleSelectService = (id: string) => {
    setSelectedServiceId(id);
    const svc = (services || []).find((s: any) => s.id === id);
    setServiceFields(svc?.customFields || []);
    setIsEditingFields(false);
  };

  // Field editors
  const addField = (type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox') => {
    setServiceFields([
      ...serviceFields,
      { id: Date.now().toString(), fieldName: '', fieldType: type, isRequired: false, options: type === 'select' ? ['Option 1'] : undefined },
    ]);
    setIsEditingFields(true);
  };

  const updateField = (idx: number, patch: any) => {
    setServiceFields(serviceFields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeField = (idx: number) => {
    setServiceFields(serviceFields.filter((_, i) => i !== idx));
  };

  const saveFields = async () => {
    if (!selectedServiceId) {
      toast.error('Please select a service');
      return;
    }

    // Validate fields before saving
    const invalidFields = serviceFields.filter(f => !f.fieldName || !f.fieldName.trim());
    if (invalidFields.length > 0) {
      toast.error('Please fill in all field names');
      return;
    }

    // Prepare payload - remove local-only ids and clean up data
    const payload = serviceFields
      .filter(f => f.fieldName && f.fieldName.trim()) // Remove empty fields
      .map(({ id, ...rest }) => {
        // Ensure options is an array for select fields, undefined for others
        const cleaned = { ...rest };
        if (cleaned.fieldType === 'select') {
          cleaned.options = Array.isArray(cleaned.options) ? cleaned.options : [];
        } else {
          // Remove options for non-select fields
          delete cleaned.options;
        }
        // Ensure isRequired is boolean
        cleaned.isRequired = !!cleaned.isRequired;
        return cleaned;
      });

    try {
      await serviceService.update(selectedServiceId, { customFields: payload });
      toast.success(t('settingsUpdated') || 'Settings updated successfully');
      setIsEditingFields(false);
      queryClient.invalidateQueries(['business-services', business?.id]);
      // Reload the service data to update the fields
      const svc = (services || []).find((s: any) => s.id === selectedServiceId);
      if (svc) {
        setServiceFields(payload);
      }
    } catch (e: any) {
      console.error('Error saving fields:', e);
      const errorMessage = e?.response?.data?.message || e?.message || t('updateFailed') || 'Failed to update';
      toast.error(errorMessage);
    }
  };

  const updateSettingsMutation = useMutation(
    (data: { maxBookingsPerUserPerDay: number; autoAcceptBookings: boolean; bookingAssignment?: 'auto' | 'manual' }) =>
      businessService.update(business?.id.toString() || '', data),
    {
      onSuccess: () => {
        toast.success(t('settingsUpdated'));
        setIsEditing(false);
        queryClient.invalidateQueries('my-business');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || t('updateFailed'));
      },
    }
  );

  const requestUnsuspensionMutation = useMutation(
    (reason: string) => businessService.requestUnsuspension(business?.id || '', reason),
    {
      onSuccess: () => {
        toast.success('Unsuspension request submitted successfully. An admin will review it shortly.');
        setShowUnsuspendForm(false);
        setUnsuspendReason('');
        queryClient.invalidateQueries('my-business');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to submit request');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      maxBookingsPerUserPerDay: maxBookings,
      autoAcceptBookings: autoAccept,
      bookingAssignment,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[#f9fafb] min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#dc2626]"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-[#f9fafb] min-h-[50vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('noBusinessFound')}
          </h2>
          <p className="text-gray-600 mb-4">{t('createBusinessFirst')}</p>
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Debug Info:</strong> {error instanceof Error ? error.message : t('unknownError')}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              To create a business, please complete the onboarding process:
            </p>
            <a
              href="/business-onboarding"
              className="inline-block rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#b91c1c]"
            >
              Go to Business Onboarding
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f9fafb] text-gray-900">
      <div className="w-full max-w-none px-2 sm:px-3 pt-8">
        {/* Header - match dashboard */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('businessSettings')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('manageYourBusinessSettings')}</p>
        </div>

        {/* Suspension Notice */}
        {business?.status === 'suspended' && (
          <div className="mb-6 rounded-lg border-2 border-red-300 bg-red-50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-red-900">Business Suspended</h2>
                <p className="text-sm text-red-700 mt-1">Your business is currently suspended and not visible to customers</p>
              </div>
            </div>
            {business?.unsuspensionRequestedAt ? (
              <div className="space-y-3">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <p className="text-yellow-800 font-semibold">⏳ Request Pending</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    You submitted an unsuspension request on {new Date(business.unsuspensionRequestedAt).toLocaleDateString()} at {new Date(business.unsuspensionRequestedAt).toLocaleTimeString()}.
                  </p>
                  {business.unsuspensionRequestReason && (
                    <p className="text-yellow-700 text-sm mt-2"><strong>Your reason:</strong> {business.unsuspensionRequestReason}</p>
                  )}
                  <p className="text-yellow-700 text-sm mt-2">An admin will review your request shortly. You can submit a new request after 24 hours.</p>
                </div>
              </div>
            ) : !showUnsuspendForm ? (
              <div className="space-y-3">
                <p className="text-gray-700">If you believe this suspension was made in error or you have resolved the issues, you can request unsuspension.</p>
                <button onClick={() => setShowUnsuspendForm(true)} className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#b91c1c]">
                  Request Unsuspension
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Unsuspension Request <span className="text-red-500">*</span></label>
                  <textarea
                    value={unsuspendReason}
                    onChange={(e) => setUnsuspendReason(e.target.value)}
                    rows={4}
                    placeholder="Please explain why your business should be unsuspended..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Be specific about what steps you've taken to address the suspension reason</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (!unsuspendReason.trim()) { toast.error('Please provide a reason for unsuspension'); return; } requestUnsuspensionMutation.mutate(unsuspendReason); }}
                    disabled={!unsuspendReason.trim() || requestUnsuspensionMutation.isLoading}
                    className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#b91c1c] disabled:opacity-50"
                  >
                    {requestUnsuspensionMutation.isLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button onClick={() => { setShowUnsuspendForm(false); setUnsuspendReason(''); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Booking Limits - collapsible */}
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setBookingSectionOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-5 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center justify-center rounded-lg bg-[#fee2e2] p-2">
                <Settings className="h-5 w-5 text-[#dc2626]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('bookingLimits')}</h3>
            </div>
            <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${bookingSectionOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${bookingSectionOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
            <div className="border-t border-gray-200 px-5 pb-6 pt-4">
              <div className="flex items-center justify-between mb-4">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    {t('edit')}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setIsEditing(false); setMaxBookings(business.maxBookingsPerUserPerDay); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      {t('cancel')}
                    </button>
                    <button onClick={handleSubmit} disabled={updateSettingsMutation.isLoading} className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#b91c1c] disabled:opacity-50">
                      {updateSettingsMutation.isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : t('save')}
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('maxBookingsPerUserPerDay')}</label>
                  <p className="text-sm text-gray-600 mb-2">{t('maxBookingsDescription')}</p>
                  {isEditing ? (
                    <input type="number" min="1" max="10" value={maxBookings} onChange={(e) => setMaxBookings(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                  ) : (
                    <div className="text-lg font-semibold text-gray-900">{business.maxBookingsPerUserPerDay} {t('bookingsPerDay')}</div>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={autoAccept} onChange={(e) => setAutoAccept(e.target.checked)} disabled={!isEditing} />
                    {t('Auto accept bookings') || 'Auto accept bookings'}
                  </label>
                </div>
                {(business?.businessType === 'personal_service' || !business?.businessType) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('assignBookings') || 'Assign bookings'}</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="bookingAssignment"
                          checked={bookingAssignment === 'auto'}
                          onChange={() => setBookingAssignment('auto')}
                          disabled={!isEditing}
                        />
                        {t('assignAuto') || 'Automatically distribute'}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="bookingAssignment"
                          checked={bookingAssignment === 'manual'}
                          onChange={() => setBookingAssignment('manual')}
                          disabled={!isEditing}
                        />
                        {t('assignManual') || 'I assign manually'}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {bookingAssignment === 'auto'
                        ? (t('assignAutoHint') || 'Bookings are distributed fairly among staff when auto-accept is on')
                        : (t('assignManualHint') || 'You assign each booking to an employee')}
                    </p>
                  </div>
                )}
                <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-sm font-medium text-blue-800">{t('important')}</h3>
                  <p className="mt-2 text-sm text-blue-700">{t('bookingLimitInfo')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form (Custom fields) - collapsible */}
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setFormSectionOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-5 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center justify-center rounded-lg bg-[#fee2e2] p-2">
                <FileText className="h-5 w-5 text-[#dc2626]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('bookingForm') || 'Booking Form'}</h3>
            </div>
            <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${formSectionOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${formSectionOpen ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <div className="border-t border-gray-200 px-5 pb-6 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  {!isEditingFields ? (
                    <button onClick={() => setIsEditingFields(true)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t('edit') || 'Edit'}</button>
                  ) : (
                    <>
                      <button onClick={() => { const svc = (services||[]).find((s:any)=>s.id===selectedServiceId); setServiceFields(svc?.customFields||[]); setIsEditingFields(false); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t('cancel') || 'Cancel'}</button>
                      <button onClick={saveFields} className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#b91c1c]">{t('save') || 'Save'}</button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <label className="md:col-span-2 text-sm text-gray-700">{t('serviceName') || 'Service'}</label>
            <select
              value={selectedServiceId}
              onChange={(e) => handleSelectService(e.target.value)}
              className="input md:col-span-1"
              disabled={servicesLoading || !services || services.length === 0}
            >
              {servicesLoading ? (
                <option value="">Loading...</option>
              ) : services && services.length > 0 ? (
                services.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              ) : (
                <option value="">No services available</option>
              )}
            </select>
          </div>

          {servicesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                {t('errorLoadingServices') || 'Error loading services'}: {servicesError instanceof Error ? servicesError.message : t('unknownError')}
              </p>
            </div>
          )}

          {!servicesLoading && services && services.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                No services found. Please add services first from your Business Dashboard.
              </p>
            </div>
          )}

          {/* Fields list */}
          <div className="space-y-4">
            {(serviceFields || []).map((field, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start border rounded p-3">
                <div className="md:col-span-2">
                  <label className="label">{t('fieldLabel') || 'Field label'}</label>
                  <input
                    type="text"
                    className="input"
                    value={field.fieldName}
                    onChange={(e) => updateField(idx, { fieldName: e.target.value })}
                    disabled={!isEditingFields}
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    className="input"
                    value={field.fieldType}
                    onChange={(e) => updateField(idx, { fieldType: e.target.value, options: e.target.value === 'select' ? (field.options || ['Option 1']) : undefined })}
                    disabled={!isEditingFields}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('requiredOnboarding') || 'Required'}</label>
                  <input
                    type="checkbox"
                    checked={!!field.isRequired}
                    onChange={(e) => updateField(idx, { isRequired: e.target.checked })}
                    disabled={!isEditingFields}
                  />
                </div>
                {field.fieldType === 'select' && (
                  <div className="md:col-span-2">
                    <label className="label">{t('options') || 'Options (comma separated)'}</label>
                    <input
                      type="text"
                      className="input"
                      value={(field.options || []).join(', ')}
                      onChange={(e) => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      disabled={!isEditingFields}
                    />
                  </div>
                )}
                {isEditingFields && (
                  <div className="flex justify-end md:col-span-6">
                    <button onClick={() => removeField(idx)} className="btn btn-ghost btn-sm">{t('removeOnboarding') || 'Remove'}</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isEditingFields && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => addField('text')}>{t('textField') || 'Text'}</button>
              <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => addField('number')}>{t('numberField') || 'Number'}</button>
              <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => addField('textarea')}>{t('textarea') || 'Textarea'}</button>
              <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => addField('select')}>{t('selectOnboarding') || 'Select'}</button>
              <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => addField('checkbox')}>{t('checkbox') || 'Checkbox'}</button>
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Image Management - collapsible */}
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setImageSectionOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-5 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center justify-center rounded-lg bg-[#fee2e2] p-2">
                <ImageIcon className="h-5 w-5 text-[#dc2626]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('Image Management') || 'Image Management'}</h3>
            </div>
            <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${imageSectionOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${imageSectionOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
            <div className="border-t border-gray-200 px-5 pb-6 pt-4">
              <ImageManagementSection businessId={business.id} />
            </div>
          </div>
        </div>

        {/* Promotional Offers - collapsible */}
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setOffersSectionOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-5 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center justify-center rounded-lg bg-[#fee2e2] p-2">
                <Gift className="h-5 w-5 text-[#dc2626]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Promotional Offers</h3>
            </div>
            <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${offersSectionOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${offersSectionOpen ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <div className="border-t border-gray-200 px-5 pb-6 pt-4">
              <PromotionalOffersSection businessId={business.id} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const ImageManagementSection: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const { data: business } = useQuery(
    ['business', businessId],
    () => businessService.getById(businessId),
    { select: (res) => res.data }
  );

  const uploadMutation = useMutation(
    (files: FileList) => businessService.uploadImages(businessId, files),
    {
      onSuccess: () => {
        toast.success('Images uploaded successfully!');
        setSelectedFiles(null);
        queryClient.invalidateQueries(['business', businessId]);
        queryClient.invalidateQueries('my-business');
      },
      onError: (e: any) => {
        toast.error(e.response?.data?.message || 'Failed to upload images');
      },
    }
  );

  const deleteMutation = useMutation(
    (imageIndex: number) => businessService.deleteImage(businessId, imageIndex),
    {
      onSuccess: () => {
        toast.success('Image deleted successfully!');
        queryClient.invalidateQueries(['business', businessId]);
        queryClient.invalidateQueries('my-business');
      },
      onError: (e: any) => {
        toast.error(e.response?.data?.message || 'Failed to delete image');
      },
    }
  );

  const handleUpload = () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select images to upload');
      return;
    }
    uploadMutation.mutate(selectedFiles);
  };

  return (
    <div>
      {/* Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('Upload Images') || 'Upload Images'}
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Upload up to 10 images (max 5MB each). Supported formats: JPEG, PNG, GIF, WebP
        </p>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setSelectedFiles(e.target.files)}
            className="flex-1 block text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-accent-50 file:text-accent-700
              hover:file:bg-accent-100"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFiles || uploadMutation.isLoading}
            className="btn btn-primary"
          >
            {uploadMutation.isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('upload') || 'Upload'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {t('currentImages') || 'Current Images'} ({business?.images?.length || 0}/10)
        </h3>
        {business?.images && business.images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {business.images.map((image: string, index: number) => (
              <div key={index} className="relative group">
                <img
                  src={`${image.startsWith('http') ? '' : API_BASE_URL}${image}`}
                  alt={`Business image ${index + 1}`}
                  className="w-full h-40 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                  }}
                />
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this image?')) {
                      deleteMutation.mutate(index);
                    }
                  }}
                  disabled={deleteMutation.isLoading}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">{t('No images') || 'No images uploaded yet'}</p>
            <p className="text-sm text-gray-400 mt-1">
              {t('Upload images to showcase') || 'Upload images to showcase your business'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const PromotionalOffersSection: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [validUntil, setValidUntil] = useState('');

  const { data: businessOffers = [], isLoading: loadingOffers } = useQuery(
    ['business-offers', businessId],
    () => offerService.getBusinessOffers(businessId),
    { select: (res) => res.data || [], enabled: !!businessId }
  );

  const {
    data: pastCustomers,
    isLoading: loadingCustomers,
    isError: pastCustomersError,
    error: pastCustomersErr,
    refetch: refetchPastCustomers,
  } = useQuery(
    ['past-customers', businessId],
    () => businessService.getPastCustomers(businessId),
    { select: (res) => res.data || [], enabled: !!businessId && showCreateForm, retry: false }
  );

  const sendOfferMutation = useMutation(
    (data: {
      customerIds: string[];
      subject: string;
      content: string;
      offerCode?: string;
      discount?: number;
      validUntil?: string;
    }) => businessService.sendPromotionalOffer(businessId, data),
    {
      onSuccess: () => {
        toast.success('Promotional offers sent successfully!');
        setSelectedCustomers([]);
        setSubject('');
        setContent('');
        setOfferCode('');
        setDiscount('');
        setValidUntil('');
        queryClient.invalidateQueries('messages');
      },
      onError: (e: any) => {
        toast.error(e.response?.data?.message || 'Failed to send promotional offers');
      },
    }
  );

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAll = () => {
    if (selectedCustomers.length === pastCustomers?.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(pastCustomers?.map((c: any) => c.id) || []);
    }
  };

  const handleSend = () => {
    if (!subject || !content || selectedCustomers.length === 0) {
      toast.error('Please fill in all required fields and select at least one customer');
      return;
    }
    sendOfferMutation.mutate({
      customerIds: selectedCustomers,
      subject,
      content,
      offerCode: offerCode || undefined,
      discount: discount ? Number(discount) : undefined,
      validUntil: validUntil || undefined,
    });
  };

  const currentOffers = (businessOffers as any[]).filter(
    (o: any) => o.isActive && (!o.validUntil || new Date(o.validUntil) > new Date())
  );
  const previousOffers = (businessOffers as any[]).filter(
    (o: any) => !o.isActive || (o.validUntil && new Date(o.validUntil) <= new Date())
  );

  if (showCreateForm) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setShowCreateForm(false)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <ChevronDown className="h-4 w-4 rotate-90" /> Back to offers
          </button>
        </div>
        <div ref={customerDropdownRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Customers</label>
            {loadingCustomers ? (
              <div className="text-center py-4">Loading customers...</div>
            ) : pastCustomersError ? (
              <div className="py-4 text-center">
                <p className="text-sm text-red-600 mb-2">
                  {(pastCustomersErr as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to load customers.'}
                </p>
                <button
                  type="button"
                  onClick={() => refetchPastCustomers()}
                  className="text-sm font-medium text-[#dc2626] hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : pastCustomers && pastCustomers.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setCustomerDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent"
                >
                  <span className="text-sm text-gray-700 truncate">
                    Select Customer{selectedCustomers.length > 0 ? ` (${selectedCustomers.length})` : ''}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {customerDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                    <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={pastCustomers.length > 0 && selectedCustomers.length === pastCustomers.length}
                        onChange={() => selectAll()}
                        className="h-4 w-4 rounded border-gray-300 text-[#dc2626] focus:ring-[#dc2626]"
                      />
                      <span className="text-sm font-medium text-gray-900">Select all ({pastCustomers.length} customers)</span>
                    </label>
                    {pastCustomers.map((customer: any) => (
                      <label
                        key={customer.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => toggleCustomer(customer.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#dc2626] focus:ring-[#dc2626] shrink-0"
                        />
                        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {customer.firstName || '—'}
                          </span>
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {customer.lastName || '—'}
                          </span>
                          <span className="text-sm text-gray-600 truncate" title={customer.email}>
                            {customer.email || '—'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="py-4 text-center text-sm text-gray-500">
                No customers found. People who have made a reservation (pending, confirmed, or completed) at this business will appear here.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Special 20% Off This Weekend!"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Write your promotional message here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offer Code (optional)
              </label>
              <input
                type="text"
                value={offerCode}
                onChange={(e) => setOfferCode(e.target.value)}
                placeholder="e.g., SAVE20"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount % (optional)
              </label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g., 20"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid Until (optional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <button
              onClick={handleSend}
              disabled={sendOfferMutation.isLoading || !subject || !content || selectedCustomers.length === 0}
              className="btn btn-primary w-full py-2.5 px-4"
            >
              {sendOfferMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send offer
                </>
              )}
            </button>
          </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreateForm(true)}
        className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#b91c1c] flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Create offer
      </button>
      {loadingOffers ? (
        <div className="text-center py-6">Loading offers...</div>
      ) : (
        <>
          {currentOffers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Current offers</h3>
              <div className="space-y-2">
                {currentOffers.map((offer: any) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-[#dc2626]" />
                      <div>
                        <p className="font-medium text-gray-900">{offer.title}</p>
                        <p className="text-sm text-gray-600 truncate max-w-[200px]">{offer.description}</p>
                        {offer.discountPercentage && (
                          <span className="text-xs text-[#dc2626] font-medium">{offer.discountPercentage}% off</span>
                        )}
                        {offer.discountAmount && (
                          <span className="text-xs text-[#dc2626] font-medium">{formatPrice(Number(offer.discountAmount || 0))} off</span>
                        )}
                      </div>
                    </div>
                    {offer.validUntil && (
                      <span className="text-xs text-gray-500">
                        Valid until {new Date(offer.validUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {previousOffers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Previous offers</h3>
              <div className="space-y-2">
                {previousOffers.map((offer: any) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-700">{offer.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">{offer.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {offer.validUntil && new Date(offer.validUntil) <= new Date()
                        ? `Expired ${new Date(offer.validUntil).toLocaleDateString()}`
                        : !offer.isActive
                        ? 'Inactive'
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {currentOffers.length === 0 && previousOffers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Gift className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No offers yet.</p>
              <p className="text-sm mt-1">Click &quot;Create offer&quot; to send a promotional offer to your customers.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
