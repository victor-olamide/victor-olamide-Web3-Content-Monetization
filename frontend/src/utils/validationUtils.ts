/**
 * Form validation utilities for authentication forms
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidateResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isStrong: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters');
  }

  // More length bonus
  if (password.length >= 12) {
    score += 1;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one lowercase letter');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character');
  }

  return {
    isStrong: score >= 4,
    score,
    feedback
  };
}

/**
 * Validate login form
 */
export function validateLoginForm(data: { email: string; password: string }): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password || !data.password.trim()) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate registration form
 */
export function validateRegistrationForm(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password || !data.password.trim()) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!data.confirmPassword || !data.confirmPassword.trim()) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
    errors
  };
}

/**
 * Validate registration form
 */
export function validateRegistrationForm(
  email: string,
  password: string,
  confirmPassword: string,
  name: string
): ValidateResult {
  const errors: ValidationError[] = [];

  // Name validation
  if (!name || !name.trim()) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  } else if (name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Name must not exceed 100 characters' });
  }

  // Email validation
  if (!email || !email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  // Password validation
  if (!password || !password.trim()) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isStrong) {
      errors.push({ field: 'password', message: passwordValidation.feedback.join('. ') });
    }
  }

  // Confirm password validation
  if (!confirmPassword || !confirmPassword.trim()) {
    errors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
  } else if (password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get error message for specific field
 */
export function getFieldError(errors: ValidationError[], fieldName: string): string | null {
  const error = errors.find(e => e.field === fieldName);
  return error ? error.message : null;
}

/**
 * Check if field has error
 */
export function hasFieldError(errors: ValidationError[], fieldName: string): boolean {
  return errors.some(e => e.field === fieldName);
}
