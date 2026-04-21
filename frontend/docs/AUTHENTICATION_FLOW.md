# Frontend Authentication Flow - Documentation

## Overview

This document describes the complete frontend authentication flow for the web3 platform. The authentication system provides JWT-based session management with httpOnly cookies, automatic token refresh, role-based access control, and session timeout handling.

## Architecture

### Core Components

1. **JWTAuthContext** - Main authentication state management
2. **Middleware** - Route protection and token validation
3. **Protected Routes** - Components for restricting access
4. **Auth Hooks** - Reusable authentication logic
5. **Auth Components** - UI components for auth flows

### Key Features

- ✅ JWT authentication with httpOnly cookies
- ✅ Automatic token refresh
- ✅ Session timeout detection
- ✅ Role-based access control (RBAC)
- ✅ Global auth state management
- ✅ Auth event logging
- ✅ Session persistence
- ✅ Protected route middleware

## Usage Guide

### 1. Using JWTAuthContext

```typescript
import { useJWTAuth } from '@/contexts/JWTAuthContext';

function MyComponent() {
  const { 
    user,              // Current logged-in user
    isAuthenticated,   // Is user authenticated?
    isLoading,         // Is auth state loading?
    error,             // Auth error message
    login,             // Login function
    register,          // Register function
    logout,            // Logout function
    verifyAuth,        // Verify current auth status
    clearError         // Clear error message
  } = useJWTAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not logged in</div>;

  return <div>Welcome, {user?.name}</div>;
}
```

### 2. Protecting Routes

#### Using ProtectedRoute Component

```typescript
import { ProtectedRoute } from '@/components/AuthGuard';

function App() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminPanel />
    </ProtectedRoute>
  );
}
```

#### Using useAuthProtection Hook

```typescript
import { useAuthProtection } from '@/hooks/useAuthProtection';

function AdminPage() {
  const { isAuthenticated, hasRequiredRole } = useAuthProtection({
    requiredRole: 'admin',
    redirectTo: '/auth/login'
  });

  if (!hasRequiredRole) return null;
  return <div>Admin Content</div>;
}
```

### 3. Session Timeout Handling

```typescript
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionWarning } from '@/components/SessionWarning';

function App() {
  useSessionTimeout({
    warningTime: 5 * 60,    // Warn 5 minutes before
    timeoutTime: 30 * 60,   // Timeout after 30 minutes
    onWarning: () => console.log('Session expiring'),
    onTimeout: () => console.log('Session expired')
  });

  return (
    <>
      <SessionWarning />
      <YourContent />
    </>
  );
}
```

### 4. Auth Events

```typescript
import { useAuthCallback, emitAuthEvent } from '@/hooks/useAuthCallback';

function Component() {
  useAuthCallback((eventType, data) => {
    console.log(`Auth event: ${eventType}`, data);
  });

  // Emit custom auth event
  emitAuthEvent('login', { userId: '123' });
}
```

### 5. Auth State Persistence

```typescript
import { useAuthPersistence } from '@/hooks/useAuthPersistence';

function Component() {
  const { saveAuthState, loadAuthState, clearAuthState } = useAuthPersistence();

  // State is automatically saved/restored
}
```

### 6. Public Only Routes

```typescript
import { PublicOnlyRoute, withPublicOnlyRoute } from '@/components/PublicOnlyRoute';

// Option 1: Wrapper component
function LoginPage() {
  return (
    <PublicOnlyRoute redirectTo="/dashboard">
      <LoginForm />
    </PublicOnlyRoute>
  );
}

// Option 2: HOC
const LoginPageProtected = withPublicOnlyRoute(LoginPage, '/dashboard');
```

### 7. Auth Status Display

```typescript
import { AuthStatus, AuthStatusIndicator } from '@/components/AuthStatus';

function Header() {
  return (
    <div>
      <AuthStatusIndicator />
      <AuthStatus 
        showEmail={true}
        showRole={true}
        compact={false}
      />
    </div>
  );
}
```

## Protected Routes

The following routes require authentication:

- `/dashboard` - User dashboard
- `/profile` - User profile
- `/settings` - User settings
- `/content` - Content management
- `/analytics` - Analytics
- `/admin` - Admin panel (admin role required)

## Role-Based Access Control

### Admin Routes

- `/admin` - Requires `admin` role
- `/admin/*` - All admin subroutes

### Moderator Routes

- `/moderators` - Requires `admin` or `moderator` role

### Adding Role Protection

```typescript
// In middleware.ts
const roleProtectedRoutes: Record<string, string[]> = {
  '/admin': ['admin'],
  '/moderators': ['admin', 'moderator'],
  '/content/review': ['admin', 'moderator']  // New route
};
```

## Token Management

### Token Storage

- **Access Token**: Stored in httpOnly cookie `accessToken`
- **Refresh Token**: Stored in httpOnly cookie `refreshToken`
- **Expiry**: Token includes `exp` claim for expiry validation

### Automatic Token Refresh

The HTTP client automatically refreshes tokens when:
- Access token is expired
- API returns 401 Unauthorized
- Refresh succeeds with new tokens

### Token Refresh Implementation

```typescript
// In httpClient.ts
if (response.status === 401) {
  const refreshResponse = await authApi.refreshToken();
  if (refreshResponse.success) {
    // Retry request with new token
  }
}
```

## Middleware

The Next.js middleware handles:

1. **Authentication Checks**: Verify JWT in cookies
2. **Route Protection**: Redirect unauthenticated users to login
3. **Token Expiry**: Check token expiry and reject if expired
4. **Role-Based Access**: Validate user role for protected routes
5. **Auth Redirects**: Redirect authenticated users away from auth pages

### Middleware Configuration

Edit `frontend/middleware.ts` to:

- Add/remove protected routes
- Add/remove public routes
- Modify role requirements
- Change timeout values

## Hooks Reference

### useJWTAuth()

Main authentication hook.

```typescript
const {
  user: UserProfile | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null,
  login: (email, password) => Promise<boolean>,
  register: (email, password, name) => Promise<boolean>,
  logout: () => Promise<void>,
  verifyAuth: () => Promise<void>,
  clearError: () => void,
  updateProfile: (data) => Promise<boolean>
} = useJWTAuth();
```

### useAuthProtection()

Protect routes with redirection.

```typescript
const {
  isAuthenticated: boolean,
  isLoading: boolean,
  user: UserProfile | null,
  hasRequiredRole: boolean
} = useAuthProtection({
  redirectTo?: string,        // Default: '/auth/login'
  requiredRole?: string,
  onUnauthorized?: () => void
});
```

### useSessionTimeout()

Handle session inactivity.

```typescript
const {
  getTimeRemaining: () => number | null,
  resetTimeout: () => void,
  isSessionActive: boolean
} = useSessionTimeout({
  warningTime?: number,       // Default: 5 * 60
  timeoutTime?: number,       // Default: 30 * 60
  onWarning?: () => void,
  onTimeout?: () => void
});
```

### useAuthPersistence()

Persist and recover auth state.

```typescript
const {
  saveAuthState: () => void,
  loadAuthState: () => UserProfile | null,
  clearAuthState: () => void
} = useAuthPersistence();
```

### useAuthCallback()

Subscribe to auth events.

```typescript
useAuthCallback((eventType: AuthEventType, data?: any) => {
  // Handle auth event
});
```

## Components Reference

### ProtectedRoute

Protect routes and redirect on authentication failure.

```typescript
<ProtectedRoute requiredRole="admin">
  <AdminContent />
</ProtectedRoute>
```

### AuthGuard

Conditionally render based on auth status.

```typescript
<AuthGuard fallback={<LoadingSpinner />} requireAdmin>
  <AdminPanel />
</AuthGuard>
```

### SessionWarning

Display session timeout warning.

```typescript
<SessionWarning 
  warningTime={5 * 60}
  timeoutTime={30 * 60}
  onExtendSession={() => console.log('Session extended')}
/>
```

### PublicOnlyRoute

Restrict access to unauthenticated users.

```typescript
<PublicOnlyRoute redirectTo="/dashboard">
  <LoginPage />
</PublicOnlyRoute>
```

### AuthStatus

Display current authentication status.

```typescript
<AuthStatus 
  showEmail={true}
  showRole={true}
  showLoadingState={true}
  compact={false}
/>
```

## Security Considerations

1. **httpOnly Cookies**: Tokens are stored in httpOnly cookies, protected from XSS
2. **Secure Flag**: Cookies are marked as Secure for HTTPS transmission
3. **SameSite Policy**: Cookies include SameSite policy to prevent CSRF
4. **Token Expiry**: Tokens have expiration times to limit exposure window
5. **Automatic Refresh**: Transparent token refresh without user interaction
6. **Session Timeout**: Automatic logout after inactivity period

## Common Patterns

### Login Flow

1. User visits `/auth/login`
2. Submits credentials to backend API
3. Backend validates and returns JWT in httpOnly cookie
4. Frontend stores user in context
5. Middleware verifies token on next request
6. User is redirected to dashboard

### Protected Resource Access

1. User requests protected resource
2. Middleware verifies JWT token
3. If valid, resource is served
4. If expired/invalid, user redirected to login

### Logout Flow

1. User clicks logout
2. Frontend calls logout API
3. Backend invalidates token/session
4. Frontend clears auth state
5. Cookies are deleted
6. User redirected to login

### Role-Based Routing

1. User logs in with specific role
2. JWT includes role claim
3. Middleware checks role for protected routes
4. Unauthorized access redirected to `/unauthorized`

## Troubleshooting

### User Stuck in Login Loop

- Check JWT_SECRET matches between frontend and backend
- Verify token has valid `exp` claim
- Check cookie settings (Secure, SameSite, HttpOnly)

### Session Timeout Not Working

- Verify `useSessionTimeout` is mounted
- Check timeout values in configuration
- Verify user activity events are being captured

### Token Not Refreshing

- Check refresh token exists and is valid
- Verify `/api/auth/refresh` endpoint returns new token
- Check HTTP client refresh logic

### Role-Based Access Not Working

- Verify JWT includes `role` claim
- Check role names in `roleProtectedRoutes`
- Verify middleware is properly configured

## Environment Variables

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# JWT Secret (must match backend)
JWT_SECRET=your-secret-key-change-in-production
```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/verify` - Verify session
- `PUT /api/auth/profile` - Update profile

## Testing

### Unit Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useJWTAuth } from '@/contexts/JWTAuthContext';

test('should login user', async () => {
  const { result } = renderHook(() => useJWTAuth());
  
  await act(async () => {
    await result.current.login('test@example.com', 'password');
  });
  
  expect(result.current.isAuthenticated).toBe(true);
});
```

## References

- [JWT (JSON Web Tokens)](https://jwt.io)
- [Next.js Middleware](https://nextjs.org/docs/advanced-features/middleware)
- [httpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
