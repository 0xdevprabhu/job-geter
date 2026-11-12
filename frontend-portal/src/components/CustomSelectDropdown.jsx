import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function CustomSelectDropdown({
  icon: Icon,
  iconColor = 'text-blue-600',
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  searchable = true,
  fullWidth = true,
  alignRight = false,
  className = '',
  buttonClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!filterText.trim()) return options;
    const query = filterText.toLowerCase();
    return options.filter((opt) => {
      const label = typeof opt === 'string' ? opt : opt.label;
      return label.toLowerCase().includes(query);
    });
  }, [options, filterText]);

  // Selected label display
  const currentLabel = useMemo(() => {
    const found = options.find((opt) => (typeof opt === 'string' ? opt === value : opt.value === value));
    if (found) {
      return typeof found === 'string' ? found : found.label;
    }
    return placeholder;
  }, [options, value, placeholder]);

  return (
    <div className={`relative min-w-0 ${fullWidth ? 'w-full' : ''} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setFilterText('');
        }}
        className={`${fullWidth ? 'w-full' : ''} min-w-0 overflow-hidden flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100/90 border ${
          isOpen ? 'border-[#1E60FF] ring-2 ring-blue-100 bg-white' : 'border-slate-200/90'
        } rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-all text-left shadow-2xs ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />}
          <span className="truncate block font-semibold text-slate-800">{currentLabel}</span>
        </div>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Custom Popup Menu */}
      {isOpen && (
        <div className={`absolute top-full mt-1.5 ${
          alignRight ? 'right-0' : 'left-0'
        } ${
          fullWidth ? 'w-full min-w-[220px]' : 'min-w-[200px] max-w-[320px]'
        } max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
          {searchable && options.length > 6 && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type to filter..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const optVal = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const isSelected = optVal === value;

                return (
                  <button
                    key={optVal}
                    type="button"
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                      setFilterText('');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-[#1E60FF] font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate pr-2">{optLabel}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1E60FF] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

