import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4 p-4 bg-accent-100 rounded-full">
        <Icon className="h-12 w-12 text-accent-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-accent btn-md"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// Predefined empty states
export const EmptyBookings: React.FC<{ onCreateBooking?: () => void }> = ({ onCreateBooking }) => (
  <EmptyState
    icon={require('lucide-react').Calendar}
    title="No Bookings Yet"
    description="You haven't made any bookings yet. Start by browsing businesses and booking a service."
    action={onCreateBooking ? {
      label: "Browse Businesses",
      onClick: onCreateBooking,
    } : undefined}
  />
);

export const EmptyBusinesses: React.FC<{ onSearch?: () => void }> = ({ onSearch }) => (
  <EmptyState
    icon={require('lucide-react').Search}
    title="No Businesses Found"
    description="We couldn't find any businesses matching your search. Try adjusting your filters or search terms."
    action={onSearch ? {
      label: "Clear Filters",
      onClick: onSearch,
    } : undefined}
  />
);

export const EmptyServices: React.FC = () => (
  <EmptyState
    icon={require('lucide-react').Settings}
    title="No Services Available"
    description="This business hasn't added any services yet. Check back later or contact the business directly."
  />
);

export const EmptyNotifications: React.FC = () => (
  <EmptyState
    icon={require('lucide-react').Bell}
    title="No Notifications"
    description="You're all caught up! You'll see notifications here when you receive booking updates, messages, and more."
  />
);

export const EmptyFavorites: React.FC<{ onBrowse?: () => void }> = ({ onBrowse }) => (
  <EmptyState
    icon={require('lucide-react').Heart}
    title="No Favorite Businesses"
    description="Save your favorite businesses for quick access. Click the heart icon on any business to add it to your favorites."
    action={onBrowse ? {
      label: "Browse Businesses",
      onClick: onBrowse,
    } : undefined}
  />
);

