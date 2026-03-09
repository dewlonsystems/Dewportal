// =============================================================================
// DEWPORTAL FRONTEND - NEXT.JS MIDDLEWARE
// =============================================================================
// Server-side middleware for role-based route protection.
// Runs before every request to verify authentication and authorization.
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, importSPKI } from 'jose';
import {
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
  ADMIN_ROUTES,
  REDIRECT_AFTER_LOGIN,
  REDIRECT_FORCE_PASSWORD_CHANGE,
} from '@/constants/routes';
import { ROLES } from '@/constants/roles';
import { debugLog, errorLog } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface JWTPayload {
  user_id: number;
  username: string;
  email: string;
  role: 'admin' | 'staff';
  must_change_password?: boolean;
  exp: number;
  iat: number;
}

interface AuthSession {
  user: {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'staff';
    must_change_password?: boolean;
  };
  isAuthenticated: boolean;
  isExpired: boolean;
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const PROTECTED_ROUTES = [
  DASHBOARD_ROUTES.ROOT,
  DASHBOARD_ROUTES.DASHBOARD,
  DASHBOARD_ROUTES.PAYMENTS,
  DASHBOARD_ROUTES.TRANSACTIONS,
  DASHBOARD_ROUTES.USERS,
  DASHBOARD_ROUTES.PROFILE,
  DASHBOARD_ROUTES.AUDIT,
];

const ADMIN_ONLY_ROUTES = [
  ADMIN_ROUTES.USERS,
  ADMIN_ROUTES.AUDIT,
];

const AUTH_ROUTES_LIST = [
  AUTH_ROUTES.LOGIN,
  AUTH_ROUTES.FORCE_PASSWORD_CHANGE,
];

// -----------------------------------------------------------------------------
// Helper: Get Token from Cookies
// -----------------------------------------------------------------------------

function getTokenFromCookies(request: NextRequest): string | null {
  const accessToken = request.cookies.get('access_token')?.value;
  return accessToken || null;
}

// -----------------------------------------------------------------------------
// Helper: Verify JWT Token (RS256 — always verified)
// -----------------------------------------------------------------------------

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const publicKeyPem = process.env.JWT_VERIFYING_KEY;

    if (!publicKeyPem) {
      errorLog('Middleware: JWT_VERIFYING_KEY is not set');
      return null;
    }

    // Replace literal \n with actual newlines in case .env stores them escaped
    const normalizedPem = publicKeyPem.replace(/\\n/g, '\n');

    const publicKey = await importSPKI(normalizedPem, 'RS256');

    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
    });

    return payload as unknown as JWTPayload;

  } catch (error) {
    errorLog('Middleware: Token verification failed', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Helper: Get Auth Session
// -----------------------------------------------------------------------------

async function getAuthSession(request: NextRequest): Promise<AuthSession> {
  const token = getTokenFromCookies(request);

  if (!token) {
    return {
      user: {
        id: 0,
        username: '',
        email: '',
        role: 'staff',
      },
      isAuthenticated: false,
      isExpired: true,
    };
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return {
      user: {
        id: 0,
        username: '',
        email: '',
        role: 'staff',
      },
      isAuthenticated: false,
      isExpired: true,
    };
  }

  debugLog('Middleware: JWT payload', {
    role: payload.role,
    user_id: payload.user_id,
    username: payload.username,
  });

  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  const isExpired = payload.exp < now;

  return {
    user: {
      id: payload.user_id,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      must_change_password: payload.must_change_password,
    },
    isAuthenticated: true,
    isExpired,
  };
}

// -----------------------------------------------------------------------------
// Helper: Check if Route is Public
// -----------------------------------------------------------------------------

function isPublicRoute(pathname: string): boolean {
  return pathname === PUBLIC_ROUTES.HOME || pathname === '/';
}

// -----------------------------------------------------------------------------
// Helper: Check if Route is Auth Route
// -----------------------------------------------------------------------------

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES_LIST.some((route) => pathname.startsWith(route));
}

// -----------------------------------------------------------------------------
// Helper: Check if Route is Protected
// -----------------------------------------------------------------------------

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

// -----------------------------------------------------------------------------
// Helper: Check if Route is Admin Only
// -----------------------------------------------------------------------------

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

// -----------------------------------------------------------------------------
// Main Middleware Function
// -----------------------------------------------------------------------------

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  debugLog('Middleware', { pathname });

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get auth session
  const session = await getAuthSession(request);

  // ---------------------------------------------------------------------------
  // Public Routes (/, home page)
  // ---------------------------------------------------------------------------

  if (isPublicRoute(pathname)) {
    if (session.isAuthenticated && !session.isExpired) {
      return NextResponse.redirect(
        new URL(REDIRECT_AFTER_LOGIN, request.url)
      );
    }
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // Auth Routes (login, force-password-change)
  // ---------------------------------------------------------------------------

  if (isAuthRoute(pathname)) {
    if (pathname.startsWith(AUTH_ROUTES.FORCE_PASSWORD_CHANGE)) {
      if (!session.isAuthenticated || session.isExpired) {
        return NextResponse.redirect(new URL(AUTH_ROUTES.LOGIN, request.url));
      }
      return NextResponse.next();
    }

    if (pathname.startsWith(AUTH_ROUTES.LOGIN)) {
      if (session.isAuthenticated && !session.isExpired) {
        return NextResponse.redirect(
          new URL(REDIRECT_AFTER_LOGIN, request.url)
        );
      }
      return NextResponse.next();
    }
  }

  // ---------------------------------------------------------------------------
  // Protected Routes
  // ---------------------------------------------------------------------------

  if (isProtectedRoute(pathname)) {
    if (!session.isAuthenticated || session.isExpired) {
      const loginUrl = new URL(AUTH_ROUTES.LOGIN, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.user.must_change_password) {
      if (!pathname.startsWith(AUTH_ROUTES.FORCE_PASSWORD_CHANGE)) {
        return NextResponse.redirect(
          new URL(REDIRECT_FORCE_PASSWORD_CHANGE, request.url)
        );
      }
    }

    if (isAdminRoute(pathname)) {
      debugLog('Admin route check', {
        pathname,
        role: session.user.role,
        isAdmin: session.user.role === ROLES.ADMIN,
      });

      if (session.user.role !== ROLES.ADMIN) {
        return NextResponse.redirect(
          new URL(DASHBOARD_ROUTES.DASHBOARD, request.url)
        );
      }
    }

    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // All Other Routes
  // ---------------------------------------------------------------------------

  return NextResponse.next();
}

// -----------------------------------------------------------------------------
// Middleware Configuration
// -----------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};