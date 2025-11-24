import React, { useState } from 'react';
import { Plus, Trash2, Save, Clock, DollarSign, Settings, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';
import { GeometricSymbol } from '../components/GeometricSymbols';
import { MapAddressSelector } from '../components/MapAddressSelector';

type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox';

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
  customFields: FormField[];
}

interface WorkingHours {
  [key: string]: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  };
}

export const BusinessOnboarding: React.FC = () => {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('beauty_salon');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    saturday: { isOpen: false },
    sunday: { isOpen: false },
  });
  
  const [services, setServices] = useState<Service[]>([
    {
      id: crypto.randomUUID(),
      name: 'Basic Service',
      description: 'Standard service offering',
      price: 50,
      duration: 60,
      isActive: true,
      customFields: []
    }
  ]);
  
  const [fields, setFields] = useState<FormField[]>([
    { id: crypto.randomUUID(), label: 'Notes', type: 'textarea', required: false },
  ]);
  const [saving, setSaving] = useState(false);

  // Clear default text on first focus for better UX
  const [clearedOnce, setClearedOnce] = useState<Set<string>>(new Set());
  const clearOnFirstFocus = (key: string, clear: () => void) => () => {
    if (!clearedOnce.has(key)) {
      clear();
      setClearedOnce(prev => new Set(prev).add(key));
    }
  };

  const addField = (type: FieldType) => {
    const base: FormField = { id: crypto.randomUUID(), label: 'New Field', type, required: false };
    if (type === 'select') base.options = ['Option 1', 'Option 2'];
    setFields(prev => [...prev, base]);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const addService = () => {
    const newService: Service = {
      id: crypto.randomUUID(),
      name: 'New Service',
      description: '',
      price: 0,
      duration: 30,
      isActive: true,
      customFields: []
    };
    setServices(prev => [...prev, newService]);
  };

  const updateService = (id: string, patch: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const removeService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const updateWorkingHours = (day: string, patch: Partial<WorkingHours[string]>) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], ...patch }
    }));
  };

  const handleLocationSelect = (lat: number, lng: number, fullAddress: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(fullAddress);
    
    // Try to extract city, state, and zip from the full address
    const addressParts = fullAddress.split(',');
    if (addressParts.length >= 2) {
      setCity(addressParts[addressParts.length - 2]?.trim() || '');
      setState(addressParts[addressParts.length - 1]?.trim() || '');
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    // Required field validation
    if (!businessName.trim()) errors.push('Business name is required');
    if (!address.trim()) errors.push('Address is required');
    if (!city.trim()) errors.push('City is required');
    if (!state.trim()) errors.push('State is required');
    if (!phone.trim()) errors.push('Phone number is required');
    if (!latitude || !longitude) errors.push('Please select your location on the map');
    
    // Phone number validation
    if (phone.trim()) {
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phone.replace(/[\s\-()]/g, ''))) {
        errors.push('Please enter a valid phone number');
      }
    }
    
    // Email validation (if provided)
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
      }
    }
    
    // Website validation (if provided)
    if (website.trim()) {
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(website)) {
        errors.push('Website must start with http:// or https://');
      }
    }
    
    // Service validation
    if (services.length === 0) {
      errors.push('At least one service is required');
    } else {
      services.forEach((service, index) => {
        if (!service.name.trim()) {
          errors.push(`Service ${index + 1}: Name is required`);
        }
        if (service.price <= 0) {
          errors.push(`Service ${index + 1}: Price must be greater than 0`);
        }
        if (service.duration <= 0) {
          errors.push(`Service ${index + 1}: Duration must be greater than 0`);
        }
      });
    }
    
    return errors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]); // Show first error
      return;
    }
    setSaving(true);
    try {
      // 1) Create business
      const businessPayload = {
        name: businessName,
        description,
        category,
        address,
        city,
        state,
        zipCode,
        country: 'USA',
        phone,
        email,
        website,
        latitude,
        longitude,
        workingHours,
        customBookingFields: fields.map(({ id, ...rest }) => rest),
      };
      const businessRes = await api.post('/businesses', businessPayload);
      const business = businessRes.data;
      
      // 2) Create services
      for (const service of services) {
        if (service.name && service.price > 0) {
          await api.post('/services', {
            ...service,
            businessId: business.id,
            customFields: service.customFields.map(({ id, ...rest }) => rest),
          });
        }
      }
      
      // Show pending review notice
      toast.success('Business submitted! Review usually takes 30–60 minutes. You\'ll receive an email when it\'s approved.');
      // Show success screen instead of redirecting immediately
      setCurrentStep(5); // Add a success step
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return businessName.trim() && address.trim() && city.trim() && state.trim() && phone.trim() && latitude && longitude;
      case 2:
        return services.length > 0 && services.every(s => s.name.trim() && s.price > 0 && s.duration > 0);
      case 3:
        return true; // Working hours are optional
      case 4:
        return true; // Custom fields are optional
      default:
        return false;
    }
  };

  const steps = [
    { id: 1, title: 'Business Info', icon: Settings },
    { id: 2, title: 'Services', icon: DollarSign },
    { id: 3, title: 'Working Hours', icon: Clock },
    { id: 4, title: 'Booking Form', icon: Settings }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isCompleted ? 'bg-primary-600 border-primary-600 text-white' :
                  isActive ? 'border-primary-600 text-primary-600' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-primary-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    isCompleted ? 'bg-primary-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="card p-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <GeometricSymbol variant="diamond" size={60} strokeWidth={4} color="#f97316" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">{t('businessInfo')}</h2>
              <p className="text-gray-600 mt-2">{t('businessInfoDesc')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('businessNameOnboarding')} *</label>
                <input 
                  className="input w-full" 
                  placeholder={t('businessNameOnboarding')} 
                  value={businessName} 
                  onChange={e => setBusinessName(e.target.value)} 
                  onFocus={clearOnFirstFocus('businessName', () => setBusinessName(''))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('categoryOnboarding')} *</label>
                <select className="input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                  {['beauty_salon','tailor','mechanic','restaurant','fitness','healthcare','education','consulting','other'].map(c => (
                    <option key={c} value={c}>{c.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('descriptionOnboarding')}</label>
                <textarea 
                  className="input w-full h-24" 
                  placeholder={t('descriptionOnboarding')} 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  onFocus={clearOnFirstFocus('description', () => setDescription(''))}
                />
              </div>
              <div className="col-span-full">
                <MapAddressSelector
                  onLocationSelect={handleLocationSelect}
                  initialLat={latitude || undefined}
                  initialLng={longitude || undefined}
                  initialAddress={address}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('cityOnboarding')} *</label>
                <input 
                  className="input w-full" 
                  placeholder={t('cityOnboarding')} 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  onFocus={clearOnFirstFocus('city', () => setCity(''))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('stateOnboarding')} *</label>
                <input 
                  className="input w-full" 
                  placeholder={t('stateOnboarding')} 
                  value={state} 
                  onChange={e => setState(e.target.value)} 
                  onFocus={clearOnFirstFocus('state', () => setState(''))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('zipCodeOnboarding')}</label>
                <input 
                  className="input w-full" 
                  placeholder={t('zipCodeOnboarding')} 
                  value={zipCode} 
                  onChange={e => setZipCode(e.target.value)} 
                  onFocus={clearOnFirstFocus('zipCode', () => setZipCode(''))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('phoneOnboarding')} *</label>
                <input 
                  className="input w-full" 
                  placeholder={t('phoneOnboarding')} 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  onFocus={clearOnFirstFocus('phone', () => setPhone(''))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('emailOnboarding')}</label>
                <input 
                  className="input w-full" 
                  placeholder={t('emailOnboarding')} 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  onFocus={clearOnFirstFocus('email', () => setEmail(''))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('websiteOnboarding')}</label>
                <input 
                  className="input w-full" 
                  placeholder={t('websiteOnboarding')} 
                  value={website} 
                  onChange={e => setWebsite(e.target.value)} 
                  onFocus={clearOnFirstFocus('website', () => setWebsite(''))}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <GeometricSymbol variant="star" size={60} strokeWidth={4} color="#f97316" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">{t('servicesOnboarding')}</h2>
              <p className="text-gray-600 mt-2">{t('servicesDesc')}</p>
            </div>
            
            <div className="space-y-6">
              {services.map((service, index) => (
                <div key={service.id} className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Service {index + 1}</h3>
                    {services.length > 1 && (
                      <button 
                        className="text-red-600 hover:text-red-800"
                        onClick={() => removeService(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('serviceNameOnboarding')} *</label>
                      <input 
                        className="input w-full" 
                        placeholder={t('serviceNameOnboarding')} 
                        value={service.name} 
                        onChange={e => updateService(service.id, { name: e.target.value })} 
                        onFocus={clearOnFirstFocus(`service-name-${service.id}`, () => updateService(service.id, { name: '' }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('priceOnboarding')} *</label>
                      <input 
                        type="number" 
                        className="input w-full" 
                        placeholder="0.00" 
                        value={service.price} 
                        onChange={e => updateService(service.id, { price: parseFloat(e.target.value) || 0 })} 
                        onFocus={clearOnFirstFocus(`service-price-${service.id}`, () => updateService(service.id, { price: 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('durationOnboarding')} *</label>
                      <input 
                        type="number" 
                        className="input w-full" 
                        placeholder="30" 
                        value={service.duration} 
                        onChange={e => updateService(service.id, { duration: parseInt(e.target.value) || 30 })} 
                        onFocus={clearOnFirstFocus(`service-duration-${service.id}`, () => updateService(service.id, { duration: 0 }))}
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input 
                          type="checkbox" 
                          checked={service.isActive} 
                          onChange={e => updateService(service.id, { isActive: e.target.checked })} 
                        />
                        {t('activeOnboarding')}
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('descriptionOnboarding')}</label>
                    <textarea 
                      className="input w-full h-20" 
                      placeholder={t('descriptionOnboarding')} 
                      value={service.description} 
                      onChange={e => updateService(service.id, { description: e.target.value })} 
                      onFocus={clearOnFirstFocus(`service-description-${service.id}`, () => updateService(service.id, { description: '' }))}
                    />
                  </div>
                </div>
              ))}
              
              <button 
                className="btn btn-outline w-full" 
                onClick={addService}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('addAnotherService')}
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <GeometricSymbol variant="sun" size={60} strokeWidth={4} color="#f97316" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">{t('workingHours')}</h2>
              <p className="text-gray-600 mt-2">{t('workingHoursDesc')}</p>
            </div>
            
            <div className="space-y-4">
              {Object.entries(workingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={hours.isOpen} 
                        onChange={e => updateWorkingHours(day, { isOpen: e.target.checked })} 
                      />
                      <span className="font-medium capitalize">{t(day as any)}</span>
                    </label>
                  </div>
                  
                  {hours.isOpen && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        className="input w-32" 
                        value={hours.openTime || '09:00'} 
                        onChange={e => updateWorkingHours(day, { openTime: e.target.value })} 
                      />
                      <span>{t('to')}</span>
                      <input 
                        type="time" 
                        className="input w-32" 
                        value={hours.closeTime || '17:00'} 
                        onChange={e => updateWorkingHours(day, { closeTime: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <GeometricSymbol variant="cross" size={60} strokeWidth={4} color="#f97316" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">{t('bookingForm')}</h2>
              <p className="text-gray-600 mt-2">{t('bookingFormDesc')}</p>
            </div>
            
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input 
                      className="input" 
                      placeholder={t('fieldLabel')} 
                      value={field.label} 
                      onChange={e => updateField(field.id, { label: e.target.value })} 
                    />
                    <select 
                      className="input" 
                      value={field.type} 
                      onChange={e => updateField(field.id, { type: e.target.value as FieldType })}
                    >
                      {['text','number','textarea','select','checkbox'].map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input 
                        type="checkbox" 
                        checked={field.required} 
                        onChange={e => updateField(field.id, { required: e.target.checked })} 
                      />
                      {t('requiredOnboarding')}
                    </label>
                    <button 
                      className="btn btn-ghost btn-sm justify-self-end" 
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('removeOnboarding')}
                    </button>
                  </div>
                  
                  {field.type === 'select' && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-700 mb-2">{t('options')}</p>
                      <input
                        className="input w-full"
                        placeholder={t('options')}
                        value={(field.options || []).join(', ')}
                        onChange={e => updateField(field.id, { 
                          options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-outline btn-sm" onClick={() => addField('text')}>{t('textField')}</button>
                <button className="btn btn-outline btn-sm" onClick={() => addField('number')}>{t('numberField')}</button>
                <button className="btn btn-outline btn-sm" onClick={() => addField('textarea')}>{t('textarea')}</button>
                <button className="btn btn-outline btn-sm" onClick={() => addField('select')}>{t('selectOnboarding')}</button>
                <button className="btn btn-outline btn-sm" onClick={() => addField('checkbox')}>{t('checkbox')}</button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 text-center">
            <div className="mb-8">
              <GeometricSymbol variant="check" size={80} strokeWidth={4} color="#10b981" className="mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Business Submitted Successfully!</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-yellow-600 mr-3" />
                  <h3 className="text-xl font-semibold text-yellow-800">Pending Review</h3>
                </div>
                <p className="text-yellow-700 mb-4">
                  Your business <strong>{businessName}</strong> has been submitted for review.
                </p>
                <div className="text-sm text-yellow-600 space-y-2">
                  <p>• Review typically takes <strong>30-60 minutes</strong></p>
                  <p>• You'll receive an email notification when approved</p>
                  <p>• Your business will appear on the map once approved</p>
                  <p>• You can start accepting bookings after approval</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-4">
              <button 
                className="btn btn-primary"
                onClick={() => window.location.href = '/business-dashboard'}
              >
                Go to Dashboard
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => window.location.href = '/businesses'}
              >
                Browse Other Businesses
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button 
              className="btn btn-outline" 
              onClick={prevStep} 
              disabled={currentStep === 1}
            >
              {t('previous')}
            </button>
            
            <div className="flex gap-3">
              {currentStep < 4 ? (
                <button 
                  className="btn btn-primary" 
                  onClick={nextStep}
                  disabled={!isStepValid(currentStep)}
                >
                  {t('nextStep')}
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave} 
                  disabled={saving}
                >
                  {saving ? t('saving') : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('completeSetup')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessOnboarding;


