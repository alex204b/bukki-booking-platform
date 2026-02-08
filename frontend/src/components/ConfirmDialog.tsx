import React from 'react';
import { X, AlertCircle, LogOut, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Use "danger" for logout, "delete" for delete/remove actions */
  variant?: 'default' | 'danger' | 'delete';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger' || variant === 'delete';
  const Icon = variant === 'delete' ? Trash2 : isDanger ? LogOut : AlertCircle;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full transform transition-all border border-gray-100">
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="p-6 pt-8">
            <div className={`flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full ${isDanger ? 'bg-red-50' : 'bg-accent-100'}`}>
              <Icon className={`${isDanger ? 'h-7 w-7 text-[#E7001E]' : 'h-6 w-6 text-accent-600'}`} />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              {title}
            </h3>
            
            <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
              {message}
            </p>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 text-sm font-medium text-white rounded-xl transition-colors ${
                  isDanger
                    ? 'bg-[#E7001E] hover:opacity-90 border border-[#E7001E]'
                    : 'bg-accent-500 hover:bg-accent-600 border border-accent-500'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

