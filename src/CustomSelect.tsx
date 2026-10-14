import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  isLoading = false,
  style,
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [maxMenuHeight, setMaxMenuHeight] = useState<number>(260);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to { value, label, icon } format
  const normalizedOptions: SelectOption[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  // Dynamic viewport detection: flip upwards if opening downward would overflow viewport
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const calculatePlacement = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Desired dropdown height
      const targetHeight = 240;

      // If space below is less than targetHeight AND space above is larger, flip upwards!
      if (spaceBelow < targetHeight && spaceAbove > spaceBelow) {
        setPlacement('top');
        setMaxMenuHeight(Math.max(140, Math.min(320, spaceAbove - 20)));
      } else {
        setPlacement('bottom');
        setMaxMenuHeight(Math.max(140, Math.min(320, spaceBelow - 20)));
      }
    };

    calculatePlacement();
    window.addEventListener('resize', calculatePlacement);
    window.addEventListener('scroll', calculatePlacement, true);
    return () => {
      window.removeEventListener('resize', calculatePlacement);
      window.removeEventListener('scroll', calculatePlacement, true);
    };
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = normalizedOptions.findIndex(opt => opt.value === value);
        const nextIndex = currentIndex < normalizedOptions.length - 1 ? currentIndex + 1 : 0;
        onChange(normalizedOptions[nextIndex].value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = normalizedOptions.findIndex(opt => opt.value === value);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : normalizedOptions.length - 1;
        onChange(normalizedOptions[prevIndex].value);
      }
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={style}
    >
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className="custom-select-label"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}
        >
          {selectedOption?.icon && (
            <span className="custom-select-icon-wrap">{selectedOption.icon}</span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
          {isLoading && (
            <Loader2
              size={16}
              className="animate-spin"
              style={{ color: 'var(--color-text-muted)' }}
            />
          )}
          <ChevronDown
            size={18}
            className={`custom-select-chevron ${isOpen ? 'is-open' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className={`custom-select-dropdown custom-select-dropdown--${placement}`}
          style={{ maxHeight: `${maxMenuHeight}px` }}
          role="listbox"
        >
          {normalizedOptions.length === 0 ? (
            <div className="custom-select-empty">No options available</div>
          ) : (
            normalizedOptions.map(opt => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  className={`custom-select-option ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span
                    className="custom-select-option-content"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}
                  >
                    {opt.icon && (
                      <span className="custom-select-icon-wrap">{opt.icon}</span>
                    )}
                    <span className="custom-select-option-text">{opt.label}</span>
                  </span>
                  {isSelected && (
                    <Check
                      size={16}
                      className="custom-select-check"
                      style={{ color: 'var(--color-accent)', flexShrink: 0, marginLeft: '8px' }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
