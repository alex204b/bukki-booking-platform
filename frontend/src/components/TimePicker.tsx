import React, { useState, useRef, useEffect } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [hour, minute] = (value || '09:00').split(':');
  const displayHour = hour?.padStart(2, '0') || '09';
  const displayMinute = minute?.padStart(2, '0') || '00';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleSelect = (h: string, m: string) => {
    onChange(`${h}:${m}`);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-w-[7rem] min-h-[40px] flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left bg-[#fef2f2] border-2 border-[#fecaca] hover:border-[#330007]/30 focus:border-[#330007] focus:ring-2 focus:ring-[#330007]/20 focus:outline-none transition-colors"
      >
        <span className="font-medium text-gray-800">{displayHour}:{displayMinute}</span>
        <svg className="h-4 w-4 text-[#330007]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 flex rounded-xl bg-[#fef2f2] border-2 border-[#fecaca] shadow-lg overflow-hidden overflow-x-hidden">
          <div className="max-h-48 overflow-y-auto overflow-x-hidden py-1 min-w-[3.5rem]">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleSelect(h, displayMinute)}
                className={`w-14 px-2 py-1.5 text-sm font-medium transition-colors text-center ${
                  h === displayHour ? 'bg-[#330007] text-white' : 'text-gray-800 hover:bg-[#330007]/10'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="max-h-48 overflow-y-auto overflow-x-hidden py-1 border-l border-[#fecaca] min-w-[3.5rem]">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleSelect(displayHour, m)}
                className={`w-14 px-2 py-1.5 text-sm font-medium transition-colors text-center ${
                  m === displayMinute ? 'bg-[#330007] text-white' : 'text-gray-800 hover:bg-[#330007]/10'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
