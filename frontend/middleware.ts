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

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

/**
 * Verify JWT token from request
 */
async function verifyToken(token: string): Promise<any | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (err) {
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
 * Middleware for authentication and authorization
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getToken(request);

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicAuthRoute = publicAuthRoutes.some(route => pathname.startsWith(route));
  const isRoleProtectedRoute = Object.keys(roleProtectedRoutes).some(route =>
    pathname.startsWith(route)
  );

  let user: any = null;

  // Verify token if exists
  if (token) {
    user = await verifyToken(token);
  }

  // Redirect: If accessing public auth routes while authenticated
  if (isPublicAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect: If accessing protected routes without authentication
  if (isProtectedRoute && !user) {
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
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
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
