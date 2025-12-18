import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { businessService, serviceService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { GeometricSymbol } from '../components/GeometricSymbols';
import { Gift, Send, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export const BusinessSettings: React.FC = () => {
  const { t } = useI18n();
  const [maxBookings, setMaxBookings] = useState(2);
  const [isEditing, setIsEditing] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceFields, setServiceFields] = useState<any[]>([]);
  const [isEditingFields, setIsEditingFields] = useState<boolean>(false);

  const { data: business, isLoading, error } = useQuery(
    'my-business',
    () => businessService.getMyBusiness(),
    {
      select: (response) => response.data,
      onSuccess: (data) => {
        if (data) {
          setMaxBookings(data.maxBookingsPerUserPerDay || 2);
          setAutoAccept(!!data.autoAcceptBookings);
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
    (data: { maxBookingsPerUserPerDay: number; autoAcceptBookings: boolean }) =>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ maxBookingsPerUserPerDay: maxBookings, autoAcceptBookings: autoAccept });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
              className="btn btn-primary inline-block"
            >
              Go to Business Onboarding
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('businessSettings')}
          </h1>
          <p className="text-gray-600">{t('manageYourBusinessSettings')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 relative">
          <div className="absolute top-4 right-4 opacity-10">
            <GeometricSymbol variant="sun" size={40} strokeWidth={4} color="#f97316" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('bookingLimits')}
            </h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-outline btn-sm"
              >
                {t('edit')}
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setMaxBookings(business.maxBookingsPerUserPerDay);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={updateSettingsMutation.isLoading}
                  className="btn btn-primary btn-sm"
                >
                  {updateSettingsMutation.isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    t('save')
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('maxBookingsPerUserPerDay')}
              </label>
              <p className="text-sm text-gray-600 mb-4">
                {t('maxBookingsDescription')}
              </p>
              {isEditing ? (
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxBookings}
                  onChange={(e) => setMaxBookings(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              ) : (
                <div className="text-lg font-semibold text-gray-900">
                  {business.maxBookingsPerUserPerDay} {t('bookingsPerDay')}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={autoAccept}
                  onChange={(e) => setAutoAccept(e.target.checked)}
                  disabled={!isEditing}
                />
                {t('autoAcceptBookings') || 'Automatically accept booking requests'}
              </label>
              <p className="text-sm text-gray-600 mt-1">{t('autoAcceptHint') || 'If enabled, new booking requests are auto-confirmed.'}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    {t('important')}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>{t('bookingLimitInfo')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Booking Form (per service) */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t('bookingForm') || 'Booking Form'}</h2>
            <div className="flex gap-2">
              {!isEditingFields ? (
                <button onClick={() => setIsEditingFields(true)} className="btn btn-outline btn-sm">{t('edit') || 'Edit'}</button>
              ) : (
                <>
                  <button onClick={() => { const svc = (services||[]).find((s:any)=>s.id===selectedServiceId); setServiceFields(svc?.customFields||[]); setIsEditingFields(false); }} className="btn btn-ghost btn-sm">{t('cancel') || 'Cancel'}</button>
                  <button onClick={saveFields} className="btn btn-primary btn-sm">{t('save') || 'Save'}</button>
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
              <button className="btn btn-outline btn-sm" onClick={() => addField('text')}>{t('textField') || 'Text'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => addField('number')}>{t('numberField') || 'Number'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => addField('textarea')}>{t('textarea') || 'Textarea'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => addField('select')}>{t('selectOnboarding') || 'Select'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => addField('checkbox')}>{t('checkbox') || 'Checkbox'}</button>
            </div>
          )}
        </div>

        {/* Image Management */}
        <ImageManagementSection businessId={business.id} />

        {/* Team Management */}
        <TeamSection businessId={business.id} />

        {/* Promotional Offers */}
        <PromotionalOffersSection businessId={business.id} />

        {/* Contacts Management */}
        <ContactsSection businessId={business.id} />
      </div>
    </div>
  );
};

const TeamSection: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: members } = useQuery(
    ['business-members', businessId],
    () => businessService.listMembers(businessId),
    { select: (res) => res.data }
  );

  const inviteMutation = useMutation(
    (email: string) => businessService.inviteMember(businessId, email),
    {
      onSuccess: () => {
        toast.success(t('inviteSent') || 'Invite sent');
        setInviteEmail('');
        queryClient.invalidateQueries(['business-members', businessId]);
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to invite'); }
    }
  );

  const removeMutation = useMutation(
    (memberId: string) => businessService.removeMember(businessId, memberId),
    {
      onSuccess: () => {
        toast.success(t('memberRemoved') || 'Member removed');
        queryClient.invalidateQueries(['business-members', businessId]);
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to remove member'); }
    }
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('teamManagement') || 'Team Management'}</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder={t('inviteEmailPlaceholder') || 'staff@email.com'}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={() => inviteMutation.mutate(inviteEmail)}
          disabled={!inviteEmail || inviteMutation.isLoading}
          className="btn btn-primary"
        >
          {t('invite') || 'Invite'}
        </button>
      </div>

      <div className="divide-y border rounded">
        {(members || []).map((m: any) => (
          <div key={m.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium text-gray-900">{m.email}</div>
              <div className="text-sm text-gray-500 capitalize">{m.status}</div>
            </div>
            <button
              onClick={() => removeMutation.mutate(m.id)}
              className="btn btn-outline btn-sm text-red-600 border-red-600 hover:bg-red-50"
            >
              {t('remove') || 'Remove'}
            </button>
          </div>
        ))}
        {(!members || members.length === 0) && (
          <div className="p-4 text-gray-500">{t('noMembers') || 'No team members yet.'}</div>
        )}
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
    <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t('imageManagement') || 'Image Management'}</h2>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('uploadImages') || 'Upload Images'}
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
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100"
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
            <p className="text-gray-500">{t('noImages') || 'No images uploaded yet'}</p>
            <p className="text-sm text-gray-400 mt-1">
              {t('uploadImagesToShowcase') || 'Upload images to showcase your business'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const PromotionalOffersSection: React.FC<{ businessId: string }> = ({ businessId }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [validUntil, setValidUntil] = useState('');

  const { data: pastCustomers, isLoading: loadingCustomers } = useQuery(
    ['past-customers', businessId],
    () => businessService.getPastCustomers(businessId),
    { select: (res) => res.data || [], enabled: !!businessId }
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
        setShowForm(false);
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

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900">Promotional Offers</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary btn-sm"
        >
          {showForm ? 'Cancel' : 'Send Offer'}
        </button>
      </div>

      {showForm ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Customers ({selectedCustomers.length} selected)
            </label>
            {loadingCustomers ? (
              <div className="text-center py-4">Loading customers...</div>
            ) : pastCustomers && pastCustomers.length > 0 ? (
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {pastCustomers.length} past customer{pastCustomers.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={selectAll}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {selectedCustomers.length === pastCustomers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-2">
                  {pastCustomers.map((customer: any) => (
                    <label
                      key={customer.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => toggleCustomer(customer.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{customer.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 text-center text-gray-500">
                No past customers found. Customers who have completed bookings will appear here.
              </div>
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

          <button
            onClick={handleSend}
            disabled={sendOfferMutation.isLoading || !subject || !content || selectedCustomers.length === 0}
            className="btn btn-primary w-full"
          >
            {sendOfferMutation.isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Gift className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>Send special offers to customers who have visited your business.</p>
          <p className="text-sm mt-1">
            {pastCustomers?.length || 0} past customer{pastCustomers?.length !== 1 ? 's' : ''} available
          </p>
        </div>
      )}
    </div>
  );
};

const ContactsSection: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');

  const { data: contacts } = useQuery(
    ['business-contacts', businessId],
    () => businessService.listContacts(businessId),
    { select: (res) => res.data }
  );

  const addMutation = useMutation(
    () => businessService.addContact(businessId, email, name),
    {
      onSuccess: () => {
        toast.success(t('contactAdded') || 'Contact added');
        setEmail('');
        setName('');
        queryClient.invalidateQueries(['business-contacts', businessId]);
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to add contact'); }
    }
  );

  const deleteMutation = useMutation(
    (contactId: string) => businessService.removeContact(businessId, contactId),
    {
      onSuccess: () => {
        toast.success(t('contactRemoved') || 'Contact removed');
        queryClient.invalidateQueries(['business-contacts', businessId]);
      }
    }
  );

  const sendCampaignMutation = useMutation(
    () => businessService.sendCampaign(businessId, subject, html),
    {
      onSuccess: (res: any) => {
        toast.success((t('campaignQueued') || 'Campaign sent') + ` (${res.data.sent || 0}/${res.data.queued})`);
      },
      onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to send campaign'); }
    }
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('contacts') || 'Contacts'}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name') || 'Name'}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email') || 'Email'}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={() => addMutation.mutate()}
          disabled={!email}
          className="btn btn-primary"
        >
          {t('add') || 'Add'}
        </button>
      </div>

      <div className="divide-y border rounded mb-6">
        {(contacts || []).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium text-gray-900">{c.name || '-'}</div>
              <div className="text-sm text-gray-500">{c.email}</div>
            </div>
            <button onClick={() => deleteMutation.mutate(c.id)} className="btn btn-outline btn-sm text-red-600 border-red-600 hover:bg-red-50">
              {t('remove') || 'Remove'}
            </button>
          </div>
        ))}
        {(!contacts || contacts.length === 0) && (
          <div className="p-4 text-gray-500">{t('noContacts') || 'No contacts yet.'}</div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('sendCampaign') || 'Send Campaign'}</h3>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('subject') || 'Subject'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
        />
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={6}
          placeholder={t('campaignHtml') || 'HTML content...'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
        />
        <button
          onClick={() => sendCampaignMutation.mutate()}
          disabled={!subject || !html}
          className="btn btn-primary"
        >
          {t('send') || 'Send'}
        </button>
      </div>
    </div>
  );
};
