import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Building2, User, Clock, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface RequestResponseModalProps {
  requestId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Request {
  id: string;
  requestType: 'unsuspension' | 'suspension' | 'verification' | 'appeal' | 'feature_request' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  adminResponse?: string;
  requestedAt: string;
  respondedAt?: string;
  business: {
    id: string;
    name: string;
    owner?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  respondedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const RequestResponseModal: React.FC<RequestResponseModalProps> = ({
  requestId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [responseText, setResponseText] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  // Fetch request details
  const { data: request, isLoading, error } = useQuery<Request>(
    ['request', requestId],
    async () => {
      if (!requestId) return null;
      try {
        console.log('Fetching request with ID:', requestId);
        const response = await api.get(`/requests/${requestId}`);
        console.log('Request fetched successfully:', response.data);
        return response.data;
      } catch (error: any) {
        console.error('Failed to load request:', {
          requestId,
          error: error?.response?.data || error?.message,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
        });
        throw new Error(error?.response?.data?.message || error?.message || 'Failed to load request');
      }
    },
    {
      enabled: !!requestId,
      retry: 1,
    }
  );

  const approveMutation = useMutation(
    async () => {
      if (!requestId) throw new Error('No request ID');
      return api.patch(`/requests/${requestId}/approve`, { response: responseText || undefined });
    },
    {
      onSuccess: () => {
        toast.success('Request approved successfully');
        queryClient.invalidateQueries(['request', requestId]);
        queryClient.invalidateQueries(['requests']);
        queryClient.invalidateQueries(['notifications']);
        queryClient.invalidateQueries(['admin-businesses']);
        onSuccess?.();
        onClose();
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to approve request');
      },
    }
  );

  const rejectMutation = useMutation(
    async () => {
      if (!requestId) throw new Error('No request ID');
      if (!responseText.trim()) {
        throw new Error('Response message is required when rejecting');
      }
      return api.patch(`/requests/${requestId}/reject`, { response: responseText });
    },
    {
      onSuccess: () => {
        toast.success('Request rejected');
        queryClient.invalidateQueries(['request', requestId]);
        queryClient.invalidateQueries(['requests']);
        queryClient.invalidateQueries(['notifications']);
        queryClient.invalidateQueries(['admin-businesses']);
        onSuccess?.();
        onClose();
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to reject request');
      },
    }
  );

  const handleApprove = () => {
    setAction('approve');
    approveMutation.mutate();
  };

  const handleReject = () => {
    if (!responseText.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setAction('reject');
    rejectMutation.mutate();
  };

  if (!requestId) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Request Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                {request?.requestType === 'unsuspension' ? 'Unsuspension Request' : 
                 request?.requestType === 'suspension' ? 'Suspension Request' : 
                 'Request'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold">Failed to load request</p>
                <p className="text-red-600 text-sm mt-2">
                  {error instanceof Error ? error.message : 'An error occurred while loading the request'}
                </p>
                <button
                  onClick={() => queryClient.refetchQueries(['request', requestId])}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !request ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Request not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                  request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                </span>
              </div>

              {/* Business Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{request.business.name}</h3>
                    {request.business.owner && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>
                          {request.business.owner.firstName} {request.business.owner.lastName}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{request.business.owner.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Request Reason */}
              {request.reason && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Request Reason</h4>
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <p className="text-gray-700 whitespace-pre-wrap">{request.reason}</p>
                  </div>
                </div>
              )}

              {/* Admin Response (if already responded) */}
              {request.status !== 'pending' && request.adminResponse && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {request.status === 'approved' ? 'Approval' : 'Rejection'} Response
                  </h4>
                  <div className={`rounded-lg p-4 border-l-4 ${
                    request.status === 'approved' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                  }`}>
                    <p className="text-gray-700 whitespace-pre-wrap">{request.adminResponse}</p>
                    {request.respondedBy && (
                      <p className="text-xs text-gray-500 mt-2">
                        By {request.respondedBy.firstName} {request.respondedBy.lastName}
                        {request.respondedAt && ` • ${formatDistanceToNow(new Date(request.respondedAt), { addSuffix: true })}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Response Input (only if pending) */}
              {request.status === 'pending' && (
                <div>
                  <label className="block font-semibold text-gray-900 mb-2">
                    {action === 'reject' ? 'Rejection Reason' : 'Response Message (Optional)'}
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder={
                      action === 'reject' 
                        ? 'Please provide a reason for rejecting this request...'
                        : 'Add a message to the business owner (optional)...'
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    rows={4}
                    required={action === 'reject'}
                  />
                  {action === 'reject' && (
                    <p className="text-sm text-red-600 mt-1">Response is required when rejecting</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {request && request.status === 'pending' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={rejectMutation.isLoading || approveMutation.isLoading}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {rejectMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Reject
                </>
              )}
            </button>
            <button
              onClick={handleApprove}
              disabled={rejectMutation.isLoading || approveMutation.isLoading}
              className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {approveMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </>
              )}
            </button>
          </div>
        )}

        {request && request.status !== 'pending' && (
          <div className="flex items-center justify-end p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

