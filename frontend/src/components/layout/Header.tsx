'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { DASHBOARD_ROUTES, AUTH_ROUTES } from '@/constants/routes';
import { logoutAction } from '@/server-actions';
import { Notification, NotificationSeverity } from '@/types';

export interface HeaderProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}


type SeverityConfig = {
  dot: string;
  bg: string;
  border: string;
  icon: ReactNode;
};

const SEVERITY_CONFIG: Record<NotificationSeverity, SeverityConfig> = {
  success: {
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    icon: (
      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  info: {
    dot: 'bg-blue-400',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    icon: (
      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    dot: 'bg-amber-400',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    icon: (
      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  error: {
    dot: 'bg-red-400',
    bg: 'bg-red-50',
    border: 'border-red-100',
    icon: (
      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

// -----------------------------------------------------------------------------
// Notification Item
// -----------------------------------------------------------------------------

function NotificationItem({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDismiss,
}: {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onMarkAsUnread: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cfg = SEVERITY_CONFIG[notification.severity];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div
      className={cn(
        'group relative flex gap-3 px-4 py-3 border-b border-gray-100 transition-colors',
        notification.is_read ? 'bg-white hover:bg-gray-50/60' : 'bg-blue-50/30 hover:bg-blue-50/50'
      )}
    >
      {/* Severity icon */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center mt-0.5',
          cfg.bg,
          cfg.border
        )}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-tight truncate',
              notification.is_read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'
            )}
          >
            {notification.title}
          </p>
          <span className="flex-shrink-0 text-[10px] text-gray-400 mt-0.5">
            {timeAgo(notification.created_at)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {notification.notification_type.replace('_', ' ')}
          </span>
          {!notification.is_read && (
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
          )}
        </div>
      </div>

      {/* Action menu */}
      <div ref={menuRef} className="flex-shrink-0 relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-7 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
            {notification.is_read ? (
              <button
                onClick={() => { onMarkAsUnread(notification.id); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Mark as unread
              </button>
            ) : (
              <button
                onClick={() => { onMarkAsRead(notification.id); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark as read
              </button>
            )}
            <button
              onClick={() => { onDismiss(notification.id); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Header
// -----------------------------------------------------------------------------

export function Header({ onMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotifications();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevUnreadCount = useRef(unreadCount);

  // Bounce bell when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 3000);
      prevUnreadCount.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  // Close panels on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logoutAction();
  };

  const handleMarkAsRead = useCallback(async (id: number) => {
    await markAsRead(id);
  }, [markAsRead]);

  // Mark as unread — toggle is_read locally via store
  // We call markAsRead with a flag trick; if your store supports it
  // otherwise we just call dismiss for now and you can wire it to backend
  const handleMarkAsUnread = useCallback(async (id: number) => {
    // For now optimistically toggle — wire to backend when endpoint is ready
    await markAsRead(id); // replace with markAsUnread when available
  }, [markAsRead]);

  const handleDismiss = useCallback((id: number) => {
    dismiss(id);
  }, [dismiss]);

  const visibleNotifications = notifications.filter((n) => {
    if (n.is_dismissed) return false;
    if (activeFilter === 'unread') return !n.is_read;
    return true;
  });

  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
      : user?.first_name?.charAt(0)?.toUpperCase() ||
        user?.username?.charAt(0)?.toUpperCase() ||
        'U';

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username;

  return (
    <>
      {/* Bounce keyframes injected once */}
      <style>{`
        @keyframes bellBounce {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-12deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-8deg); }
          75% { transform: rotate(5deg); }
          90% { transform: rotate(-3deg); }
        }
        .bell-bounce { animation: bellBounce 0.6s ease-in-out 5; }
      `}</style>

      <header className="fixed top-0 right-0 left-0 lg:left-[280px] z-[150] h-16 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">

          {/* ── Left ───────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Animated hamburger — mobile only */}
            <button
              onClick={onMenuToggle}
              className={cn(
                'lg:hidden relative w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg transition-colors',
                isMobileMenuOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
              aria-label="Toggle menu"
            >
              <span className={cn('block w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-200', isMobileMenuOpen && 'translate-y-2 rotate-45')} />
              <span className={cn('block w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-200', isMobileMenuOpen && 'opacity-0')} />
              <span className={cn('block w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-200', isMobileMenuOpen && '-translate-y-2 -rotate-45')} />
            </button>

            {/* Brand dot — desktop only */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c45c1a]" />
              <span className="text-sm font-medium text-gray-400">Dewlon Portal</span>
            </div>
          </div>

          {/* ── Right ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-1">

            {/* ── Notification bell ──────────────────────────────── */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  setIsUserMenuOpen(false);
                }}
                className={cn(
                  'relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
                  isNotifOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}
                aria-label="Notifications"
              >
                <svg
                  className={cn('w-5 h-5', isBouncing && 'bell-bounce')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* Unread badge */}
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none transition-transform',
                      isBouncing && 'scale-125'
                    )}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* ── Notification panel ─────────────────────────── */}
              {isNotifOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 sm:right-0 sm:translate-x-0 top-full mt-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-xs text-[#1a3d2b] font-medium hover:underline transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex border-b border-gray-100">
                    {(['all', 'unread'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={cn(
                          'flex-1 py-2 text-xs font-semibold capitalize transition-colors',
                          activeFilter === filter
                            ? 'text-[#1a3d2b] border-b-2 border-[#1a3d2b]'
                            : 'text-gray-400 hover:text-gray-700'
                        )}
                      >
                        {filter}
                        {filter === 'unread' && unreadCount > 0 && (
                          <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Notifications list */}
                  <div className="max-h-[420px] overflow-y-auto">
                    {visibleNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700">
                          {activeFilter === 'unread' ? 'All caught up!' : 'No notifications'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activeFilter === 'unread'
                            ? 'You have no unread notifications.'
                            : 'Notifications will appear here.'}
                        </p>
                      </div>
                    ) : (
                      visibleNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                          onMarkAsUnread={handleMarkAsUnread}
                          onDismiss={handleDismiss}
                        />
                      ))
                    )}
                  </div>

                  {/* Panel footer */}
                  {visibleNotifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                      <p className="text-[11px] text-center text-gray-400">
                        Showing {visibleNotifications.length} notification{visibleNotifications.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* ── User menu ──────────────────────────────────────── */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  setIsNotifOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-lg transition-colors',
                  isUserMenuOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
                )}
              >
                <div className="w-7 h-7 rounded-full bg-[#1a3d2b] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-semibold">{initials}</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{displayName}</p>
                  <p className="text-[11px] text-gray-400 capitalize leading-tight">{user?.role}</p>
                </div>
                <svg
                  className={cn('hidden md:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200', isUserMenuOpen && 'rotate-180')}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                  </div>
                  <div className="py-1.5">
                    <button
                      onClick={() => { setIsUserMenuOpen(false); router.push(DASHBOARD_ROUTES.PROFILE); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </button>
                    <button
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-100 py-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;