import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api, resourceService, bookingService, serviceService, messageService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { format, isFuture, isPast } from 'date-fns';
import { Table2, ChevronLeft, Plus, Trash2, Pencil, User, Check, XCircle, Clock, AlertCircle, CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RejectBookingModal } from '../components/RejectBookingModal';
import { BookingDetailsModal } from '../components/BookingDetailsModal';
import { CreateBookingModal } from '../components/CreateBookingModal';

type ViewMode = 'layout' | 'workers';

interface TablesLayoutProps {
  defaultViewMode?: ViewMode;
}

export const TablesLayout: React.FC<TablesLayoutProps> = ({ defaultViewMode }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isBusinessOwner = user?.role === 'business_owner';
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode || 'layout');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; tableId: string } | null>(null);
  const [tablePositions, setTablePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [editResourceId, setEditResourceId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState<string>('');
  const [seatsInput, setSeatsInput] = useState<number | ''>('');
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [assignModalBooking, setAssignModalBooking] = useState<any | null>(null);
  const [assignSelectedTableId, setAssignSelectedTableId] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [rejectModalBooking, setRejectModalBooking] = useState<any | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const DRAG_THRESHOLD_PX = 6;

  const { data: business } = useQuery(
    ['my-business'],
    () => api.get('/businesses/my-business').then((r) => r.data),
  );
  const businessData = Array.isArray(business) ? business[0] : business;

  const { data: businessServices = [] } = useQuery(
    ['business-services', businessData?.id],
    () => serviceService.getByBusiness(businessData?.id).then((r) => r.data),
    { enabled: !!businessData?.id },
  );
  const tableService = (Array.isArray(businessServices) ? businessServices : []).find(
    (s: any) => s.resourceType === 'table' || s.resourceType === 'TABLE'
  );
  const staffService = (Array.isArray(businessServices) ? businessServices : []).find(
    (s: any) => s.resourceType === 'staff' || s.resourceType === 'STAFF'
  ) || (Array.isArray(businessServices) ? businessServices : [])[0]; // fallback to first service

  const { data: tables = [] } = useQuery(
    ['resources-tables', businessData?.id],
    () => resourceService.getAll(businessData?.id).then((r) => r.data),
    {
      enabled: !!businessData?.id,
      select: (data: any) =>
        (Array.isArray(data) ? data : data?.data || []).filter(
          (r: any) => (r.type === 'table' || r.type === 'TABLE') && r.isActive !== false,
        ),
    },
  );

  const { data: workers = [] } = useQuery(
    ['resources-staff', businessData?.id],
    () => resourceService.getAll(businessData?.id).then((r) => r.data),
    {
      enabled: !!businessData?.id,
      select: (data: any) =>
        (Array.isArray(data) ? data : data?.data || []).filter(
          (r: any) => (r.type === 'staff' || r.type === 'STAFF') && r.isActive !== false,
        ),
    },
  );

  const { data: allBookings = [], refetch: refetchBookings } = useQuery(
    ['bookings', businessData?.id],
    () => bookingService.getAll().then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || [])),
    { enabled: !!businessData?.id },
  );

  const businessBookings = (allBookings as any[]).filter(
    (b: any) => (b.business?.id || b.businessId) === businessData?.id,
  );

  // Filter tables to only show those available at the booking's time (exclude busy tables)
  const availableTablesForAssign = React.useMemo((): any[] => {
    if (!assignModalBooking || !tables?.length) return [];
    const start = new Date(assignModalBooking.appointmentDate);
    const duration = assignModalBooking.service?.duration || 90;
    const end = new Date(start.getTime() + duration * 60000);

    const conflictingResourceIds = new Set(
      (businessBookings || [])
        .filter(
          (b: any) =>
            (b.status === 'pending' || b.status === 'confirmed') &&
            b.id !== assignModalBooking.id,
        )
        .filter((b: any) => {
          const bStart = new Date(b.appointmentDate);
          const bDuration = b.service?.duration || 90;
          const bEnd = new Date(bStart.getTime() + bDuration * 60000);
          return start < bEnd && end > bStart;
        })
        .map((b: any) => b.resource?.id || b.resourceId)
        .filter(Boolean),
    );

    return (tables as any[]).filter((tbl: any) => !conflictingResourceIds.has(tbl.id));
  }, [assignModalBooking, tables, businessBookings]);

  // Clear selected table if it's no longer in the available list
  React.useEffect(() => {
    if (assignModalBooking && assignSelectedTableId && availableTablesForAssign.length > 0) {
      const stillAvailable = availableTablesForAssign.some((t: any) => t.id === assignSelectedTableId);
      if (!stillAvailable) setAssignSelectedTableId('');
    }
  }, [assignModalBooking, assignSelectedTableId, availableTablesForAssign]);

  // Clear drag state when mouse is released anywhere (e.g. outside layout)
  useEffect(() => {
    if (!dragStart) return;
    const onWindowMouseUp = () => {
      setDragStart(null);
      setDraggingTableId(null);
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [dragStart]);

  // Initialize / hydrate table positions from metadata or sensible defaults
  useEffect(() => {
    if (!tables || tables.length === 0) return;

    setTablePositions((prev) => {
      const next = { ...prev };
      (tables as any[]).forEach((tbl: any, index: number) => {
        if (!tbl?.id) return;

        const meta = tbl.metadata || {};
        if (typeof meta.x === 'number' && typeof meta.y === 'number') {
          next[tbl.id] = { x: meta.x, y: meta.y };
          return;
        }

        if (!next[tbl.id]) {
          // Simple grid-like default placement (normalized 0–1 coordinates)
          const cols = 4;
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = (col + 1) / (cols + 1);
          const y = (row + 1) / (cols + 2);
          next[tbl.id] = { x, y };
        }
      });
      return next;
    });
  }, [tables]);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const updateTablePositionMutation = useMutation(
    async ({ tableId, x, y }: { tableId: string; x: number; y: number }) => {
      const current = (tables as any[]).find((t: any) => t.id === tableId);
      const currentMeta = (current && current.metadata) || {};
      await resourceService.update(tableId, {
        metadata: {
          ...currentMeta,
          x,
          y,
        },
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['resources-tables', businessData?.id]);
      },
    },
  );

  const handleLayoutMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!layoutRef.current || !dragStart) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance >= DRAG_THRESHOLD_PX && !draggingTableId) {
      setDraggingTableId(dragStart.tableId);
    }

    if (!draggingTableId) return;

    const rect = layoutRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const clampedX = clamp(x, 0.05, 0.95);
    const clampedY = clamp(y, 0.05, 0.95);
    setTablePositions((prev) => ({
      ...prev,
      [draggingTableId]: { x: clampedX, y: clampedY },
    }));
  };

  const handleLayoutMouseUp = () => {
    const tableId = dragStart?.tableId;
    if (draggingTableId) {
      const pos = tablePositions[draggingTableId];
      if (pos) {
        updateTablePositionMutation.mutate({
          tableId: draggingTableId,
          x: pos.x,
          y: pos.y,
        });
      }
      setDraggingTableId(null);
    } else if (tableId) {
      setSelectedTableId(tableId);
    }
    setDragStart(null);
  };

  const addWorkerMutation = useMutation(
    async () => {
      const nextNum = (workers as any[]).length + 1;
      const res = await resourceService.create({
        name: `${t('worker') || 'Worker'} ${nextNum}`,
        type: 'staff',
        businessId: businessData?.id,
        capacity: 1,
        sortOrder: nextNum,
      });
      const resource = res?.data;
      if (resource?.id && staffService?.id) {
        try {
          await resourceService.linkToService(resource.id, staffService.id);
        } catch (e) {
          // Ignore link errors - resource is still created
        }
      }
      return resource;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['resources-staff', businessData?.id]);
        toast.success(t('resourceAdded') || 'Resource added');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || t('failedToAddResource') || 'Failed to add resource');
      },
    }
  );

  const addResourceMutation = useMutation(
    async () => {
      const nextNum = tables.length + 1;
      const res = await resourceService.create({
        name: `${t('resource') || 'Resource'} ${nextNum}`,
        type: 'table',
        businessId: businessData?.id,
        capacity: 4,
        sortOrder: nextNum,
      });
      const resource = res?.data;
      if (resource?.id && tableService?.id) {
        await resourceService.linkToService(resource.id, tableService.id);
      }
      return resource;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['resources-tables', businessData?.id]);
        toast.success(t('resourceAdded') || 'Resource added');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || t('failedToAddResource') || 'Failed to add resource');
      },
    }
  );

  const removeResourceMutation = useMutation(
    async (resourceId: string) => {
      await resourceService.delete(resourceId);
    },
    {
      onSuccess: () => {
        setSelectedTableId(null);
        setSelectedWorkerId(null);
        queryClient.invalidateQueries(['resources-tables', businessData?.id]);
        queryClient.invalidateQueries(['resources-staff', businessData?.id]);
        queryClient.invalidateQueries(['bookings', businessData?.id]);
        toast.success(t('resourceRemoved') || 'Resource removed');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || t('failedToRemoveResource') || 'Failed to remove resource');
      },
    }
  );

  const selectedTable = tables.find((tbl: any) => tbl.id === selectedTableId);
  const selectedWorker = (workers as any[]).find((w: any) => w.id === selectedWorkerId);
  const tableBookings = selectedTableId
    ? businessBookings.filter(
        (b: any) => (b.resource?.id || b.resourceId) === selectedTableId,
      )
    : [];
  const workerBookings = selectedWorkerId
    ? businessBookings.filter(
        (b: any) => (b.resource?.id || b.resourceId) === selectedWorkerId,
      )
    : [];

  // Sync name and seats when edit modal opens
  useEffect(() => {
    if (!editResourceId) {
      setNameInput('');
      setSeatsInput('');
      return;
    }
    const fromTables = (tables as any[]).find((t: any) => t.id === editResourceId);
    const fromWorkers = (workers as any[]).find((w: any) => w.id === editResourceId);
    const resource = fromTables || fromWorkers;
    setNameInput(resource?.name ?? '');
    setSeatsInput(resource?.capacity ?? (fromWorkers ? 1 : 4));
  }, [editResourceId, tables, workers]);

  const updateResourceMutation = useMutation(
    async ({ resourceId, name, capacity }: { resourceId: string; name: string; capacity: number }) => {
      await resourceService.update(resourceId, { name, capacity });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['resources-tables', businessData?.id]);
        queryClient.invalidateQueries(['resources-staff', businessData?.id]);
        toast.success(t('resourceUpdated') || 'Resource updated');
        setEditResourceId(null);
      },
      onError: (err: any) => {
        toast.error(
          err?.response?.data?.message ||
            t('failedToUpdateResource') ||
            'Failed to update resource',
        );
      },
    },
  );

  const editResource = editResourceId
    ? (tables as any[]).find((t: any) => t.id === editResourceId) ||
      (workers as any[]).find((w: any) => w.id === editResourceId)
    : null;

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await bookingService.cancel(bookingId, 'Cancelled by business');
      toast.success(t('bookingCancelledSuccessfully') || 'Booking cancelled');
      queryClient.invalidateQueries(['bookings', businessData?.id]);
      queryClient.invalidateQueries(['my-bookings']);
      refetchBookings();
      setSelectedBooking(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('failedToCancelBooking') || 'Failed to cancel booking');
    }
  };

  const handleAcceptClick = (booking: any) => {
    if (tables.length > 0) {
      setAssignModalBooking(booking);
      setAssignSelectedTableId('');
    } else {
      toast.error(t('addResourceFirst') || 'Add at least one table before accepting bookings');
    }
  };

  const handleAssignToTableConfirm = async () => {
    if (!assignModalBooking || !assignSelectedTableId) {
      toast.error(t('selectResource') || 'Please select a table');
      return;
    }
    try {
      setAssignLoading(true);
      await bookingService.updateStatus(assignModalBooking.id, 'confirmed', undefined, assignSelectedTableId);
      toast.success(t('bookingAccepted') || 'Booking accepted successfully');
      setAssignModalBooking(null);
      setAssignSelectedTableId('');
      queryClient.invalidateQueries(['bookings', businessData?.id]);
      queryClient.invalidateQueries(['my-bookings']);
      refetchBookings();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || t('failedToAcceptBooking') || 'Failed to accept booking');
    } finally {
      setAssignLoading(false);
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
      queryClient.invalidateQueries(['bookings', businessData?.id]);
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries('chat-conversation');
      queryClient.invalidateQueries('chat-conversations');
      refetchBookings();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('failedToRejectBooking') || 'Failed to reject booking');
    } finally {
      setRejectLoading(false);
    }
  };

  if (!businessData) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E7001E]" />
      </div>
    );
  }

  const isParallel = businessData?.businessType === 'parallel';
  const isLayoutView = isParallel || viewMode === 'layout';

  const pendingBookings = isParallel
    ? businessBookings.filter(
        (b: any) =>
          (b.status === 'pending' || b.status === 'PENDING') &&
          (isFuture(new Date(b.appointmentDate)) || !isPast(new Date(b.appointmentDate))),
      )
    : [];

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {t('resourcesLayout') || 'Arrange Resources'}
          </h1>
          {/* View mode toggle - only for personal_service (workers) businesses */}
          {!isParallel && (
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => setViewMode('layout')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'layout'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('viewLayout') || 'Layout'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('workers')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'workers'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('viewWorkers') || 'Workers'}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(isParallel || !isLayoutView) && (
            <button
              type="button"
              onClick={() => setShowCreateBooking(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#E7001E] px-4 py-2 text-sm font-medium text-white hover:bg-[#c50018] disabled:opacity-50"
            >
              <CalendarPlus className="h-4 w-4" />
              {t('createReservation') || 'Create reservation'}
            </button>
          )}
          {isLayoutView && tables.length > 0 && (
            <button
              type="button"
              onClick={() => addResourceMutation.mutate()}
              disabled={addResourceMutation.isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#330007] px-4 py-2 text-sm font-medium text-white hover:bg-[#330007]/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t('addResource') || 'Add resource'}
            </button>
          )}
          {!isLayoutView && (
            <button
              type="button"
              onClick={() => navigate('/business-dashboard#team')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#330007] px-4 py-2 text-sm font-medium text-white hover:bg-[#330007]/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t('addWorker') || 'Add worker'}
            </button>
          )}
        </div>
      </div>

      {isLayoutView ? (
        tables.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="text-center p-8">
            <Table2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              {t('noResourcesYet') || 'No resources configured yet'}
            </p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {t('addResourcesHint') || 'Add your first resource to start receiving reservations'}
            </p>
            <button
              type="button"
              onClick={() => addResourceMutation.mutate()}
              disabled={addResourceMutation.isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#330007] px-4 py-2 text-sm font-medium text-white hover:bg-[#330007]/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t('addResource') || 'Add resource'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto">
          <div
            ref={layoutRef}
            className="relative bg-gray-50 rounded-xl border border-dashed border-gray-300 min-h-[420px] md:min-h-[520px] overflow-hidden"
            onMouseMove={handleLayoutMouseMove}
            onMouseUp={handleLayoutMouseUp}
            onMouseLeave={handleLayoutMouseUp}
          >
            {(tables as any[]).map((tbl: any) => {
              const hasFutureBookings = businessBookings.some(
                (b: any) =>
                  (b.resource?.id || b.resourceId) === tbl.id &&
                  new Date(b.appointmentDate) > new Date(),
              );
              const position = tablePositions[tbl.id] || { x: 0.5, y: 0.5 };

              return (
                <div
                  key={tbl.id}
                  data-table-id={tbl.id}
                  className="absolute group cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${position.x * 100}%`,
                    top: `${position.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDragStart({ x: e.clientX, y: e.clientY, tableId: tbl.id });
                    }}
                    className={`w-24 h-24 rounded-xl border-2 flex flex-col items-center justify-center shadow-sm transition-colors ${
                      selectedTableId === tbl.id
                        ? 'border-[#330007] bg-[#fef2f2]'
                        : 'border-gray-200 hover:border-[#330007]/30 bg-white'
                    }`}
                  >
                    <Table2 className="h-7 w-7 text-gray-600 mb-1" />
                    <span className="font-semibold text-xs text-gray-900">
                      {tbl.name}
                    </span>
                    {tbl.capacity && (
                      <span className="text-[11px] text-gray-500">
                        {tbl.capacity} {t('seats') || 'seats'}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditResourceId(tbl.id);
                      setNameInput(tbl?.name ?? '');
                      setSeatsInput(tbl?.capacity ?? 4);
                    }}
                    className="absolute -top-2 -left-2 p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                    title={t('editResource') || 'Edit resource'}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasFutureBookings) {
                        toast.error(
                          t('cannotRemoveResourceWithBookings') ||
                            'Cannot remove resource with future bookings',
                        );
                        return;
                      }
                      setDeleteResourceId(tbl.id);
                    }}
                    disabled={removeResourceMutation.isLoading}
                    className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                    title={t('removeResource') || 'Remove resource'}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-y-auto">
            {/* Pending bookings - parallel businesses only */}
            {isParallel && pendingBookings.length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-[#E7001E]" />
                  <h2 className="font-semibold text-gray-900">
                    {t('pendingBookings') || 'Pending bookings'}
                  </h2>
                </div>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {pendingBookings.map((b: any) => (
                    <li key={b.id} className="bg-red-50 rounded-lg p-2.5 border border-red-100">
                      <div className="flex flex-col gap-1.5 mb-2">
                        <span className="font-medium text-sm text-gray-900">
                          {b.service?.name || t('serviceName')}
                        </span>
                        <span className="text-xs text-gray-600">
                          {b.customer?.firstName} {b.customer?.lastName}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(b.appointmentDate), 'MMM d, HH:mm')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptClick(b)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-[#E7001E] hover:opacity-90 rounded-md"
                        >
                          <Check className="h-3 w-3" />
                          {t('accept') || 'Accept'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectClick(b)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-300 hover:bg-red-50 rounded-md"
                        >
                          <XCircle className="h-3 w-3" />
                          {t('reject') || 'Reject'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedTable ? (
              <>
                <h2 className="font-semibold text-gray-900 mb-3">
                  {selectedTable.name} – {t('reservations') || 'Reservations'}
                </h2>
                {tableBookings.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {t('noReservationsForResource') || 'No reservations for this resource'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {tableBookings
                      .sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
                      .map((b: any) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(b)}
                            className="w-full flex justify-between items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                          >
                            <span className="font-medium">
                              {b.customer?.firstName} {b.customer?.lastName}
                            </span>
                            <span className="text-sm text-gray-600">
                              {format(new Date(b.appointmentDate), 'MMM d, HH:mm')}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {t('clickResourceToViewReservations') || 'Click a resource to view its reservations'}
              </p>
            )}
          </div>
        </div>
        )
      ) : (
        /* Workers view */
        (workers as any[]).length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-center p-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {t('noWorkersYet') || 'No workers configured yet'}
              </p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                {t('addWorkersHint') || 'Add your first worker to start receiving reservations'}
              </p>
              <button
                type="button"
                onClick={() => addWorkerMutation.mutate()}
                disabled={addWorkerMutation.isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#330007] px-4 py-2 text-sm font-medium text-white hover:bg-[#330007]/90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {t('addWorker') || 'Add worker'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto">
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(workers as any[]).map((worker: any) => {
                  const hasFutureBookings = businessBookings.some(
                    (b: any) =>
                      (b.resource?.id || b.resourceId) === worker.id &&
                      new Date(b.appointmentDate) > new Date(),
                  );
                  return (
                    <div
                      key={worker.id}
                      className={`relative group rounded-xl border-2 flex flex-col items-center justify-center p-4 min-h-[100px] transition-colors ${
                        selectedWorkerId === worker.id
                          ? 'border-[#330007] bg-[#fef2f2]'
                          : 'border-gray-200 hover:border-[#330007]/30 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedWorkerId(worker.id)}
                        className="absolute inset-0 w-full h-full rounded-xl"
                      />
                      <User className="h-8 w-8 text-gray-600 mb-2" />
                      <span className="font-semibold text-sm text-gray-900 text-center truncate w-full">
                        {worker.name}
                      </span>
                      {worker.capacity > 1 && (
                        <span className="text-xs text-gray-500">
                          {worker.capacity} {t('seats') || 'seats'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditResourceId(worker.id);
                          setNameInput(worker?.name ?? '');
                          setSeatsInput(worker?.capacity ?? 1);
                        }}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                        title={t('editResource') || 'Edit resource'}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasFutureBookings) {
                            toast.error(
                              t('cannotRemoveResourceWithBookings') ||
                                'Cannot remove resource with future bookings',
                            );
                            return;
                          }
                          setDeleteResourceId(worker.id);
                        }}
                        disabled={removeResourceMutation.isLoading}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                        title={t('removeResource') || 'Remove resource'}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              {selectedWorker ? (
                <>
                  <h2 className="font-semibold text-gray-900 mb-3">
                    {selectedWorker.name} – {t('reservations') || 'Reservations'}
                  </h2>
                  {workerBookings.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {t('noReservationsForResource') || 'No reservations for this resource'}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {workerBookings
                        .sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
                        .map((b: any) => (
                          <li key={b.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedBooking(b)}
                              className="w-full flex justify-between items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                            >
                              <span className="font-medium">
                                {b.customer?.firstName} {b.customer?.lastName}
                              </span>
                              <span className="text-sm text-gray-600">
                                {format(new Date(b.appointmentDate), 'MMM d, HH:mm')}
                              </span>
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t('clickResourceToViewReservations') || 'Click a worker to view reservations'}
                </p>
              )}
            </div>
          </div>
        )
      )}

      {/* Edit resource modal – name (and seats for layout resources only) */}
      {editResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditResourceId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-gray-500 mb-1">
              {t('resourceName') || 'Name'}
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={`${t('resource') || 'Resource'} 1`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#330007]/40 focus:border-[#330007] mb-4"
            />
            {((editResource as any).type === 'staff' || (editResource as any).type === 'STAFF') ? null : (
              <>
                <p className="text-sm text-gray-500 mb-1">
                  {t('seats') || 'Seats'}
                </p>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={seatsInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setSeatsInput('');
                      return;
                    }
                    const num = parseInt(value, 10);
                    if (!Number.isNaN(num) && num > 0 && num <= 50) {
                      setSeatsInput(num);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#330007]/40 focus:border-[#330007] mb-4"
                />
              </>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditResourceId(null)}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmedName = nameInput.trim();
                  if (!trimmedName) {
                    toast.error(t('pleaseEnterResourceName') || 'Please enter a name for the resource');
                    return;
                  }
                  const isWorker = (editResource as any).type === 'staff' || (editResource as any).type === 'STAFF';
                  const capacity = isWorker
                    ? (editResource.capacity ?? 1)
                    : (typeof seatsInput === 'number' ? seatsInput : parseInt(String(seatsInput || '0'), 10));
                  if (!isWorker && (!capacity || capacity < 1)) {
                    toast.error(
                      t('pleaseEnterPartySize') ||
                        'Please enter the number of guests',
                    );
                    return;
                  }
                  updateResourceMutation.mutate({
                    resourceId: editResource.id,
                    name: trimmedName,
                    capacity,
                  });
                }}
                disabled={
                  updateResourceMutation.isLoading ||
                  !nameInput.trim() ||
                  (((editResource as any).type !== 'staff' && (editResource as any).type !== 'STAFF') &&
                    (typeof seatsInput !== 'number' || seatsInput < 1)) ||
                  (nameInput.trim() === editResource.name &&
                    (((editResource as any).type === 'staff' || (editResource as any).type === 'STAFF') || seatsInput === editResource.capacity))
                }
                className="px-3 py-2 text-sm font-medium text-white bg-[#330007] hover:bg-[#330007]/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('save') || 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Table Modal - when accepting a pending booking (parallel businesses) */}
      {assignModalBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('assignBookingToResource') || 'Assign booking to table'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {assignModalBooking.service?.name} – {assignModalBooking.customer?.firstName} {assignModalBooking.customer?.lastName} – {format(new Date(assignModalBooking.appointmentDate), 'MMM d, HH:mm')}
            </p>
            <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
              {availableTablesForAssign.length === 0 ? (
                <p className="text-sm text-amber-600 py-2">
                  {t('noAvailableTablesAtThisTime') || 'No tables available at this time. All tables are booked.'}
                </p>
              ) : (
              availableTablesForAssign.map((tbl: any) => (
                <button
                  key={tbl.id}
                  type="button"
                  onClick={() => setAssignSelectedTableId(tbl.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    assignSelectedTableId === tbl.id
                      ? 'border-[#E7001E] bg-[#E7001E]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Table2 className="h-6 w-6 text-gray-600" />
                  <span className="font-medium text-gray-900">{tbl.name}</span>
                  {tbl.capacity && (
                    <span className="text-sm text-gray-500">
                      {tbl.capacity} {t('seats') || 'seats'}
                    </span>
                  )}
                </button>
              )))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAssignModalBooking(null); setAssignSelectedTableId(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAssignToTableConfirm}
                disabled={!assignSelectedTableId || assignLoading || availableTablesForAssign.length === 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#E7001E] hover:opacity-90 disabled:opacity-50 rounded-lg"
              >
                {assignLoading ? '...' : (t('confirm') || 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={{
            id: selectedBooking.id,
            appointmentDate: selectedBooking.appointmentDate,
            status: selectedBooking.status,
            notes: selectedBooking.notes,
            business: {
              id: selectedBooking.business?.id || selectedBooking.businessId,
              name: selectedBooking.business?.name || selectedBooking.businessName || 'Unknown',
              address: selectedBooking.business?.address,
              phone: selectedBooking.business?.phone,
              category: selectedBooking.business?.category,
            },
            service: {
              name: selectedBooking.service?.name || selectedBooking.serviceName || 'Unknown',
              duration: selectedBooking.service?.duration || 0,
            },
            customer: selectedBooking.customer ? {
              id: selectedBooking.customer.id,
              firstName: selectedBooking.customer.firstName,
              lastName: selectedBooking.customer.lastName,
              email: selectedBooking.customer.email,
            } : undefined,
            totalAmount: Number(selectedBooking.totalAmount || selectedBooking.service?.price || 0),
          }}
          onClose={() => setSelectedBooking(null)}
          onCancel={
            isBusinessOwner
              ? () => {
                  if (window.confirm(t('areYouSureCancel') || 'Are you sure you want to cancel?')) {
                    handleCancelBooking(selectedBooking.id);
                  }
                }
              : undefined
          }
          isBusinessOwner={isBusinessOwner}
          currentUserId={user?.id}
        />
      )}

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

      {/* Create reservation modal - parallel (tables) or personal_service (workers) */}
      {showCreateBooking && (
        <CreateBookingModal
          isOpen={showCreateBooking}
          onClose={() => setShowCreateBooking(false)}
          selectedDate={new Date()}
          businessId={businessData?.id || ''}
          showTableSelector={isParallel}
          showWorkerSelector={!isParallel}
          onBookingCreated={() => {
            queryClient.invalidateQueries(['bookings', businessData?.id]);
            queryClient.invalidateQueries(['my-bookings']);
            refetchBookings();
            setShowCreateBooking(false);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteResourceId}
        title={t('removeResource') || 'Remove resource'}
        message={t('confirmRemoveResource') || 'Remove this resource?'}
        confirmText={t('remove') || 'Remove'}
        cancelText={t('cancel') || 'Cancel'}
        variant="delete"
        onConfirm={() => {
          if (deleteResourceId) {
            removeResourceMutation.mutate(deleteResourceId);
            setDeleteResourceId(null);
          }
        }}
        onCancel={() => setDeleteResourceId(null)}
      />
    </div>
  );
};
