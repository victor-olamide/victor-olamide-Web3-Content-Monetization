/**
 * Authentication and authorization types
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'creator' | 'user';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  token?: AuthToken;
}

export interface AuthError {
  code: string;
  message: string;
  statusCode: number;
}

export interface SessionData {
  user: AuthUser | null;
  token: AuthToken | null;
  expiresAt: number;
}

export enum UserRole {
  Admin = 'admin',
  Moderator = 'moderator',
  Creator = 'creator',
  User = 'user'
}

export interface ProtectedRouteConfig {
  path: string;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * Auth action types
 */
export enum AuthAction {
  Login = 'LOGIN',
  Register = 'REGISTER',
  Logout = 'LOGOUT',
  Refresh = 'REFRESH',
  UpdateProfile = 'UPDATE_PROFILE',
  ChangePassword = 'CHANGE_PASSWORD',
  ForgotPassword = 'FORGOT_PASSWORD',
  ResetPassword = 'RESET_PASSWORD'
}

/**
 * Auth errors
 */
export const AuthErrors = {
  InvalidCredentials: 'Invalid email or password',
  UserNotFound: 'User not found',
  UserAlreadyExists: 'User already exists with this email',
  InvalidToken: 'Invalid or expired token',
  TokenExpired: 'Token has expired',
  Unauthorized: 'You are not authorized to perform this action',
  Forbidden: 'You do not have permission to access this resource',
  SessionExpired: 'Your session has expired. Please log in again',
  PasswordTooWeak: 'Password does not meet security requirements',
  PasswordMismatch: 'Passwords do not match'
};
