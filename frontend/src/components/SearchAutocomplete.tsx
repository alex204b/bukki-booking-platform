import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useQuery } from 'react-query';
import { businessService } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (business: any) => void;
  placeholder?: string;
  className?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Search businesses...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('recentSearches');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed);
          }
        }
      }
    } catch (error) {
      console.error('[SearchAutocomplete] Error loading recent searches:', error);
      // Continue without recent searches
    }
  }, []);

  // Search businesses
  const { data: searchResults, isLoading } = useQuery(
    ['business-search', value],
    () => businessService.search(value, undefined, undefined),
    {
      enabled: value.length >= 2,
      select: (response) => response.data || [],
    }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (business: any) => {
    onChange(business.name);
    setIsOpen(false);
    
    // Save to recent searches
    try {
      const updated = [business.name, ...recentSearches.filter(s => s !== business.name)].slice(0, 5);
      setRecentSearches(updated);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('[SearchAutocomplete] Error saving recent searches:', error);
      // Continue without saving - not critical
    }

    if (onSelect) {
      onSelect(business);
    } else {
      navigate(`/businesses/${business.id}`);
    }
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const handleRecentSearch = (search: string) => {
    onChange(search);
    setIsOpen(true);
  };

  const showSuggestions = isOpen && (value.length >= 2 || recentSearches.length > 0);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="input pl-10 pr-10"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {value.length >= 2 && searchResults && searchResults.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Businesses
              </div>
              {isLoading ? (
                <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
              ) : (
                searchResults.slice(0, 5).map((business: any) => (
                  <button
                    key={business.id}
                    onClick={() => handleSelect(business)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="font-medium text-gray-900">{business.name}</div>
                    <div className="text-sm text-gray-500">
                      {business.category} • {business.city}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {value.length < 2 && recentSearches.length > 0 && (
            <div className="p-2 border-t">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearch(search)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
                >
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{search}</span>
                </button>
              ))}
            </div>
          )}

          {value.length >= 2 && !isLoading && (!searchResults || searchResults.length === 0) && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No businesses found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

