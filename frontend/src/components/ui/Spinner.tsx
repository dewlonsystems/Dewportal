// =============================================================================
// DEWPORTAL FRONTEND - SPINNER COMPONENT
// =============================================================================
// Loading spinner component for async operations.
// =============================================================================

'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  label?: string;
}

// -----------------------------------------------------------------------------
// Size Maps
// -----------------------------------------------------------------------------

const sizeMap = {
  sm: { outer: 20, inner: 14, stroke: 2.5, dot: 3 },
  md: { outer: 36, inner: 26, stroke: 3,   dot: 4 },
  lg: { outer: 56, inner: 40, stroke: 3.5, dot: 6 },
};

const colorMap = {
  primary:   { ring: '#1a3d2b', arc: '#c45c1a', dot: '#c45c1a' },
  secondary: { ring: '#e5e7eb', arc: '#6366f1', dot: '#6366f1' },
  white:     { ring: 'rgba(255,255,255,0.25)', arc: '#ffffff', dot: '#ffffff' },
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function Spinner({
  className,
  size = 'md',
  color = 'primary',
  label,
  ...props
}: SpinnerProps) {
  const { outer, inner, stroke, dot } = sizeMap[size];
  const { ring, arc, dot: dotColor } = colorMap[color];
  const r = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2', className)}
      role="status"
      aria-label={label || 'Loading'}
      {...props}
    >
      <div className="relative" style={{ width: outer, height: outer }}>

        {/* ── Outer ring (static, faint) ───────────────────────── */}
        <svg
          width={outer}
          height={outer}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={r}
            fill="none"
            stroke={ring}
            strokeWidth={stroke}
            opacity={0.15}
          />
        </svg>

        {/* ── Spinning arc ─────────────────────────────────────── */}
        <svg
          width={outer}
          height={outer}
          className="absolute inset-0 animate-spin"
          style={{
            transform: 'rotate(-90deg)',
            animationDuration: '900ms',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Gradient arc */}
          <defs>
            <linearGradient id={`arc-gradient-${size}-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={arc} stopOpacity="0" />
              <stop offset="100%" stopColor={arc} stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={r}
            fill="none"
            stroke={`url(#arc-gradient-${size}-${color})`}
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
        </svg>

        {/* ── Trailing dot at arc head ─────────────────────────── */}
        <svg
          width={outer}
          height={outer}
          className="absolute inset-0 animate-spin"
          style={{
            animationDuration: '900ms',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <circle
            cx={outer / 2}
            cy={stroke / 2 + stroke * 0.1}
            r={dot / 2}
            fill={dotColor}
          />
        </svg>

        {/* ── Inner pulsing dot ────────────────────────────────── */}
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="rounded-full animate-pulse"
            style={{
              width: inner * 0.22,
              height: inner * 0.22,
              backgroundColor: arc,
              opacity: 0.7,
              animationDuration: '1200ms',
            }}
          />
        </div>
      </div>

      {/* ── Optional label ───────────────────────────────────────── */}
      {label && (
        <p
          className="text-xs font-medium tracking-wide animate-pulse"
          style={{
            color: color === 'white' ? '#ffffff' : '#1a3d2b',
            animationDuration: '1200ms',
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Spinner;