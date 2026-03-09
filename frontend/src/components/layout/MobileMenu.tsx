'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { DASHBOARD_ROUTES } from '@/constants/routes';
import { UserRole } from '@/types';

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: readonly UserRole[];
  adminBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: DASHBOARD_ROUTES.DASHBOARD,
    label: 'Dashboard',
    roles: ['admin', 'staff'] as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: DASHBOARD_ROUTES.PAYMENTS,
    label: 'Payments',
    roles: ['admin', 'staff'] as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    path: DASHBOARD_ROUTES.TRANSACTIONS,
    label: 'Transactions',
    roles: ['admin', 'staff'] as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    path: DASHBOARD_ROUTES.USERS,
    label: 'Users',
    roles: ['admin'] as const,
    adminBadge: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    path: DASHBOARD_ROUTES.AUDIT,
    label: 'Audit Logs',
    roles: ['admin'] as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    path: DASHBOARD_ROUTES.PROFILE,
    label: 'Profile',
    roles: ['admin', 'staff'] as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (!user?.role) return false;
    return item.roles.some((role) => role === user.role);
  });

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
      : user?.first_name?.charAt(0)?.toUpperCase() ||
        user?.username?.charAt(0)?.toUpperCase() ||
        'U';

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[190] bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-[200] w-[300px] lg:hidden',
          'bg-[#1a3d2b] flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <div className="absolute inset-0 bg-[#c45c1a] rounded-lg rotate-3" />
              <div className="absolute inset-0 bg-[#c45c1a]/80 rounded-lg -rotate-1" />
              <div className="relative flex items-center justify-center h-full">
                <span className="text-white font-black text-sm tracking-tight">D</span>
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight tracking-wide">
                Dewlon
              </p>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-medium">
                Portal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── User card ──────────────────────────────────────────── */}
        <div className="mx-3 mt-4 mb-2 p-3 rounded-xl bg-white/6 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#c45c1a]/20 border border-[#c45c1a]/30 flex items-center justify-center">
                <span className="text-[#c45c1a] font-bold text-sm">{initials}</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#1a3d2b]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.first_name
                  ? `${user.first_name} ${user.last_name || ''}`.trim()
                  : user?.username}
              </p>
              <p className="text-xs text-white/40 capitalize">{user?.role}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#c45c1a]/20 text-[#c45c1a]">
              {user?.role}
            </span>
          </div>
        </div>

        {/* ── Nav label ──────────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Menu
          </p>
        </div>

        {/* ── Navigation ─────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          <ul className="space-y-0.5">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.path ||
                pathname.startsWith(`${item.path}/`);

              return (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      'group w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    )}
                  >
                    <span
                      className={cn(
                        'flex-shrink-0 transition-colors duration-150',
                        isActive
                          ? 'text-[#c45c1a]'
                          : 'text-white/40 group-hover:text-white/70'
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.adminBadge && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#c45c1a]/20 text-[#c45c1a]">
                        Admin
                      </span>
                    )}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c45c1a] flex-shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Bottom safe area ───────────────────────────────────── */}
        <div className="p-3 border-t border-white/10">
          <p className="text-center text-[10px] text-white/20 tracking-widest uppercase">
            Dewlon Portal v1.0
          </p>
        </div>
      </div>
    </>
  );
}

export default MobileMenu;