import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { bookingService, api, resourceService, businessService, messageService } from '../services/api';
import { Calendar, Clock, MapPin, Phone, X, CheckCircle, AlertCircle, User, Check, XCircle, QrCode, MessageCircle, ChevronDown, Bell, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import toast from 'react-hot-toast';
import { BookingReviewPrompt } from '../components/BookingReviewPrompt';
import { EnhancedCalendarView, type CalendarViewType } from '../components/EnhancedCalendarView';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { BookingDetailsModal } from '../components/BookingDetailsModal';
import { RejectBookingModal } from '../components/RejectBookingModal';
import { TablesLayout } from './TablesLayout';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

export const MyBookings: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const bookingIdFromUrl = searchParams.get('bookingId');
  const dateFromUrl = searchParams.get('date');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled' | 'pending'>('all');
  const [calendarView, setCalendarView] = useState<CalendarViewType>('timeGridWeek');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [showInfoBox, setShowInfoBox] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [assignModalBooking, setAssignModalBooking] = useState<any | null>(null);
  const [assignSelectedResourceId, setAssignSelectedResourceId] = useState<string>('');
  const [assignSelectedEmployee, setAssignSelectedEmployee] = useState<{ id: string; type: 'resource' | 'member'; name: string; userId?: string } | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [rejectModalBooking, setRejectModalBooking] = useState<any | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) setFilterDropdownOpen(false);
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) setViewDropdownOpen(false);
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target as Node)) setEmployeeDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Debug: Log when booking is selected
  React.useEffect(() => {
    if (selectedBooking) {
      console.log('[MyBookings] Selected booking:', selectedBooking.id);
    }
  }, [selectedBooking]);
  
  const isBusinessOwner = user?.role === 'business_owner';
  const isEmployee = user?.role === 'employee';

  const { data: myBusiness } = useQuery(
    ['my-business'],
    () => api.get('/businesses/my-business').then((r) => r.data),
    { enabled: isBusinessOwner || isEmployee }
  );
  const businessData = Array.isArray(myBusiness) ? myBusiness[0] : myBusiness;

  const isParallel = businessData?.businessType === 'parallel';
  const [activeTab, setActiveTab] = useState<'calendar' | 'resources'>('calendar');
  const hasSetDefaultTab = useRef(false);

  // Set default tab for business owners/employees based on business type (once)
  useEffect(() => {
    if ((isBusinessOwner || isEmployee) && businessData && !hasSetDefaultTab.current) {
      hasSetDefaultTab.current = true;
      setActiveTab(isParallel ? 'resources' : 'calendar');
    }
  }, [isBusinessOwner, isEmployee, businessData, isParallel]);

  const { data: staffResources = [] } = useQuery(
    ['resources', businessData?.id],
    () => resourceService.getAll(businessData?.id).then((r) => r.data),
    {
      enabled: !!businessData?.id,
      select: (data: any) => (Array.isArray(data) ? data : data?.data || []).filter((r: any) => (r.type === 'staff' || r.type === 'STAFF') && r.isActive !== false),
    }
  );

  const { data: teamMembers = [] } = useQuery(
    ['business-members', businessData?.id],
    () => businessService.listMembers(businessData!.id).then((r) => r.data),
    {
      enabled: !!businessData?.id && isBusinessOwner,
      select: (data: any) => (Array.isArray(data) ? data : data?.data || []),
    }
  );

  // For employees: default to showing only their own assigned bookings
  useEffect(() => {
    if (isEmployee && staffResources?.length > 0 && !selectedResourceId) {
      const myResource = staffResources.find((r: any) => r.user?.id === user?.id || r.userId === user?.id);
      if (myResource?.id) setSelectedResourceId(myResource.id);
    }
  }, [isEmployee, staffResources, user?.id, selectedResourceId]);
  
  // Debug: Log user role
  React.useEffect(() => {
    console.log('[MyBookings] User role check:', {
      userRole: user?.role,
      isBusinessOwner,
      isEmployee,
      userId: user?.id,
    });
  }, [user, isBusinessOwner, isEmployee]);

  // Get bookings based on user role
  const { data: bookings, isLoading, refetch } = useQuery(
    ['my-bookings', isBusinessOwner, isEmployee, user?.id],
    async () => {
      // Get all bookings - handle paginated response
      const allBookingsRes = await bookingService.getAll();
      
      // Handle paginated response structure
      let allBookings: any[] = [];
      if (Array.isArray(allBookingsRes.data)) {
        allBookings = allBookingsRes.data;
      } else if (allBookingsRes.data?.data && Array.isArray(allBookingsRes.data.data)) {
        allBookings = allBookingsRes.data.data;
      } else {
        console.warn('[MyBookings] Unexpected bookings response format:', allBookingsRes.data);
        allBookings = [];
      }
      
      console.log('[MyBookings] All bookings received:', allBookings.length);
      
      if (isBusinessOwner) {
        // For business owners, show BOTH:
        // 1. Bookings for their business (work bookings)
        // 2. Bookings they made as customers (personal bookings)
        try {
          const businessRes = await api.get('/businesses/my-business');
          const business = businessRes.data;

          // Get bookings for their business
          const businessBookings = business?.id
            ? allBookings.filter((b: any) =>
                b.business?.id === business.id || b.businessId === business.id
              )
            : [];

          // Get bookings they made as customers (personal bookings)
          const personalBookings = allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );

          // Combine both, removing duplicates
          const combinedBookings = [...businessBookings, ...personalBookings];
          const uniqueBookings = combinedBookings.filter((booking, index, self) =>
            index === self.findIndex((b) => b.id === booking.id)
          );

          console.log('[MyBookings] Business owner bookings:', {
            businessId: business?.id,
            businessBookings: businessBookings.length,
            personalBookings: personalBookings.length,
            totalBookings: uniqueBookings.length,
          });

          return uniqueBookings;
        } catch (error) {
          console.error('[MyBookings] Error fetching business bookings:', error);
          // Fallback: return personal bookings only
          return allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );
        }
      } else if (isEmployee) {
        // For employees, show BOTH:
        // 1. Bookings for their business (work bookings)
        // 2. Bookings they made as customers (personal bookings)
        try {
          const businessRes = await api.get('/businesses/my-business');
          const business = businessRes.data;
          
          // Get bookings for their business
          const businessBookings = business?.id 
            ? allBookings.filter((b: any) => 
                b.business?.id === business.id || b.businessId === business.id
              )
            : [];
          
          // Get bookings they made as customers (personal bookings)
          const personalBookings = allBookings.filter((b: any) => 
            b.customer?.id === user?.id || b.customerId === user?.id
          );
          
          // Combine both, removing duplicates
          const combinedBookings = [...businessBookings, ...personalBookings];
          const uniqueBookings = combinedBookings.filter((booking, index, self) =>
            index === self.findIndex((b) => b.id === booking.id)
          );
          
          console.log('[MyBookings] Employee bookings:', {
            businessId: business?.id,
            businessBookings: businessBookings.length,
            personalBookings: personalBookings.length,
            totalBookings: uniqueBookings.length,
          });
          
          return uniqueBookings;
        } catch (error) {
          console.error('Error fetching employee bookings:', error);
          // Fallback: return personal bookings only
          return allBookings.filter((b: any) => 
            b.customer?.id === user?.id || b.customerId === user?.id
          );
        }
      }
      
      // For customers, get their own bookings
      return allBookings.filter((b: any) => 
        b.customer?.id === user?.id || b.customerId === user?.id
      );
    },
    {
      enabled: true,
      refetchOnWindowFocus: true,
      refetchInterval: 10000, // Refetch every 10 seconds to get status updates
    }
  );

  // When opening from Home with ?bookingId=...&date=..., focus calendar on that booking and open details
  const hasAppliedBookingFromUrl = useRef(false);
  useEffect(() => {
    if (!bookingIdFromUrl || !bookings?.length || hasAppliedBookingFromUrl.current) return;
    const booking = bookings.find((b: any) => b.id === bookingIdFromUrl);
    if (booking) {
      hasAppliedBookingFromUrl.current = true;
      setActiveTab('calendar');
      setSelectedBooking(booking);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('bookingId');
        next.delete('date');
        return next;
      }, { replace: true });
    }
  }, [bookingIdFromUrl, bookings, setSearchParams]);

  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm(t('areYouSureCancel'))) {
      try {
        await bookingService.cancel(bookingId, 'Cancelled by customer');
        toast.success(t('bookingCancelledSuccessfully'));
        refetch();
      } catch (error) {
        toast.error(t('failedToCancelBooking'));
      }
    }
  };

  const handleAcceptBooking = async (bookingId: string, resourceId?: string, assignToUserId?: string) => {
    try {
      setAssignLoading(true);
      await bookingService.updateStatus(bookingId, 'confirmed', undefined, resourceId, assignToUserId);
      toast.success(t('bookingAccepted') || 'Booking accepted successfully');
      setAssignModalBooking(null);
      setAssignSelectedResourceId('');
      setAssignSelectedEmployee(null);
      await refetch();
      queryClient.invalidateQueries(['my-bookings', isBusinessOwner]);
    } catch (error: any) {
      const msg = error.response?.data?.message;
      const errMsg = Array.isArray(msg) ? msg.join(', ') : (msg || error.message || t('failedToAcceptBooking') || 'Failed to accept booking');
      toast.error(errMsg);
      if (process.env.NODE_ENV === 'development' && error.response?.data) {
        console.error('[MyBookings] Accept booking error:', error.response?.data);
      }
    } finally {
      setAssignLoading(false);
    }
  };

  // Merge team members and staff resources so we show ALL employees (staff resources are created on first assignment, so using only them would hide employees never assigned)
  const fromResources = (staffResources || []).map((r: any) => ({ id: r.id, type: 'resource' as const, name: r.name || `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || `Staff ${r.id?.slice(0, 8)}`, userId: r.user?.id || r.userId }));
  const fromMembers = (Array.isArray(teamMembers) ? teamMembers : []).filter((m: any) => m.user).map((m: any) => ({ id: m.user?.id, type: 'member' as const, name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.email, userId: m.user?.id }));
  const seenUserIds = new Set<string>();
  const assignableEmployees = [...fromResources, ...fromMembers].filter((e) => {
    const uid = e.userId || e.id;
    if (!uid || seenUserIds.has(uid)) return false;
    seenUserIds.add(uid);
    return true;
  });

  const handleAcceptClick = (booking: any) => {
    if (assignableEmployees.length > 0) {
      setAssignModalBooking(booking);
      setAssignSelectedResourceId('');
      setAssignSelectedEmployee(null);
    } else {
      handleAcceptBooking(booking.id);
    }
  };

  const handleAssignConfirm = () => {
    if (!assignModalBooking || !assignSelectedEmployee) {
      toast.error(t('selectEmployee') || 'Please select an employee');
      return;
    }
    if (assignSelectedEmployee.type === 'resource') {
      handleAcceptBooking(assignModalBooking.id, assignSelectedEmployee.id);
    } else {
      handleAcceptBooking(assignModalBooking.id, undefined, assignSelectedEmployee.userId || assignSelectedEmployee.id);
    }
  };

  const handleRejectClick = (booking: any) => {
    setRejectModalBooking(booking);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectModalBooking) return;
    try {
      setRejectLoading(true);
      await bookingService.updateStatus(rejectModalBooking.id, 'cancelled', reason);
      const businessId = rejectModalBooking.business?.id || rejectModalBooking.businessId;
      if (businessId && reason) {
        const msg = `${t('bookingDeclinedMessage') || 'Your booking has been declined.'} ${t('reason') || 'Reason'}: ${reason}`;
        await messageService.sendChatMessage(businessId, msg, rejectModalBooking.id);
      }
      toast.success(t('bookingRejected') || 'Booking rejected');
      setRejectModalBooking(null);
      queryClient.invalidateQueries(['my-bookings', isBusinessOwner]);
      queryClient.invalidateQueries('chat-conversation');
      queryClient.invalidateQueries('chat-conversations');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('failedToRejectBooking') || 'Failed to reject booking');
    } finally {
      setRejectLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'no_show':
        return 'text-gray-600 bg-accent-100';
      default:
        return 'text-gray-600 bg-accent-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) {
      return `${t('today')}, ${format(appointmentDate, 'h:mm a')}`;
    } else if (isTomorrow(appointmentDate)) {
      return `${t('tomorrow')}, ${format(appointmentDate, 'h:mm a')}`;
    } else {
      return format(appointmentDate, 'MMM d, yyyy h:mm a');
    }
  };

  // Separate pending bookings for business owners
  const pendingBookings = isBusinessOwner && bookings
    ? bookings.filter((b: any) => {
        const isPending = b.status === 'pending' || b.status === 'PENDING';
        const appointmentDate = new Date(b.appointmentDate);
        const isUpcoming = isFuture(appointmentDate) || !isPast(appointmentDate);
        return isPending && isUpcoming;
      })
    : [];
  
  console.log('[MyBookings] Pending bookings:', {
    isBusinessOwner,
    totalBookings: bookings?.length || 0,
    pendingCount: pendingBookings.length,
    pendingBookings: pendingBookings.map((b: any) => ({
      id: b.id,
      status: b.status,
      service: b.service?.name,
      customer: `${b.customer?.firstName} ${b.customer?.lastName}`,
    })),
  });

  const filteredBookings = bookings?.filter((booking: any) => {
    switch (filter) {
      case 'pending':
        return booking.status === 'pending' || booking.status === 'PENDING';
      case 'upcoming':
        return isFuture(new Date(booking.appointmentDate)) && booking.status !== 'cancelled';
      case 'past':
        return isPast(new Date(booking.appointmentDate)) && booking.status !== 'cancelled';
      case 'cancelled':
        return booking.status === 'cancelled';
      default:
        return true;
    }
  }).filter((booking: any) => {
    if (!selectedResourceId) return true;
    if (selectedResourceId.startsWith('u-')) {
      const userId = selectedResourceId.slice(2);
      return booking.resource?.userId === userId;
    }
    const bid = booking.resource?.id || booking.resourceId;
    return bid === selectedResourceId;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  // For parallel businesses (restaurants etc.): show Resources only, no Calendar - with Create reservation button
  if ((isBusinessOwner || isEmployee) && isParallel) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <TablesLayout defaultViewMode="layout" />
        </div>
      </div>
    );
  }

  // For business owners/employees (personal_service): show Calendar | Resources tabs
  if ((isBusinessOwner || isEmployee) && activeTab === 'resources') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-2 sm:px-3 pt-2 pb-1">
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900"
            >
              <Calendar className="h-4 w-4" />
              {t('bookingCalendar') || 'Calendar'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm"
            >
              <LayoutGrid className="h-4 w-4" />
              {t('resources') || 'Resources'}
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <TablesLayout defaultViewMode="workers" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2 pt-2 px-2 sm:px-3">
      {/* Tab bar for business owners/employees - only for personal_service (parallel sees Resources only) */}
      {(isBusinessOwner || isEmployee) && !isParallel && (
        <div className="flex-shrink-0">
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              {t('bookingCalendar') || 'Calendar'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900"
            >
              <LayoutGrid className="h-4 w-4" />
              {t('resources') || 'Resources'}
            </button>
          </div>
        </div>
      )}
      {/* Single navbar: Booking calendar title + View dropdown + Filter + Info */}
      <div className="relative z-10 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-3">
          {/* Title - left */}
          <h2 className="text-lg font-bold text-gray-900">{t('bookingCalendar') || 'Booking calendar'}</h2>
          {/* Buttons - right */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Employee dropdown - show all employees, custom design to match View/Filter */}
          {isBusinessOwner && (staffResources?.length > 0 || (Array.isArray(teamMembers) && teamMembers.length > 0)) && (
            <div className="relative w-[10rem] sm:w-[11rem]" ref={employeeDropdownRef}>
              <button
                type="button"
                onClick={() => setEmployeeDropdownOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors min-w-0"
                aria-expanded={employeeDropdownOpen}
                aria-haspopup="listbox"
              >
                <User className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="truncate">
                  {!selectedResourceId
                    ? (t('allEmployees') || 'All employees')
                    : (() => {
                        const fromRes = (staffResources || []).find((r: any) => r.id === selectedResourceId);
                        if (fromRes) return fromRes.name || fromRes.user?.firstName || `Staff`;
                        const uid = selectedResourceId.startsWith('u-') ? selectedResourceId.slice(2) : null;
                        const fromMem = (Array.isArray(teamMembers) ? teamMembers : []).find((m: any) => m.user?.id === uid);
                        return fromMem ? `${fromMem.user?.firstName || ''} ${fromMem.user?.lastName || ''}`.trim() || fromMem.email : selectedResourceId;
                      })()}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${employeeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {employeeDropdownOpen && (
                <div className="absolute right-0 left-0 top-full mt-1 z-20 w-full max-h-60 overflow-y-auto py-1 bg-white rounded-lg border border-gray-200 shadow-lg" role="listbox">
                  <button
                    type="button"
                    role="option"
                    aria-selected={!selectedResourceId}
                    onClick={() => {
                      setSelectedResourceId('');
                      setEmployeeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm ${!selectedResourceId ? 'bg-[#E7001E]/10 text-[#E7001E] font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {t('allEmployees') || 'All employees'}
                  </button>
                  {(() => {
                    const fromResources = (staffResources || []).map((r: any) => ({ value: r.id, label: r.name || `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || `Staff ${r.id?.slice(0, 8)}`, userId: r.user?.id || r.userId }));
                    const fromMembers = (Array.isArray(teamMembers) ? teamMembers : []).filter((m: any) => m.user).map((m: any) => ({ value: `u-${m.user.id}`, label: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.email, userId: m.user?.id }));
                    const seen = new Set<string>();
                    return [...fromResources, ...fromMembers].filter((e) => {
                      const key = e.userId || e.value;
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    }).map((e) => (
                      <button
                        key={e.value}
                        type="button"
                        role="option"
                        aria-selected={selectedResourceId === e.value}
                        onClick={() => {
                          setSelectedResourceId(e.value);
                          setEmployeeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm ${selectedResourceId === e.value ? 'bg-[#E7001E]/10 text-[#E7001E] font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        {e.label}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
          {/* View dropdown: Day / Week / Month */}
          <div className="relative w-[8rem]" ref={viewDropdownRef}>
              <button
                type="button"
                onClick={() => setViewDropdownOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                aria-expanded={viewDropdownOpen}
                aria-haspopup="listbox"
              >
                <Calendar className="h-4 w-4 shrink-0 text-gray-500" />
                <span>
                  {calendarView === 'timeGridDay' ? 'Day' : calendarView === 'timeGridWeek' ? 'Week' : 'Month'}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {viewDropdownOpen && (
                <div className="absolute right-0 left-0 top-full mt-1 z-20 w-full py-1 bg-white rounded-lg border border-gray-200 shadow-lg" role="listbox">
                  {(['timeGridDay', 'timeGridWeek', 'dayGridMonth'] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      role="option"
                      aria-selected={calendarView === view}
                      onClick={() => {
                        setCalendarView(view);
                        setViewDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm ${calendarView === view ? 'bg-[#E7001E]/10 text-[#E7001E] font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {view === 'timeGridDay' ? 'Day' : view === 'timeGridWeek' ? 'Week' : 'Month'}
                    </button>
                  ))}
                </div>
              )}
            </div>

          {/* Filter dropdown: All / Pending / Upcoming / Past / Cancelled */}
          <div className="relative w-[8rem]" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setFilterDropdownOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
              aria-expanded={filterDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="min-w-0 truncate capitalize">{filter}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {filterDropdownOpen && (
              <div className="absolute right-0 left-0 top-full mt-1 z-[100] w-full py-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden" role="listbox">
                {[
                  { key: 'all' as const, label: t('all') },
                  ...(isBusinessOwner ? [{ key: 'pending' as const, label: t('pending') }] : []),
                  { key: 'upcoming' as const, label: t('upcoming') },
                  { key: 'past' as const, label: t('past') },
                  { key: 'cancelled' as const, label: t('cancelled') },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    role="option"
                    aria-selected={filter === opt.key}
                    onClick={() => {
                      setFilter(opt.key);
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm capitalize ${filter === opt.key ? 'bg-[#E7001E]/10 text-[#E7001E] font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

{/* Scan QR button - phones only, for business owners/employees */}
          {(isBusinessOwner || isEmployee) && (
            <button
              type="button"
              onClick={() => navigate('/qr-scanner')}
              className="md:hidden inline-flex items-center gap-2 rounded-lg bg-[#dc2626] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b91c1c]"
              title={t('scanQRCode') || 'Scan QR Code'}
            >
              <QrCode className="h-4 w-4 shrink-0" />
              <span>{t('scanQRCode')}</span>
            </button>
          )}
          {/* Notifications button (business owner): shows pending bookings + tip */}
          {isBusinessOwner && (
            <button
              type="button"
              onClick={() => setShowInfoBox((v) => !v)}
              className={`relative p-2 rounded-lg border transition-colors ${
                showInfoBox
                  ? 'bg-[#E7001E]/10 border-[#E7001E]/30 text-[#E7001E]'
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
              title={pendingBookings.length > 0 ? `${pendingBookings.length} pending booking${pendingBookings.length > 1 ? 's' : ''}` : 'Show notifications & tips'}
              aria-expanded={showInfoBox}
            >
              <Bell className="h-4 w-4" />
              {pendingBookings.length > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E7001E] opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E7001E]"></span>
                </span>
              )}
            </button>
          )}
          </div>
        </div>
        {/* Notifications box: pending bookings + tip */}
        {showInfoBox && isBusinessOwner && (
          <div className="border-t border-gray-100">
            {/* Pending bookings section */}
            <div className="px-3 py-3 bg-red-50/50 border-b border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-[#E7001E]" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Pending Bookings
                </h3>
              </div>
              {pendingBookings.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {pendingBookings.map((booking: any) => (
                    <div key={booking.id} className="bg-white rounded-lg p-2.5 border border-red-200 shadow-sm">
                      <div className="flex flex-col gap-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            {booking.service?.name || t('serviceName')}
                          </h4>
                          <div className="flex items-center text-xs text-gray-600 mb-0.5">
                            <User className="h-3 w-3 mr-1" />
                            <span>
                              {booking.customer?.firstName} {booking.customer?.lastName}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{formatDate(booking.appointmentDate)}</span>
                          </div>
                          {booking.notes && (
                            <p className="text-xs text-gray-600 mt-1.5 italic">
                              "{booking.notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptClick(booking)}
                            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#E7001E] hover:opacity-90 rounded-md transition-opacity"
                          >
                            <Check className="h-3 w-3" />
                            <span>{t('accept') || 'Accept'}</span>
                          </button>
                          <button
                            onClick={() => handleRejectClick(booking)}
                            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-300 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>{t('reject') || 'Reject'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  No pending booking requests at this time.
                </p>
              )}
            </div>
            {/* Tip */}
            <div className="px-3 py-2.5 flex items-center gap-2 text-xs text-gray-600 bg-red-50/50">
              <span>Click a time slot, choose a service — duration is set automatically.</span>
            </div>
          </div>
        )}
      </div>

      {/* Content - Calendar view */}
      <div className="flex-1 min-h-0">
        <EnhancedCalendarView
            currentView={calendarView}
            onViewChange={setCalendarView}
            bookings={filteredBookings || []}
            onCancelBooking={handleCancelBooking}
            onBookingClick={(booking) => setSelectedBooking(booking)}
            onReschedule={async (bookingId: string, newDate: string) => {
              await bookingService.update(bookingId, { appointmentDate: newDate });
            }}
            initialDate={dateFromUrl || undefined}
          />
      </div>

      {/* Review Prompts for Completed Bookings */}
      {bookings?.map((booking: any) => (
        <BookingReviewPrompt
          key={booking.id}
          bookingId={booking.id}
          onReviewSubmitted={() => refetch()}
        />
      ))}

      {/* Booking Details Modal */}
      {selectedBooking && (() => {
        // Find the full booking data from the bookings array
        const fullBooking = bookings?.find((b: any) => b.id === selectedBooking.id);
        const bookingData = fullBooking || selectedBooking;
        
        return (
          <BookingDetailsModal
            booking={{
              id: bookingData.id,
              appointmentDate: bookingData.appointmentDate,
              status: bookingData.status,
              notes: bookingData.notes,
              business: {
                id: bookingData.business?.id || bookingData.businessId, // Ensure business ID is included
                name: bookingData.business?.name || bookingData.businessName || 'Unknown',
                address: bookingData.business?.address,
                phone: bookingData.business?.phone,
                category: bookingData.business?.category,
              },
              service: {
                name: bookingData.service?.name || bookingData.serviceName || 'Unknown',
                duration: bookingData.service?.duration || 0,
              },
              customer: bookingData.customer ? {
                id: bookingData.customer.id, // Make sure customer ID is included
                firstName: bookingData.customer.firstName,
                lastName: bookingData.customer.lastName,
                email: bookingData.customer.email,
              } : undefined,
              totalAmount: Number(bookingData.totalAmount || bookingData.service?.price || 0),
            }}
            onClose={() => setSelectedBooking(null)}
            onCancel={() => {
              if (window.confirm(t('areYouSureCancel'))) {
                handleCancelBooking(selectedBooking.id);
                setSelectedBooking(null);
              }
            }}
            onShowQR={() => {
              setShowQRCode(selectedBooking.id);
              setSelectedBooking(null);
            }}
            isBusinessOwner={isBusinessOwner}
            currentUserId={user?.id}
          />
        );
      })()}

      {/* Reject booking modal */}
      {rejectModalBooking && (
        <RejectBookingModal
          isOpen={!!rejectModalBooking}
          onClose={() => setRejectModalBooking(null)}
          onConfirm={handleRejectConfirm}
          customerName={rejectModalBooking.customer ? `${rejectModalBooking.customer.firstName} ${rejectModalBooking.customer.lastName}` : undefined}
          serviceName={rejectModalBooking.service?.name}
          isLoading={rejectLoading}
        />
      )}

      {/* Assign to Employee Modal - when accepting a pending booking with staff */}
      {assignModalBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('assignBookingToEmployee') || 'Assign booking to employee'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {assignModalBooking.service?.name} – {assignModalBooking.customer?.firstName} {assignModalBooking.customer?.lastName} – {format(new Date(assignModalBooking.appointmentDate), 'MMM d, h:mm a')}
            </p>
            <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
              {assignableEmployees.map((emp: any) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setAssignSelectedEmployee(emp)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    assignSelectedEmployee?.id === emp.id
                      ? 'border-[#E7001E] bg-[#E7001E]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#E7001E]/20 flex items-center justify-center text-[#E7001E] font-semibold text-sm">
                    {(emp.name || '?')[0]}
                  </div>
                  <span className="font-medium text-gray-900">{emp.name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAssignModalBooking(null); setAssignSelectedEmployee(null); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAssignConfirm}
                disabled={!assignSelectedEmployee || assignLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#E7001E] hover:opacity-90 disabled:opacity-50 rounded-lg"
              >
                {assignLoading ? '...' : (t('confirm') || 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Display Modal */}
      {showQRCode && (
        <QRCodeDisplay
          bookingId={showQRCode}
          onClose={() => setShowQRCode(null)}
        />
      )}
    </div>
  );
};
