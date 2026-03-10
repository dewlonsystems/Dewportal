// =============================================================================
// DEWPORTAL FRONTEND - INPUT COMPONENT
// =============================================================================

'use client';

import { InputHTMLAttributes, forwardRef, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  success?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = false,
      id,
      disabled,
      success,
      placeholder,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = type === 'password';
    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    // State-based styling
    const containerState = error
      ? 'border-red-300 bg-red-50/30 shadow-sm shadow-red-100'
      : success
      ? 'border-emerald-300 bg-emerald-50/30 shadow-sm shadow-emerald-100'
      : isFocused
      ? 'border-[#1a3d2b] bg-white shadow-sm shadow-[#1a3d2b]/10'
      : disabled
      ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
      : 'border-gray-200 bg-white hover:border-gray-300';

    const inputStyles = cn(
      // Base
      'w-full h-11 text-sm text-gray-900 bg-transparent',
      'placeholder:text-gray-300 font-medium',
      'focus:outline-none transition-colors duration-150',
      'disabled:cursor-not-allowed disabled:text-gray-400',
      // Padding based on icons
      leftIcon ? 'pl-10' : 'pl-4',
      isPassword || rightIcon || error || success ? 'pr-10' : 'pr-4',
      className
    );

    return (
      <div className={cn('flex flex-col gap-1.5', { 'w-full': fullWidth })}>

        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-xs font-semibold uppercase tracking-wider transition-colors duration-150',
              error
                ? 'text-red-500'
                : success
                ? 'text-emerald-600'
                : isFocused
                ? 'text-[#1a3d2b]'
                : 'text-gray-400'
            )}
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div
          className={cn(
            'relative flex items-center rounded-xl border-2 transition-all duration-200',
            containerState
          )}
        >
          {/* Left icon */}
          {leftIcon && (
            <div className={cn(
              'absolute left-3 flex items-center justify-center transition-colors duration-150',
              error
                ? 'text-red-400'
                : success
                ? 'text-emerald-500'
                : isFocused
                ? 'text-[#1a3d2b]'
                : 'text-gray-300'
            )}>
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            className={inputStyles}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* Right side — password toggle, status icon, or custom icon */}
          <div className="absolute right-3 flex items-center gap-1">
            {/* Status icons */}
            {error && !isPassword && (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            {success && !isPassword && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}

            {/* Custom right icon */}
            {rightIcon && !isPassword && !error && !success && (
              <div className={cn(
                'transition-colors duration-150',
                isFocused ? 'text-[#1a3d2b]' : 'text-gray-300'
              )}>
                {rightIcon}
              </div>
            )}

            {/* Password toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={cn(
                  'flex items-center justify-center transition-colors duration-150',
                  'hover:text-[#1a3d2b] focus:outline-none',
                  isFocused ? 'text-[#1a3d2b]' : 'text-gray-300'
                )}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />
                }
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs font-medium text-red-500"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Hint message */}
        {hint && !error && (
          <p
            id={hintId}
            className="text-xs text-gray-400 leading-relaxed"
          >
            {hint}
          </p>
        )}

      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;