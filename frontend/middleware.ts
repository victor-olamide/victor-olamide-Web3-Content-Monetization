import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/content',
  '/analytics',
  '/admin'
];

// Public auth routes (redirect to dashboard if authenticated)
const publicAuthRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
];

// Routes requiring specific roles
const roleProtectedRoutes: Record<string, string[]> = {
  '/admin': ['admin'],
  '/moderators': ['admin', 'moderator']
};

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/unauthorized'
];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

/**
 * Verify JWT token from request with expiry check
 */
async function verifyToken(token: string): Promise<any | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload;
    
    // Check token expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('[Auth Middleware] Token expired');
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error('[Auth Middleware] Token verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

/**
 * Get token from request cookies
 */
function getToken(request: NextRequest): string | null {
  return request.cookies.get('accessToken')?.value || null;
}

/**
 * Log auth events for debugging
 */
function logAuthEvent(pathname: string, event: string, details?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  console.log(`[Auth Middleware] ${timestamp} | ${pathname} | ${event}`, details || {});
}

/**
 * Middleware for authentication and authorization
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getToken(request);

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicAuthRoute = publicAuthRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname === route);
  const isRoleProtectedRoute = Object.keys(roleProtectedRoutes).some(route =>
    pathname.startsWith(route)
  );

  let user: any = null;

  // Verify token if exists
  if (token) {
    user = await verifyToken(token);
    if (user) {
      logAuthEvent(pathname, 'token_verified', { user_id: user.sub });
    } else {
      logAuthEvent(pathname, 'token_invalid_or_expired');
    }
  }

  // Redirect: If accessing public auth routes while authenticated
  if (isPublicAuthRoute && user) {
    logAuthEvent(pathname, 'authenticated_user_accessing_auth_route', { redirect_to: '/dashboard' });
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect: If accessing protected routes without authentication
  if (isProtectedRoute && !user) {
    logAuthEvent(pathname, 'unauthenticated_access_attempt');
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  if (isRoleProtectedRoute && user) {
    const route = Object.keys(roleProtectedRoutes).find(r => pathname.startsWith(r));
    if (route) {
      const allowedRoles = roleProtectedRoutes[route];
      if (!allowedRoles.includes(user.role)) {
        logAuthEvent(pathname, 'insufficient_role', { user_role: user.role, required_roles: allowedRoles });
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  // Log successful auth checks
  if ((isProtectedRoute || isRoleProtectedRoute) && user) {
    logAuthEvent(pathname, 'access_granted', { user_role: user.role });
  }

  // Continue to next middleware or route handler
  return NextResponse.next();
}

/**
 * Configure which routes use this middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)'
  ]
};
