import React, { useState } from 'react';
import { Plus, Trash2, Save, Clock, DollarSign, Settings, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';
import { GeometricSymbol } from '../components/GeometricSymbols';
import { MapAddressSelector } from '../components/MapAddressSelector';
import { generateUUID } from '../utils/uuid';

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
  maxBookingsPerCustomerPerDay?: number;
  maxBookingsPerCustomerPerWeek?: number;
  bookingCooldownHours?: number;
  allowMultipleActiveBookings?: boolean;
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
  const [countdown, setCountdown] = useState(5);
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
  const [priceRange, setPriceRange] = useState<string>('moderate');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [country, setCountry] = useState<string>('USA');
  const [countryCode, setCountryCode] = useState<string>('US');

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
      id: generateUUID(),
      name: 'Basic Service',
      description: 'Standard service offering',
      price: 50,
      duration: 60,
      isActive: true,
      customFields: []
    }
  ]);
  
  const [fields, setFields] = useState<FormField[]>([
    { id: generateUUID(), label: 'Notes', type: 'textarea', required: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto-redirect to dashboard after success
  React.useEffect(() => {
    if (currentStep === 5 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (currentStep === 5 && countdown === 0) {
      window.location.href = '/business-dashboard';
    }
  }, [currentStep, countdown]);

  // Clear default text on first focus for better UX
  const [clearedOnce, setClearedOnce] = useState<Set<string>>(new Set());
  const clearOnFirstFocus = (key: string, clear: () => void) => () => {
    if (!clearedOnce.has(key)) {
      clear();
      setClearedOnce(prev => new Set(prev).add(key));
    }
  };

  const addField = (type: FieldType) => {
    const base: FormField = { id: generateUUID(), label: 'New Field', type, required: false };
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
      id: generateUUID(),
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

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleLocationSelect = (lat: number, lng: number, fullAddress: string, details?: any) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(fullAddress);
    
    // Extract address details from the geocoding response
    if (details) {
      if (details.postalCode) {
        setZipCode(details.postalCode);
      }
      if (details.city) {
        setCity(details.city);
      }
      if (details.state) {
        setState(details.state);
      }
      if (details.country) {
        setCountry(details.country);
      }
      if (details.countryCode) {
        setCountryCode(details.countryCode);
      }
    } else {
      // Fallback: Try to extract city, state, and zip from the full address string
      const addressParts = fullAddress.split(',');
      if (addressParts.length >= 2) {
        setCity(addressParts[addressParts.length - 2]?.trim() || '');
        setState(addressParts[addressParts.length - 1]?.trim() || '');
      }
      
      // Try to extract postal code from address string (common formats)
      const zipMatch = fullAddress.match(/\b\d{4,6}(-\d{4})?\b/);
      if (zipMatch) {
        setZipCode(zipMatch[0]);
      }
    }
  };

  // Validate a specific step and return detailed error messages
  const validateStep = (step: number): { isValid: boolean; errors: string[]; fieldErrors: Record<string, string> } => {
    const errors: string[] = [];
    const fieldErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Business Info
        if (!businessName.trim()) {
          errors.push('Business name is required');
          fieldErrors.businessName = 'Business name is required';
        } else if (businessName.trim().length < 2) {
          errors.push('Business name must be at least 2 characters');
          fieldErrors.businessName = 'Business name must be at least 2 characters';
        }

        if (!address.trim()) {
          errors.push('Address is required');
          fieldErrors.address = 'Address is required';
        } else if (address.trim().length < 5) {
          errors.push('Please enter a complete address');
          fieldErrors.address = 'Please enter a complete address (at least 5 characters)';
        }

        if (!city.trim()) {
          errors.push('City is required');
          fieldErrors.city = 'City is required';
        } else if (city.trim().length < 2) {
          errors.push('City name must be at least 2 characters');
          fieldErrors.city = 'City name must be at least 2 characters';
        }

        if (!state.trim()) {
          errors.push('State is required');
          fieldErrors.state = 'State is required';
        } else if (state.trim().length < 2) {
          errors.push('State must be at least 2 characters');
          fieldErrors.state = 'State must be at least 2 characters';
        }

        // Postal code validation based on country
        if (!zipCode.trim()) {
          errors.push('Postal code is required');
          fieldErrors.zipCode = 'Postal code is required';
        } else {
          // Country-specific postal code validation
          const postalCode = zipCode.trim();
          let isValid = false;
          let errorMessage = '';
          
          switch (countryCode.toUpperCase()) {
            case 'US':
              // US ZIP: 5 digits or 5+4 format
              isValid = /^\d{5}(-\d{4})?$/.test(postalCode);
              errorMessage = 'ZIP code must be 5 digits (or 9 digits with dash: 12345-6789)';
              break;
            case 'CA':
              // Canadian postal code: A1A 1A1 format
              isValid = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(postalCode);
              errorMessage = 'Canadian postal code must be in format A1A 1A1';
              break;
            case 'GB':
            case 'UK':
              // UK postcode: Various formats
              isValid = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(postalCode);
              errorMessage = 'UK postcode must be in format SW1A 1AA';
              break;
            case 'AU':
              // Australian postcode: 4 digits
              isValid = /^\d{4}$/.test(postalCode);
              errorMessage = 'Australian postcode must be 4 digits';
              break;
            case 'DE':
              // German postcode: 5 digits
              isValid = /^\d{5}$/.test(postalCode);
              errorMessage = 'German postcode must be 5 digits';
              break;
            case 'FR':
              // French postcode: 5 digits
              isValid = /^\d{5}$/.test(postalCode);
              errorMessage = 'French postcode must be 5 digits';
              break;
            case 'IT':
              // Italian postcode: 5 digits
              isValid = /^\d{5}$/.test(postalCode);
              errorMessage = 'Italian postcode must be 5 digits';
              break;
            case 'ES':
              // Spanish postcode: 5 digits
              isValid = /^\d{5}$/.test(postalCode);
              errorMessage = 'Spanish postcode must be 5 digits';
              break;
            case 'NL':
              // Dutch postcode: 4 digits, space, 2 letters
              isValid = /^\d{4}\s?[A-Z]{2}$/i.test(postalCode);
              errorMessage = 'Dutch postcode must be in format 1234 AB';
              break;
            case 'BR':
              // Brazilian CEP: 5 digits, dash, 3 digits
              isValid = /^\d{5}-?\d{3}$/.test(postalCode);
              errorMessage = 'Brazilian CEP must be in format 12345-678';
              break;
            case 'IN':
              // Indian PIN: 6 digits
              isValid = /^\d{6}$/.test(postalCode);
              errorMessage = 'Indian PIN must be 6 digits';
              break;
            case 'JP':
              // Japanese postal code: 3 digits, dash, 4 digits
              isValid = /^\d{3}-?\d{4}$/.test(postalCode);
              errorMessage = 'Japanese postal code must be in format 123-4567';
              break;
            default:
              // For other countries, accept any non-empty value (no strict validation)
              isValid = postalCode.length >= 2 && postalCode.length <= 20;
              errorMessage = 'Please enter a valid postal code for your country';
          }
          
          if (!isValid) {
            errors.push(errorMessage);
            fieldErrors.zipCode = errorMessage;
          }
        }

        if (!phone.trim()) {
          errors.push('Phone number is required');
          fieldErrors.phone = 'Phone number is required';
        } else {
          // Remove all non-digit characters except +
          const cleanedPhone = phone.replace(/[\s\-().]/g, '');
          // Check if it's a valid phone number (10 digits for US, or 11 with country code)
          if (cleanedPhone.startsWith('+')) {
            // International format: + followed by 10-15 digits
            const intlRegex = /^\+[1-9]\d{9,14}$/;
            if (!intlRegex.test(cleanedPhone)) {
              errors.push('Phone number must be in international format: +1234567890 (10-15 digits after +)');
              fieldErrors.phone = 'Phone number must be in international format: +1234567890 (10-15 digits after +)';
            }
          } else {
            // US format: exactly 10 digits
            const usRegex = /^\d{10}$/;
            if (!usRegex.test(cleanedPhone)) {
              errors.push('Phone number must be exactly 10 digits (e.g., 1234567890)');
              fieldErrors.phone = 'Phone number must be exactly 10 digits (e.g., 1234567890)';
            }
          }
        }

        // Email validation (if provided)
        if (email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push('Please enter a valid email address (e.g., example@domain.com)');
            fieldErrors.email = 'Please enter a valid email address (e.g., example@domain.com)';
          }
        }

        // Website validation (if provided)
        if (website.trim()) {
          const urlRegex = /^https?:\/\/.+/;
          if (!urlRegex.test(website)) {
            errors.push('Website must start with http:// or https:// (e.g., https://example.com)');
            fieldErrors.website = 'Website must start with http:// or https:// (e.g., https://example.com)';
          }
        }

        if (!latitude || !longitude) {
          errors.push('Please select your business location on the map');
          fieldErrors.location = 'Please select your business location on the map';
        }
        break;

      case 2: // Services
        if (services.length === 0) {
          errors.push('At least one service is required');
        } else {
          services.forEach((service, index) => {
            const serviceNum = index + 1;
            if (!service.name.trim()) {
              errors.push(`Service ${serviceNum}: Name is required`);
              fieldErrors[`service_${index}_name`] = 'Service name is required';
            } else if (service.name.trim().length < 2) {
              errors.push(`Service ${serviceNum}: Name must be at least 2 characters`);
              fieldErrors[`service_${index}_name`] = 'Service name must be at least 2 characters';
            }

            if (service.price <= 0) {
              errors.push(`Service ${serviceNum}: Price must be greater than $0`);
              fieldErrors[`service_${index}_price`] = 'Price must be greater than $0';
            } else if (service.price > 100000) {
              errors.push(`Service ${serviceNum}: Price cannot exceed $100,000`);
              fieldErrors[`service_${index}_price`] = 'Price cannot exceed $100,000';
            }

            if (service.duration <= 0) {
              errors.push(`Service ${serviceNum}: Duration must be greater than 0 minutes`);
              fieldErrors[`service_${index}_duration`] = 'Duration must be greater than 0 minutes';
            } else if (service.duration > 1440) {
              errors.push(`Service ${serviceNum}: Duration cannot exceed 1440 minutes (24 hours)`);
              fieldErrors[`service_${index}_duration`] = 'Duration cannot exceed 1440 minutes (24 hours)';
            }
          });
        }
        break;

      case 3: // Working Hours - optional, no validation needed
        break;

      case 4: // Custom Fields - optional, no validation needed
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors,
    };
  };

  // Legacy validateForm for final save (validates all steps)
  const validateForm = () => {
    const allErrors: string[] = [];
    for (let step = 1; step <= 4; step++) {
      const { errors } = validateStep(step);
      allErrors.push(...errors);
    }
    return allErrors;
  };

  const handleSave = async () => {
    // Validate all steps before saving
    const allFieldErrors: Record<string, string> = {};
    const allErrors: string[] = [];
    
    for (let step = 1; step <= 4; step++) {
      const validation = validateStep(step);
      allErrors.push(...validation.errors);
      Object.assign(allFieldErrors, validation.fieldErrors);
    }
    
    if (allErrors.length > 0) {
      // Show all validation errors
      allErrors.forEach((error, index) => {
        if (index === 0) {
          toast.error(error, { duration: 4000 });
        } else {
          setTimeout(() => {
            toast.error(error, { duration: 3000 });
          }, index * 100);
        }
      });
      
      // Set field errors for display
      setFieldErrors(allFieldErrors);
      
      // Scroll to first step with errors
      if (allFieldErrors.businessName || allFieldErrors.address || allFieldErrors.phone) {
        setCurrentStep(1);
      } else if (Object.keys(allFieldErrors).some(key => key.startsWith('service_'))) {
        setCurrentStep(2);
      }
      
      return;
    }
    
    // Clear field errors if validation passes
    setFieldErrors({});
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
        country: country,
        phone,
        email,
        website,
        latitude,
        longitude,
        priceRange,
        amenities,
        workingHours,
        customBookingFields: fields.map(({ id, ...rest }) => rest),
      };
      const businessRes = await api.post('/businesses', businessPayload);
      const business = businessRes.data;

      // 2) Upload images if any were selected
      if (selectedImages.length > 0) {
        try {
          const { businessService } = await import('../services/api');
          await businessService.uploadImages(business.id, selectedImages);
        } catch (error) {
          console.error('Failed to upload images:', error);
          toast.error('Business created but some images failed to upload');
        }
      }

      // 3) Create services
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

      // Update localStorage to reflect the new business owner role
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.role = 'business_owner';
      localStorage.setItem('user', JSON.stringify(user));

      // Show success screen instead of redirecting immediately
      setCurrentStep(5); // Add a success step
    } catch (e: any) {
      console.error('Business creation error:', e);
      toast.error(e.response?.data?.message || 'Failed to save business. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep >= 4) return;

    // Validate current step before proceeding
    const validation = validateStep(currentStep);
    
    if (!validation.isValid) {
      // Show all validation errors
      validation.errors.forEach((error, index) => {
        if (index === 0) {
          // Show first error as main toast
          toast.error(error, { duration: 4000 });
        } else {
          // Show additional errors after a short delay
          setTimeout(() => {
            toast.error(error, { duration: 3000 });
          }, index * 100);
        }
      });
      
      // Set field errors for display
      setFieldErrors(validation.fieldErrors);
      return;
    }

    // Clear field errors if validation passes
    setFieldErrors({});
    
    // Proceed to next step
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const isStepValid = (step: number) => {
    const validation = validateStep(step);
    return validation.isValid;
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
            
            {/* Validation Summary */}
            {Object.keys(fieldErrors).length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      Please fix the following issues before continuing:
                    </h3>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                      {Object.entries(fieldErrors).map(([field, error]) => (
                        <li key={field}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('businessNameOnboarding')} *</label>
                <input 
                  className={`input w-full ${fieldErrors.businessName ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder={t('businessNameOnboarding')} 
                  value={businessName} 
                  onChange={e => {
                    setBusinessName(e.target.value);
                    // Clear error when user starts typing
                    if (fieldErrors.businessName) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.businessName;
                        return next;
                      });
                    }
                  }}
                  onFocus={clearOnFirstFocus('businessName', () => setBusinessName(''))}
                />
                {fieldErrors.businessName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.businessName}</p>
                )}
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Images</label>
                <p className="text-sm text-gray-500 mb-2">Upload up to 10 images (max 5MB each)</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length + selectedImages.length > 10) {
                      toast.error('Maximum 10 images allowed');
                      return;
                    }
                    setSelectedImages([...selectedImages, ...files]);
                  }}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100"
                />
                {selectedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-full">
                <MapAddressSelector
                  onLocationSelect={handleLocationSelect}
                  initialLat={latitude || undefined}
                  initialLng={longitude || undefined}
                  initialAddress={address}
                />
                {fieldErrors.location && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <input 
                  className={`input w-full ${fieldErrors.address ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Street address" 
                  value={address} 
                  onChange={e => {
                    setAddress(e.target.value);
                    if (fieldErrors.address) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.address;
                        return next;
                      });
                    }
                  }}
                  onFocus={clearOnFirstFocus('address', () => setAddress(''))}
                />
                {fieldErrors.address && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.address}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('cityOnboarding')} *</label>
                <input 
                  className={`input w-full ${fieldErrors.city ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder={t('cityOnboarding')} 
                  value={city} 
                  onChange={e => {
                    setCity(e.target.value);
                    if (fieldErrors.city) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.city;
                        return next;
                      });
                    }
                  }}
                  onFocus={clearOnFirstFocus('city', () => setCity(''))}
                />
                {fieldErrors.city && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('stateOnboarding')} *</label>
                <input 
                  className={`input w-full ${fieldErrors.state ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder={t('stateOnboarding')} 
                  value={state} 
                  onChange={e => {
                    setState(e.target.value);
                    if (fieldErrors.state) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.state;
                        return next;
                      });
                    }
                  }}
                  onFocus={clearOnFirstFocus('state', () => setState(''))}
                />
                {fieldErrors.state && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.state}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code *</label>
                <input 
                  className={`input w-full ${fieldErrors.zipCode ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Postal Code (auto-filled from map)" 
                  value={zipCode} 
                  onChange={e => {
                    setZipCode(e.target.value);
                    if (fieldErrors.zipCode) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.zipCode;
                        return next;
                      });
                    }
                  }}
                  onFocus={clearOnFirstFocus('zipCode', () => setZipCode(''))}
                />
                {fieldErrors.zipCode && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.zipCode}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('phoneOnboarding')} *</label>
                <input 
                  className={`input w-full ${fieldErrors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="1234567890 or +1234567890" 
                  value={phone} 
                  onChange={e => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.phone;
                        return next;
                      });
                    }
                  }}
                  onFocus={clearOnFirstFocus('phone', () => setPhone(''))}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                )}
                {!fieldErrors.phone && (
                  <p className="mt-1 text-xs text-gray-500">Enter 10 digits (e.g., 1234567890) or international format with +</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('emailOnboarding')}</label>
                <input 
                  className={`input w-full ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder={t('emailOnboarding')} 
                  value={email} 
                  onChange={e => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.email;
                        return next;
                      });
                    }
                  }}
                  onFocus={clearOnFirstFocus('email', () => setEmail(''))}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('websiteOnboarding')}</label>
                <input
                  className={`input w-full ${fieldErrors.website ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="https://example.com"
                  value={website}
                  onChange={e => {
                    setWebsite(e.target.value);
                    if (fieldErrors.website) {
                      setFieldErrors(prev => {
                        const next = { ...prev };
                        delete next.website;
                        return next;
                      });
                    }
                  }}
                  onFocus={clearOnFirstFocus('website', () => setWebsite(''))}
                />
                {fieldErrors.website && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.website}</p>
                )}
              </div>
            </div>

            {/* Price Range */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Price Range</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'cheap', label: '$ Budget-Friendly', desc: 'Affordable pricing' },
                  { value: 'moderate', label: '$$ Moderate', desc: 'Mid-range pricing' },
                  { value: 'expensive', label: '$$$ Premium', desc: 'High-end pricing' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriceRange(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      priceRange === option.value
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-lg mb-1">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Amenities & Features</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { value: 'parking', label: '🅿️ Parking', icon: '🅿️' },
                  { value: 'wheelchair_accessible', label: '♿ Wheelchair Accessible', icon: '♿' },
                  { value: 'wifi', label: '📶 Free WiFi', icon: '📶' },
                  { value: 'outdoor_seating', label: '🌳 Outdoor Seating', icon: '🌳' },
                  { value: 'air_conditioned', label: '❄️ Air Conditioned', icon: '❄️' },
                  { value: 'pet_friendly', label: '🐕 Pet Friendly', icon: '🐕' },
                  { value: 'valet_parking', label: '🚗 Valet Parking', icon: '🚗' },
                  { value: 'reservations_required', label: '📅 Reservations Required', icon: '📅' },
                  { value: 'walk_ins_welcome', label: '🚶 Walk-ins Welcome', icon: '🚶' },
                  { value: 'card_payment', label: '💳 Card Payments', icon: '💳' },
                  { value: 'cash_only', label: '💵 Cash Only', icon: '💵' },
                  { value: 'delivery', label: '🚚 Delivery Available', icon: '🚚' },
                ].map(amenity => (
                  <button
                    key={amenity.value}
                    type="button"
                    onClick={() => toggleAmenity(amenity.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      amenities.includes(amenity.value)
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">{amenity.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Select all that apply to help customers find your business</p>
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
            
            {/* Validation Summary */}
            {Object.keys(fieldErrors).length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      Please fix the following issues before continuing:
                    </h3>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                      {Object.entries(fieldErrors).map(([field, error]) => (
                        <li key={field}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
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
                        className={`input w-full ${fieldErrors[`service_${index}_name`] ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder={t('serviceNameOnboarding')} 
                        value={service.name} 
                        onChange={e => {
                          updateService(service.id, { name: e.target.value });
                          if (fieldErrors[`service_${index}_name`]) {
                            setFieldErrors(prev => {
                              const next = { ...prev };
                              delete next[`service_${index}_name`];
                              return next;
                            });
                          }
                        }}
                        onFocus={clearOnFirstFocus(`service-name-${service.id}`, () => updateService(service.id, { name: '' }))}
                      />
                      {fieldErrors[`service_${index}_name`] && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors[`service_${index}_name`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('priceOnboarding')} *</label>
                      <input 
                        type="number" 
                        className={`input w-full ${fieldErrors[`service_${index}_price`] ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="0.00" 
                        value={service.price} 
                        onChange={e => {
                          updateService(service.id, { price: parseFloat(e.target.value) || 0 });
                          if (fieldErrors[`service_${index}_price`]) {
                            setFieldErrors(prev => {
                              const next = { ...prev };
                              delete next[`service_${index}_price`];
                              return next;
                            });
                          }
                        }}
                        onFocus={clearOnFirstFocus(`service-price-${service.id}`, () => updateService(service.id, { price: 0 }))}
                      />
                      {fieldErrors[`service_${index}_price`] && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors[`service_${index}_price`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('durationOnboarding')} * (minutes)</label>
                      <input 
                        type="number" 
                        className={`input w-full ${fieldErrors[`service_${index}_duration`] ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="30" 
                        value={service.duration} 
                        onChange={e => {
                          updateService(service.id, { duration: parseInt(e.target.value) || 30 });
                          if (fieldErrors[`service_${index}_duration`]) {
                            setFieldErrors(prev => {
                              const next = { ...prev };
                              delete next[`service_${index}_duration`];
                              return next;
                            });
                          }
                        }}
                        onFocus={clearOnFirstFocus(`service-duration-${service.id}`, () => updateService(service.id, { duration: 0 }))}
                      />
                      {fieldErrors[`service_${index}_duration`] && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors[`service_${index}_duration`]}</p>
                      )}
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
                      placeholder={t('fieldLabel') || 'Field Label (e.g., Notes, Special Requests)'} 
                      value={field.label} 
                      onChange={e => updateField(field.id, { label: e.target.value })} 
                      onFocus={clearOnFirstFocus(`field-label-${field.id}`, () => {
                        // Clear if it's a default value
                        if (field.label === 'Notes' || field.label === 'New Field') {
                          updateField(field.id, { label: '' });
                        }
                      })}
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
                        placeholder={t('options') || 'Enter options separated by commas (e.g., Option 1, Option 2, Option 3)'}
                        value={(field.options || []).join(', ')}
                        onChange={e => updateField(field.id, { 
                          options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                        onFocus={clearOnFirstFocus(`field-options-${field.id}`, () => {
                          const currentOptions = (field.options || []).join(', ');
                          if (currentOptions === 'Option 1, Option 2') {
                            updateField(field.id, { options: [] });
                          }
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
            
            <div className="mt-6 text-gray-600">
              <p className="text-sm">Redirecting to your dashboard in <strong>{countdown}</strong> seconds...</p>
              <p className="text-xs mt-2">Or click below to go now</p>
            </div>

            <div className="flex justify-center gap-4 mt-4">
              <button
                className="btn btn-primary"
                onClick={() => window.location.href = '/business-dashboard'}
              >
                Go to Dashboard Now
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


