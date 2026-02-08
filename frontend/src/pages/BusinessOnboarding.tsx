import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Save, Clock, DollarSign, Settings, CheckCircle, ChevronDown, Users } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { MapAddressSelector } from '../components/MapAddressSelector';
import { TimePicker } from '../components/TimePicker';
import { TeamManagementSection } from '../components/TeamManagementSection';
import { generateUUID } from '../utils/uuid';
import { authStorage } from '../utils/authStorage';

type FieldType = 'text' | 'number' | 'select' | 'checkbox';

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
  priceMax?: number;
  duration: number;
  isActive: boolean;
  customFields: FormField[];
  maxBookingsPerCustomerPerDay?: number;
  maxBookingsPerCustomerPerWeek?: number;
  bookingCooldownHours?: number;
  allowMultipleActiveBookings?: boolean;
}

/** Country code (ISO 3166-1 alpha-2) to E.164 calling code */
const COUNTRY_CALLING_CODES: Record<string, string> = {
  US: '1', CA: '1', GB: '44', UK: '44', RO: '40', MD: '373', RU: '7',
  AU: '61', DE: '49', FR: '33', IT: '39', ES: '34', NL: '31', BR: '55',
  IN: '91', JP: '81', CN: '86', UA: '380', PL: '48', TR: '90', MX: '52',
};

interface WorkingHours {
  [key: string]: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  };
}

export const BusinessOnboarding: React.FC = () => {
  const { t, lang } = useI18n();
  const { formatPrice, formatPriceTier } = useCurrency();
  const [currentStep, setCurrentStep] = useState(1);
  const [countdown, setCountdown] = useState(5);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('beauty_salon');
  const [businessType, setBusinessType] = useState<'personal_service' | 'parallel'>('personal_service');

  const PERSONAL_CATEGORIES = [
    { value: 'beauty_salon', key: 'categoryBeautySalon' },
    { value: 'tailor', key: 'categoryTailor' },
    { value: 'mechanic', key: 'categoryMechanic' },
    { value: 'fitness', key: 'categoryFitness' },
    { value: 'healthcare', key: 'categoryHealthcare' },
    { value: 'education', key: 'categoryEducation' },
    { value: 'consulting', key: 'categoryConsulting' },
    { value: 'other', key: 'categoryOther' },
  ];
  const PARALLEL_CATEGORIES = [
    { value: 'restaurant', key: 'categoryRestaurant' },
    { value: 'other', key: 'categoryOther' },
  ];
  const categoryOptions = businessType === 'parallel' ? PARALLEL_CATEGORIES : PERSONAL_CATEGORIES;
  useEffect(() => {
    if (businessType === 'parallel' && !['restaurant', 'other'].includes(category)) {
      setCategory('restaurant');
    } else if (businessType === 'personal_service' && category === 'restaurant') {
      setCategory('beauty_salon');
    }
  }, [businessType]);

  useEffect(() => {
    if (businessType === 'personal_service') {
      setNumberOfTables(5); // Reset when switching away from parallel
    }
  }, [businessType]);

  useEffect(() => {
    if (businessType === 'parallel') {
      setServices(prev => {
        const first = prev[0];
        if (!first?.name?.trim()) {
          return [{
            ...(first || { id: generateUUID(), isActive: true, customFields: [] }),
            name: t('tableReservation') || 'Table reservation',
            price: 0,
            duration: 90,
            description: first?.description || '',
          }, ...prev.slice(1)];
        }
        return prev;
      });
    }
  }, [businessType]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [openFieldTypeId, setOpenFieldTypeId] = useState<string | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (openFieldTypeId && !(e.target as Element).closest('[data-field-type-dropdown]')) {
        setOpenFieldTypeId(null);
      }
    };
    if (categoryDropdownOpen || openFieldTypeId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [categoryDropdownOpen, openFieldTypeId]);
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
  
  const [numberOfTables, setNumberOfTables] = useState<number>(5);

  const [services, setServices] = useState<Service[]>([
    {
      id: generateUUID(),
      name: '',
      description: '',
      price: 0,
      priceMax: undefined,
      duration: 0,
      isActive: true,
      customFields: []
    }
  ]);
  
  const [fields, setFields] = useState<FormField[]>([
    { id: generateUUID(), label: '', type: 'text', required: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);
  const [pendingInviteEmail, setPendingInviteEmail] = useState('');

  // Auto-redirect to dashboard after success
  React.useEffect(() => {
    if (currentStep === 6 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (currentStep === 6 && countdown === 0) {
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
    const base: FormField = { id: generateUUID(), label: '', type, required: false };
    if (type === 'select') base.options = ['Option 1', 'Option 2'];
    setFields(prev => [...prev, base]);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const addPendingInvite = () => {
    const email = pendingInviteEmail.trim();
    if (!email) return;
    if (pendingInvites.includes(email)) {
      toast.error(t('alreadyAdded') || 'Already added');
      return;
    }
    setPendingInvites((p) => [...p, email]);
    setPendingInviteEmail('');
  };

  const addService = () => {
    const newService: Service = {
      id: generateUUID(),
      name: '',
      description: '',
      price: 0,
      priceMax: undefined,
      duration: 0,
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

  const PAYMENT_PAIR = ['card_payment', 'cash_only'] as const;

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => {
      const isAdding = !prev.includes(amenity);
      let next = isAdding ? [...prev, amenity] : prev.filter(a => a !== amenity);
      if (isAdding && PAYMENT_PAIR.includes(amenity as any)) {
        const other = PAYMENT_PAIR.find(p => p !== amenity)!;
        next = next.filter(a => a !== other);
      }
      return next;
    });
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
        const cc = (details.countryCode || '').toUpperCase();
        setCountryCode(cc);
        // Auto-set phone prefix from location when phone is empty
        const callingCode = COUNTRY_CALLING_CODES[cc];
        if (callingCode) {
          setPhone((prev) => (!prev.trim() ? `+${callingCode} ` : prev));
        }
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
          const cleanedPhone = phone.replace(/[\s\-().]/g, '');
          const digitsOnly = cleanedPhone.replace(/\+/g, '');
          // Accept 7-15 digits (international range)
          if (!/^\d{7,15}$/.test(digitsOnly)) {
            errors.push('Phone number must have 7-15 digits (e.g., +40 712 345 678)');
            fieldErrors.phone = 'Phone number must have 7-15 digits';
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
        if (businessType === 'parallel' && (numberOfTables < 1 || numberOfTables > 100)) {
          errors.push('Number of tables must be between 1 and 100');
          fieldErrors.numberOfTables = 'Enter a number between 1 and 100';
        }
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

            const isParallel = businessType === 'parallel';
            if (!isParallel && service.price <= 0) {
              const msg = `Price must be greater than ${formatPrice(0)}`;
              errors.push(`Service ${serviceNum}: ${msg}`);
              fieldErrors[`service_${index}_price`] = msg;
            } else if (service.price < 0) {
              const msg = 'Price cannot be negative';
              errors.push(`Service ${serviceNum}: ${msg}`);
              fieldErrors[`service_${index}_price`] = msg;
            } else if (service.price > 100000) {
              const msg = `Price cannot exceed ${formatPrice(100000)}`;
              errors.push(`Service ${serviceNum}: ${msg}`);
              fieldErrors[`service_${index}_price`] = msg;
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
      const customBookingFields = fields
        .filter(f => f.label?.trim())
        .map(({ id, ...rest }) => ({
          fieldName: rest.label,
          fieldType: rest.type,
          isRequired: rest.required,
          options: rest.options,
        }));

      const businessPayload = {
        name: businessName,
        description: description || null,
        category,
        businessType,
        address,
        city,
        state,
        zipCode,
        country: country || 'USA',
        phone,
        email: email || null,
        website: website || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        priceRange: priceRange || 'moderate',
        amenities: amenities || [],
        workingHours,
        customBookingFields,
      };
      let business: { id: string };
      let usedExistingBusiness = false;
      try {
        const businessRes = await api.post('/businesses', businessPayload);
        business = businessRes.data;
      } catch (createErr: any) {
        if (createErr?.response?.status === 400 && (createErr?.response?.data?.message || '').toLowerCase().includes('already have a business')) {
          const { businessService } = await import('../services/api');
          const myRes = await businessService.getMyBusiness();
          business = myRes?.data;
          if (!business?.id) throw createErr;
          usedExistingBusiness = true;
        } else {
          throw createErr;
        }
      }

      // 2) Upload images if any were selected (skip if using existing business)
      if (!usedExistingBusiness && selectedImages.length > 0) {
        try {
          const { businessService } = await import('../services/api');
          await businessService.uploadImages(business.id, selectedImages);
        } catch (error) {
          console.error('Failed to upload images:', error);
          toast.error('Business created but some images failed to upload');
        }
      }

      // 3) Create services (skip if using existing business)
      let tableServiceId: string | null = null;
      if (!usedExistingBusiness) {
      for (const service of services) {
        const isTableService = businessType === 'parallel';
        if (service.name && (service.price > 0 || (isTableService && service.price >= 0))) {
          const customFields = (service.customFields || []).map(({ id, ...rest }) => rest);
          const serviceRes = await api.post('/services', {
            ...service,
            businessId: business.id,
            resourceType: isTableService ? 'table' : undefined,
            priceMax: service.priceMax != null && service.priceMax > service.price ? service.priceMax : undefined,
            customFields,
          });
          if (isTableService && serviceRes?.data?.id) {
            tableServiceId = serviceRes.data.id;
          }
        }
      }
      }

      // 4) For parallel businesses: create table resources and link to table service (skip if using existing)
      if (!usedExistingBusiness && businessType === 'parallel' && numberOfTables > 0 && tableServiceId) {
        const { resourceService } = await import('../services/api');
        for (let i = 1; i <= numberOfTables; i++) {
          const res = await resourceService.create({
            name: `${t('table') || 'Table'} ${i}`,
            type: 'table',
            businessId: business.id,
            capacity: 4,
            sortOrder: i,
          });
          if (res?.data?.id) {
            await resourceService.linkToService(res.data.id, tableServiceId);
          }
        }
      }
      
      // Show pending review notice
      toast.success('Business submitted! Review usually takes 30–60 minutes. You\'ll receive an email when it\'s approved.');

      // Update auth storage to reflect the new business owner role
      const userStr = authStorage.getUser();
      const user = userStr ? JSON.parse(userStr) : {};
      user.role = 'business_owner';
      authStorage.setUser(JSON.stringify(user));

      // 5) Send invites for any emails added before creation
      if (pendingInvites.length > 0) {
        const { businessService: bizApi } = await import('../services/api');
        for (const email of pendingInvites) {
          try {
            await bizApi.inviteMember(business.id, email.trim());
            toast.success(t('inviteSent') || 'Invite sent');
          } catch (invErr: any) {
            const msg = invErr?.response?.data?.message || '';
            if (msg.includes('No account found with this email')) {
              toast.error(t('inviteEmailNotRegistered') || msg);
            } else if (msg.includes('already a team member')) {
              toast.error(t('inviteAlreadyMember') || msg);
            } else if (msg.includes('invite was already sent')) {
              toast.error(t('inviteAlreadySent') || msg);
            } else {
              toast.error(msg || `Failed to invite ${email}`);
            }
          }
        }
        setPendingInvites([]);
      }

      // Business is created, stay on Team step so they can invite more or continue
      setCreatedBusinessId(business.id);
    } catch (e: any) {
      console.error('Business creation error:', e);
      const data = e.response?.data;
      const msg = Array.isArray(data?.message) ? data.message[0] : (data?.message || data?.error || e.message || 'Failed to save business. Please try again.');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep >= 5) return;

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
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const finishPersonnelStep = () => {
    setCurrentStep(6);
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
    { id: 4, title: 'Booking Form', icon: Settings },
    { id: 5, title: t('personnelOnboarding'), icon: Users }
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 pb-16 lg:pb-6">
      {/* Progress Steps */}
      <div className="mb-8 flex justify-center">
        <div className="flex items-center gap-x-4 sm:gap-x-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const arrowCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center flex-shrink-0">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted ? 'bg-[#330007] border-[#330007] text-white' :
                    isActive ? 'border-[#330007] text-[#330007]' :
                    'border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`ml-2 text-sm font-medium whitespace-nowrap ${
                    isActive ? 'text-[#330007]' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex items-center justify-center w-10 flex-shrink-0 ${arrowCompleted ? 'text-[#330007]' : 'text-gray-300'}`}>
                    <svg viewBox="0 0 48 12" className="w-12 h-3 flex-shrink-0" fill="currentColor">
                      <line x1="0" y1="6" x2="34" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <polygon points="32,0 48,6 32,12" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="card p-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">{t('businessInfo')}</h2>
              <p className="text-gray-600 mt-2">{t('businessInfoDesc')}</p>
            </div>

            {/* Business Type: Personal service vs Parallel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('businessType') || 'Business type'}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setBusinessType('personal_service')}
                  className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-colors ${
                    businessType === 'personal_service'
                      ? 'border-[#330007] bg-[#fef2f2]'
                      : 'border-[#fecaca] bg-white hover:border-[#330007]/30'
                  }`}
                >
                  <span className="font-semibold text-gray-900">{t('personalService') || 'Personal service'}</span>
                  <span className="text-sm text-gray-600 mt-1">{t('personalServiceDesc') || 'One employee serves one customer (barber, mechanic, therapist)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessType('parallel')}
                  className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-colors ${
                    businessType === 'parallel'
                      ? 'border-[#330007] bg-[#fef2f2]'
                      : 'border-[#fecaca] bg-white hover:border-[#330007]/30'
                  }`}
                >
                  <span className="font-semibold text-gray-900">{t('parallelBusiness') || 'Parallel business'}</span>
                  <span className="text-sm text-gray-600 mt-1">{t('parallelBusinessDesc') || 'Multiple customers at once (restaurant tables, rooms)'}</span>
                </button>
              </div>
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
                <div ref={categoryDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen((o) => !o)}
                    className="w-full min-h-[44px] flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-left text-gray-800 bg-[#fef2f2] border-2 border-[#fecaca] hover:border-[#330007]/30 focus:border-[#330007] focus:ring-2 focus:ring-[#330007]/20 focus:outline-none transition-colors cursor-pointer"
                  >
                    <span>{t(
                      { beauty_salon: 'categoryBeautySalon', tailor: 'categoryTailor', mechanic: 'categoryMechanic', restaurant: 'categoryRestaurant', fitness: 'categoryFitness', healthcare: 'categoryHealthcare', education: 'categoryEducation', consulting: 'categoryConsulting', other: 'categoryOther' }[category] || 'categoryOther'
                    )}</span>
                    <ChevronDown className={`h-5 w-5 text-[#330007] flex-shrink-0 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {categoryDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 py-1.5 rounded-xl bg-[#fef2f2] border-2 border-[#fecaca] shadow-lg z-50 max-h-60 overflow-y-auto">
                      {categoryOptions.map(({ value, key }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setCategory(value);
                            setCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-[10px] last:rounded-b-[10px] ${
                            category === value
                              ? 'bg-[#330007] text-white'
                              : 'text-gray-800 hover:bg-[#330007]/10'
                          }`}
                        >
                          {t(key)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('businessImages')}</label>
                <p className="text-sm text-gray-500 mb-2">{t('uploadImagesHint')}</p>
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
                    file:bg-[#fef2f2] file:text-[#330007] file:border file:border-[#330007]
                    hover:file:bg-[#fee2e2]"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('addressOnboarding')} *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('zipCodeOnboarding')} *</label>
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
                  type="tel"
                  className={`input w-full ${fieldErrors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder={COUNTRY_CALLING_CODES[countryCode] ? `+${COUNTRY_CALLING_CODES[countryCode]} ...` : '+1 ...'} 
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
                  <p className="mt-1 text-xs text-gray-500">{t('phoneLocationHint')}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-3">{t('priceRange')}</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'cheap', tier: 1 as const, labelKey: 'budgetFriendlyLabel', descKey: 'affordablePricing' },
                  { value: 'moderate', tier: 2 as const, labelKey: 'moderateLabel', descKey: 'midRangePricing' },
                  { value: 'expensive', tier: 3 as const, labelKey: 'premiumLabel', descKey: 'highEndPricing' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriceRange(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      priceRange === option.value
                        ? 'border-[#330007] bg-[#fef2f2] text-[#330007]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-lg mb-1">{formatPriceTier(option.tier)} {t(option.labelKey)}</div>
                    <div className="text-xs text-gray-600">{t(option.descKey)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">{t('amenitiesAndFeatures')}</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { value: 'parking', labelKey: 'parking' },
                  { value: 'wheelchair_accessible', labelKey: 'wheelchairAccessible' },
                  { value: 'wifi', labelKey: 'freeWifi' },
                  { value: 'outdoor_seating', labelKey: 'outdoorSeating' },
                  { value: 'air_conditioned', labelKey: 'airConditioned' },
                  { value: 'pet_friendly', labelKey: 'petFriendly' },
                  { value: 'valet_parking', labelKey: 'valetParking' },
                  { value: 'reservations_required', labelKey: 'reservationsRequired' },
                  { value: 'walk_ins_welcome', labelKey: 'walkInsWelcome' },
                  { value: 'card_payment', labelKey: 'cardPayment' },
                  { value: 'cash_only', labelKey: 'cashOnly' },
                  { value: 'delivery', labelKey: 'deliveryAvailable' },
                ].map(amenity => (
                  <button
                    key={amenity.value}
                    type="button"
                    onClick={() => toggleAmenity(amenity.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      amenities.includes(amenity.value)
                        ? 'border-[#330007] bg-[#fef2f2] text-[#330007]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">{t(amenity.labelKey)}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{t('amenitiesHint')}</p>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">{t('servicesOnboarding')}</h2>
              <p className="text-gray-600 mt-2">{t('servicesDesc')}</p>
            </div>

            {businessType === 'parallel' && (
              <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] border-2 border-[#fecaca]">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('numberOfTables') || 'Number of tables'}</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={numberOfTables}
                  onChange={(e) => setNumberOfTables(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                  className={`input w-32 ${fieldErrors.numberOfTables ? 'border-red-500' : ''}`}
                />
                <p className="text-xs text-gray-500 mt-1">{t('numberOfTablesHint') || 'Tables will be created automatically. You can add or remove them later.'}</p>
                {fieldErrors.numberOfTables && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.numberOfTables}</p>
                )}
              </div>
            )}
            
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
                <div key={service.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">Service {index + 1}</h3>
                    {services.length > 1 && (
                      <button type="button" className="text-red-600 hover:text-red-800" onClick={() => removeService(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-3 items-end">
                    <div className="min-w-[140px] flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('serviceNameOnboarding')} *</label>
                      <input 
                        className={`input h-9 w-full text-sm ${fieldErrors[`service_${index}_name`] ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder={t('serviceNameOnboarding')} 
                        value={service.name} 
                        onChange={e => {
                          updateService(service.id, { name: e.target.value });
                          if (fieldErrors[`service_${index}_name`]) setFieldErrors(prev => { const n = { ...prev }; delete n[`service_${index}_name`]; return n; });
                        }}
                        onFocus={clearOnFirstFocus(`service-name-${service.id}`, () => updateService(service.id, { name: '' }))}
                      />
                      {fieldErrors[`service_${index}_name`] && <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`service_${index}_name`]}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{lang === 'ro' ? 'Preț minim' : lang === 'ru' ? 'Мин. цена' : 'Min price'} ({formatPriceTier(1)}) {businessType === 'parallel' ? '' : '*'}</label>
                      <input type="number" min={businessType === 'parallel' ? 0 : 0.01} step={0.01}
                        className={`input h-9 w-[80px] px-2 text-sm ${fieldErrors[`service_${index}_price`] ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="0" value={service.price === 0 ? '' : service.price} 
                        onChange={e => { const v = parseFloat(e.target.value); updateService(service.id, { price: isNaN(v) ? 0 : v });
                          if (fieldErrors[`service_${index}_price`]) setFieldErrors(prev => { const n = { ...prev }; delete n[`service_${index}_price`]; return n; });
                        }}
                        onFocus={clearOnFirstFocus(`service-price-${service.id}`, () => updateService(service.id, { price: 0 }))}
                      />
                      {fieldErrors[`service_${index}_price`] && <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`service_${index}_price`]}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{lang === 'ro' ? 'Preț maxim' : lang === 'ru' ? 'Макс. цена' : 'Max price'} ({formatPriceTier(1)})</label>
                      <input type="number" min={0} step={0.01} className="input h-9 w-[80px] px-2 text-sm"
                        placeholder="—" value={service.priceMax != null && service.priceMax > 0 ? service.priceMax : ''} 
                        onChange={e => { const val = e.target.value; const v = val === '' ? undefined : parseFloat(val); updateService(service.id, { priceMax: v != null && !isNaN(v) ? v : undefined }); }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{businessType === 'parallel' ? (t('slotDuration') || 'Slot duration (min)') : t('durationOnboarding')} *</label>
                      <input type="number" min={1} className={`input h-9 w-[70px] px-2 text-sm ${fieldErrors[`service_${index}_duration`] ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="30" value={service.duration === 0 ? '' : service.duration} 
                        onChange={e => { const v = parseInt(e.target.value, 10); updateService(service.id, { duration: isNaN(v) ? 0 : v });
                          if (fieldErrors[`service_${index}_duration`]) setFieldErrors(prev => { const n = { ...prev }; delete n[`service_${index}_duration`]; return n; });
                        }}
                        onFocus={clearOnFirstFocus(`service-duration-${service.id}`, () => updateService(service.id, { duration: 0 }))}
                      />
                      {fieldErrors[`service_${index}_duration`] && <p className="mt-0.5 text-xs text-red-600">{fieldErrors[`service_${index}_duration`]}</p>}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-700 pb-1">
                      <input type="checkbox" checked={service.isActive} onChange={e => updateService(service.id, { isActive: e.target.checked })} />
                      {t('activeOnboarding')}
                    </label>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('descriptionOnboarding')}</label>
                    <textarea className="input w-full h-14 text-sm py-2" placeholder={t('descriptionOnboarding')} value={service.description} 
                      onChange={e => updateService(service.id, { description: e.target.value })} 
                      onFocus={clearOnFirstFocus(`service-description-${service.id}`, () => updateService(service.id, { description: '' }))}
                    />
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addService}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#fef2f2] border-2 border-[#fecaca] text-[#330007] font-semibold hover:bg-[#330007]/5 hover:border-[#330007]/30 transition-colors"
              >
                <Plus className="h-5 w-5" />
                {t('addAnotherService')}
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
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
                      <TimePicker
                        value={hours.openTime || '09:00'}
                        onChange={(v) => updateWorkingHours(day, { openTime: v })}
                        className="w-32"
                      />
                      <span>{t('to')}</span>
                      <TimePicker
                        value={hours.closeTime || '17:00'}
                        onChange={(v) => updateWorkingHours(day, { closeTime: v })}
                        className="w-32"
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
              <h2 className="text-2xl font-bold text-gray-900">{t('bookingForm')}</h2>
              <p className="text-gray-600 mt-2">{t('bookingFormDesc')}</p>
            </div>
            
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.id} className="border-2 border-[#fecaca] rounded-xl p-4 bg-[#fef2f2]/50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input 
                      className="input" 
                      placeholder={t('fieldLabel') || 'Field Label (e.g., Notes, Special Requests)'} 
                      value={field.label} 
                      onChange={e => updateField(field.id, { label: e.target.value })} 
                    />
                    <div data-field-type-dropdown className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenFieldTypeId(openFieldTypeId === field.id ? null : field.id)}
                        className="w-full min-h-[40px] flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-gray-800 bg-[#fef2f2] border-2 border-[#fecaca] hover:border-[#330007]/30 focus:border-[#330007] focus:outline-none transition-colors cursor-pointer"
                      >
                        <span>{t({ text: 'textField', number: 'numberField', select: 'selectOnboarding', checkbox: 'checkbox' }[field.type] || 'textField')}</span>
                        <ChevronDown className={`h-4 w-4 text-[#330007] flex-shrink-0 transition-transform ${openFieldTypeId === field.id ? 'rotate-180' : ''}`} />
                      </button>
                      {openFieldTypeId === field.id && (
                        <div className="absolute left-0 right-0 top-full mt-1 py-1.5 rounded-xl bg-[#fef2f2] border-2 border-[#fecaca] shadow-lg z-50">
                          {(['text', 'number', 'select', 'checkbox'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                updateField(field.id, { type });
                                setOpenFieldTypeId(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors first:rounded-t-[10px] last:rounded-b-[10px] ${
                                field.type === type
                                  ? 'bg-[#330007] text-white'
                                  : 'text-gray-800 hover:bg-[#330007]/10'
                              }`}
                            >
                              {t({ text: 'textField', number: 'numberField', select: 'selectOnboarding', checkbox: 'checkbox' }[type])}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input 
                        type="checkbox" 
                        checked={field.required} 
                        onChange={e => updateField(field.id, { required: e.target.checked })} 
                      />
                      {t('requiredOnboarding')}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-medium text-sm justify-self-end transition-colors"
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
              
              <button
                type="button"
                onClick={() => addField('text')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#fef2f2] border-2 border-[#fecaca] text-[#330007] font-semibold hover:bg-[#330007]/5 hover:border-[#330007]/30 transition-colors"
              >
                <Plus className="h-5 w-5" />
                {t('addField')}
              </button>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('personnelOnboarding')}</h2>
              <p className="text-gray-600 mt-2">
                {createdBusinessId ? t('personnelOnboardingDesc') : t('finishSetupToInvite')}
              </p>
            </div>
            {createdBusinessId ? (
              <TeamManagementSection businessId={createdBusinessId} />
            ) : (
              <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <p className="text-sm text-gray-600">{t('personnelOnboardingDesc')}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                  <input
                    type="email"
                    value={pendingInviteEmail}
                    onChange={(e) => setPendingInviteEmail(e.target.value)}
                    placeholder={t('inviteEmailPlaceholder') || 'staff@email.com'}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#330007] focus:outline-none focus:ring-1 focus:ring-[#330007]"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPendingInvite())}
                  />
                  <button
                    type="button"
                    onClick={addPendingInvite}
                    disabled={!pendingInviteEmail.trim()}
                    className="shrink-0 rounded-lg bg-[#330007] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a000a] disabled:opacity-50"
                  >
                    {t('invite') || 'Invite'}
                  </button>
                </div>
                {pendingInvites.length > 0 && (
                  <div className="divide-y rounded border border-gray-200 bg-white">
                    {pendingInvites.map((email) => (
                      <div key={email} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-gray-900">{email}</span>
                        <button
                          type="button"
                          onClick={() => setPendingInvites((p) => p.filter((e) => e !== email))}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          {t('remove') || 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-6 text-center">
            <div className="mb-8">
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
                className="btn bg-[#330007] hover:bg-[#4a000a] text-white border-0"
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
        {currentStep < 6 && (
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button 
              className="btn btn-outline px-6 py-3 min-w-[120px]" 
              onClick={prevStep} 
              disabled={currentStep === 1}
            >
              {t('previous')}
            </button>
            
            <div className="flex gap-3">
              {currentStep < 5 ? (
                <button 
                  className="btn bg-[#330007] hover:bg-[#4a000a] text-white border-0 px-6 py-3 min-w-[140px]" 
                  onClick={nextStep}
                >
                  {t('nextStep')}
                </button>
              ) : createdBusinessId ? (
                <button 
                  className="btn bg-[#330007] hover:bg-[#4a000a] text-white border-0 px-6 py-3 min-w-[140px]" 
                  onClick={finishPersonnelStep}
                >
                  {t('nextStep')}
                </button>
              ) : (
                <button 
                  className="btn bg-[#330007] hover:bg-[#4a000a] text-white border-0 disabled:opacity-50 px-6 py-3 min-w-[140px]" 
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


