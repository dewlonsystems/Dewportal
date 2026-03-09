// =============================================================================
// DEWPORTAL FRONTEND - UTILITY FUNCTIONS
// =============================================================================
// Reusable helper functions used throughout the application.
// =============================================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// -----------------------------------------------------------------------------
// Class Name Utilities
// -----------------------------------------------------------------------------

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge
 * Prevents conflicting classes and handles conditional classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Merge class names with conditional logic
 */
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// -----------------------------------------------------------------------------
// Date & Time Utilities
// -----------------------------------------------------------------------------

const NAIROBI_TIMEZONE = 'Africa/Nairobi';

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date | null | undefined, formatString = 'MMM dd, yyyy'): string {
  if (!date) return '-';
  
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  
  // ✅ FIXED: Use formatInTimeZone for proper timezone handling
  return formatInTimeZone(parsed, NAIROBI_TIMEZONE, formatString);
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'MMM dd, yyyy HH:mm:ss');
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  
  // ✅ FIXED: Convert to zoned time before calculating distance
  const zonedDate = toZonedTime(parsed, NAIROBI_TIMEZONE);
  return formatDistanceToNow(zonedDate, { addSuffix: true });
}

/**
 * Get current time in Nairobi timezone
 */
export function getCurrentTimeInNairobi(): Date {
  // ✅ FIXED: Return current time represented in Nairobi timezone
  return toZonedTime(new Date(), NAIROBI_TIMEZONE);
}

/**
 * Check if date is today (in Nairobi timezone)
 */
export function isToday(date: string | Date): boolean {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  // ✅ FIXED: Normalize both dates to Nairobi timezone before comparison
  const zonedParsed = toZonedTime(parsed, NAIROBI_TIMEZONE);
  const zonedToday = toZonedTime(new Date(), NAIROBI_TIMEZONE);
  
  return zonedParsed.getDate() === zonedToday.getDate() &&
         zonedParsed.getMonth() === zonedToday.getMonth() &&
         zonedParsed.getFullYear() === zonedToday.getFullYear();
}

/**
 * Check if date is within last 24 hours (in Nairobi timezone)
 */
export function isWithinLast24Hours(date: string | Date): boolean {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  // ✅ FIXED: Use timezone-normalized dates for accurate comparison
  const zonedParsed = toZonedTime(parsed, NAIROBI_TIMEZONE);
  const zonedNow = toZonedTime(new Date(), NAIROBI_TIMEZONE);
  const twentyFourHoursAgo = new Date(zonedNow.getTime() - 24 * 60 * 60 * 1000);
  
  return zonedParsed >= twentyFourHoursAgo;
}

/**
 * Check if user is online (last seen within 5 minutes) - Nairobi timezone
 */
export function isUserOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  
  const parsed = parseISO(lastSeen);
  // ✅ FIXED: Normalize to Nairobi timezone for consistent comparison
  const zonedParsed = toZonedTime(parsed, NAIROBI_TIMEZONE);
  const zonedNow = toZonedTime(new Date(), NAIROBI_TIMEZONE);
  const fiveMinutesAgo = new Date(zonedNow.getTime() - 5 * 60 * 1000);
  
  return zonedParsed >= fiveMinutesAgo;
}

// -----------------------------------------------------------------------------
// Number & Currency Utilities
// -----------------------------------------------------------------------------

/**
 * Format number as Kenyan Shilling currency
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'KES 0.00';
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'KES 0.00';
  
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') return '0';
  
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed)) return '0';
  
  return new Intl.NumberFormat('en-KE').format(parsed);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(amount: string): number {
  return parseFloat(amount.replace(/[^0-9.-]+/g, '')) || 0;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

// -----------------------------------------------------------------------------
// String Utilities
// -----------------------------------------------------------------------------

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert to title case
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string | null | undefined, length: number): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Generate initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
}

/**
 * Mask sensitive data (e.g., phone numbers, emails)
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) return data;
  return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
}

/**
 * Mask phone number (show last 4 digits)
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '-';
  return maskSensitiveData(phone.replace(/\D/g, ''), 4);
}

/**
 * Mask email (show first char and domain)
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '-';
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  return `${username.charAt(0)}***@${domain}`;
}

// -----------------------------------------------------------------------------
// Validation Utilities
// -----------------------------------------------------------------------------

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Kenyan format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-]{10,15}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
}

// -----------------------------------------------------------------------------
// Object Utilities
// -----------------------------------------------------------------------------

/**
 * Check if object is empty
 */
export function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Pick specific keys from object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key] as T[K];
    }
  });
  return result;
}

/**
 * Omit specific keys from object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

/**
 * Check if two objects are equal (shallow comparison)
 */
export function shallowEqual(obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every((key) => obj1[key] === obj2[key]);
}

// -----------------------------------------------------------------------------
// Array Utilities
// -----------------------------------------------------------------------------

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Group array by key
 */
export function groupBy<T extends Record<string, unknown>>(
  array: T[],
  key: keyof T
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by key
 */
export function sortBy<T extends Record<string, unknown>>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// -----------------------------------------------------------------------------
// Status & State Utilities
// -----------------------------------------------------------------------------

/**
 * Get status badge color based on status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'badge-success',
    success: 'badge-success',
    pending: 'badge-warning',
    processing: 'badge-warning',
    failed: 'badge-error',
    error: 'badge-error',
    cancelled: 'badge-error',
    rejected: 'badge-error',
    approved: 'badge-success',
    active: 'badge-success',
    inactive: 'badge-error',
    locked: 'badge-error',
    online: 'badge-success',
    offline: 'badge-warning',
  };
  
  return colors[status.toLowerCase()] || 'badge-info';
}

/**
 * Get status label with proper formatting
 */
export function getStatusLabel(status: string): string {
  return toTitleCase(status.toLowerCase());
}

// -----------------------------------------------------------------------------
// Download & Export Utilities
// -----------------------------------------------------------------------------

/**
 * Download file from blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Download JSON data as file
 */
export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * Download CSV data as file
 */
export function downloadCSV(rows: string[][], filename: string): void {
  const csvContent = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

// -----------------------------------------------------------------------------
// Storage Utilities
// -----------------------------------------------------------------------------

/**
 * Safely get item from localStorage
 */
export function getFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage: ${key}`, error);
    return null;
  }
}

/**
 * Safely set item in localStorage
 */
export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage: ${key}`, error);
  }
}

/**
 * Safely remove item from localStorage
 */
export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage: ${key}`, error);
  }
}

// -----------------------------------------------------------------------------
// Debug Utilities
// -----------------------------------------------------------------------------

/**
 * Log with timestamp (development only)
 */
export function debugLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data ?? '');
  }
}

/**
 * Log error with timestamp
 */
export function errorLog(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${message}`, error ?? '');
}

/**
 * Log warning with timestamp
 */
export function warnLog(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] ${message}`, data ?? '');
}

// -----------------------------------------------------------------------------
// ID Generation Utilities
// -----------------------------------------------------------------------------

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// -----------------------------------------------------------------------------
// Debounce & Throttle Utilities
// -----------------------------------------------------------------------------

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}