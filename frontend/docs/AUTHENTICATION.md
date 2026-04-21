# Authentication System Documentation

## Overview

This frontend implements a complete JWT-based authentication system with the following features:

- User registration and login
- JWT token management with automatic refresh
- HttpOnly cookie storage
- Protected routes
- Session management
- Password reset functionality
- Role-based access control

## Architecture

### Key Components

#### Context
- **JWTAuthContext**: Global authentication state management
  - `useJWTAuth()`: Hook to access auth state and methods

#### Services
- **authApi**: API client for authentication endpoints
- **httpClient**: HTTP client with automatic JWT injection
- **tokenManager**: JWT token parsing, validation, and refresh

#### Utilities
- **cookieUtils**: Cookie manipulation (get, set, delete)
- **validationUtils**: Form validation (email, password strength)
- **sessionManagement**: Session monitoring and token refresh

#### Components
- **AuthGuard**: Component wrappers for protecting routes
- **AuthNavbar**: Navigation bar with logout
- **UserCard**: User profile display
- **FormInput**: Reusable form components

#### Pages
- `/auth/login`: Login page
- `/auth/register`: Registration page
- `/auth/forgot-password`: Password reset request
- `/auth/reset-password`: Password reset with token
- `/profile`: User profile page
- `/settings`: Account settings
- `/dashboard`: Protected dashboard
- `/unauthorized`: Access denied page

### Authentication Flow

1. **Registration**
   - User fills registration form
   - Client validates input
   - Server creates user and returns auth tokens
   - Tokens stored in httpOnly cookies
   - User redirected to dashboard

2. **Login**
   - User enters credentials
   - Client validates input
   - Server authenticates and returns tokens
   - Tokens stored in httpOnly cookies
   - User redirected to dashboard

3. **Token Refresh**
   - Access token expiries in 15 minutes
   - System automatically refreshes before expiry
   - Refresh token valid for 7 days
   - User session maintains continuity

4. **Logout**
   - User clicks logout
   - Client calls logout API
   - Server invalidates tokens
   - Cookies cleared
   - User redirected to login

5. **Protected Routes**
   - Middleware checks authentication
   - Unauthenticated users redirected to login
   - Authorized users access protected resources
   - Invalid/expired tokens trigger refresh or logout

## Usage

### Basic Authentication

```tsx
import { useJWTAuth } from '@/contexts/JWTAuthContext';

export function MyComponent() {
  const { user, isAuthenticated, login, logout } = useJWTAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

### Protected Routes

```tsx
import { ProtectedRoute } from '@/components/AuthGuard';

export function ProtectedPage() {
  return (
    <ProtectedRoute>
      <div>This content is only visible to authenticated users</div>
    </ProtectedRoute>
  );
}
```

### Role-Based Access

```tsx
import { RoleGuard } from '@/components/AuthGuard';

export function AdminOnly() {
  return (
    <RoleGuard roles={['admin']}>
      <div>Admin-only content</div>
    </RoleGuard>
  );
}
```

### Session Management

```tsx
import { useSessionManagement } from '@/hooks/useSessionManagement';

export function SessionComponent() {
  const { checkSession, getSessionInfo, logout } = useSessionManagement();

  const handleCheckSession = async () => {
    const isValid = await checkSession();
    if (isValid) {
      const info = getSessionInfo();
      console.log('Session expires at:', info?.expiryDate);
    }
  };

  return (
    <button onClick={handleCheckSession}>Check Session</button>
  );
}
```

### API Calls with Auth

```tsx
import { httpClient } from '@/utils/httpClient';

async function fetchUserData() {
  try {
    const response = await httpClient.get('/user/profile');
    console.log('User data:', response.data);
  } catch (error) {
    console.error('Failed to fetch:', error);
  }
}
```

## Configuration

Edit `src/constants/auth.ts` to customize:

```typescript
export const AUTH_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // Token lifetime
  SESSION_TIMEOUT: 30 * 60 * 1000,      // Inactivity timeout
  MIN_PASSWORD_LENGTH: 8,               // Password requirements
  // ... more settings
};
```

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Security Considerations

1. **HttpOnly Cookies**: Tokens stored in httpOnly cookies, inaccessible to JavaScript
2. **Token Refresh**: Automatic refresh before expiry prevents interruptions
3. **CSRF Protection**: SameSite=Lax cookie policy
4. **Secure Transport**: Force HTTPS in production
5. **Input Validation**: All user inputs validated client and server-side
6. **Error Handling**: Sensitive errors don't leak information

## Backend API Requirements

The backend should implement these endpoints:

```
POST   /auth/login              - Login
POST   /auth/register           - Register
POST   /auth/logout             - Logout
GET    /auth/verify             - Verify session
POST   /auth/refresh            - Refresh tokens
PUT    /auth/profile            - Update profile
POST   /auth/change-password    - Change password
POST   /auth/forgot-password    - Request password reset
POST   /auth/reset-password     - Reset with token
```

## Troubleshooting

### Session keeps expiring
- Check if server is refreshing tokens correctly
- Verify clock sync between client and server
- Check `TOKEN_REFRESH_BUFFER` constant

### CORS errors
- Ensure backend allows frontend origin
- Check credentials settings in httpClient

### Auth state persists after logout
- Verify cookies are being cleared
- Check browser's cookie storage

## Future Enhancements

- [ ] Multi-factor authentication
- [ ] Social login integration
- [ ] Biometric authentication
- [ ] Session activity logs
- [ ] Device management
