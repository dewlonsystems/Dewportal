// =============================================================================
// DEWPORTAL FRONTEND - DROPDOWN COMPONENT
// =============================================================================

'use client';

import {
  ReactNode,
  useState,
  useRef,
  useEffect,
} from 'react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DropdownItem {
  label?: string;  // Optional for dividers
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  divider?: boolean;
  variant?: 'default' | 'danger';
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: 'sm' | 'md' | 'lg';
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function Dropdown({
  trigger,
  items,
  align = 'left',
  width = 'md',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const widthStyles = {
    sm: 'w-40',
    md: 'w-48',
    lg: 'w-64',
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Trigger */}
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-dropdown mt-2 bg-surface rounded-md border border-border shadow-lg py-1',
            widthStyles[width],
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <hr key={index} className="my-1 border-border" />;
            }

            return (
              <button
                key={index}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                  {
                    'text-text hover:bg-background': !item.disabled && item.variant !== 'danger',
                    'text-error hover:bg-error/10': !item.disabled && item.variant === 'danger',
                    'text-text-muted cursor-not-allowed': item.disabled,
                  }
                )}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Dropdown;