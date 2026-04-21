'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}

/**
 * Reusable form input component with error display
 */
export function FormInput({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  autoComplete,
  className = ''
}: FormInputProps) {
  if (type === 'password') {
    return (
      <PasswordInput
        label={label}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        className={className}
      />
    );
  }

  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

interface PasswordInputProps
  extends Omit<FormInputProps, 'type'> {
  showStrength?: boolean;
}

/**
 * Password input component with show/hide toggle
 */
export function PasswordInput({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  autoComplete,
  className = '',
  showStrength = false
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          disabled={disabled}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      {showStrength && value && (
        <PasswordStrengthIndicator password={value} />
      )}
    </div>
  );
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

/**
 * Password strength indicator component
 */
export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const getStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) strength++;
    return strength;
  };

  const strength = getStrength(password);
  const getLabel = (s: number) => {
    if (s <= 2) return { label: 'Weak', color: 'bg-red-500' };
    if (s <= 4) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  const { label, color } = getLabel(strength);

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded ${i < strength ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-1">
        Password strength: <span className="font-semibold">{label}</span>
      </p>
    </div>
  );
}

interface FormSubmitButtonProps {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Form submit button component
 */
export function FormSubmitButton({
  label,
  loading = false,
  disabled = false,
  className = '',
  onClick
}: FormSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      onClick={onClick}
      className={`w-full px-4 py-3 rounded-lg font-semibold transition ${
        loading || disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
      } ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
          {label}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

interface FormDividerProps {
  text?: string;
}

/**
 * Form divider component
 */
export function FormDivider({ text = 'or' }: FormDividerProps) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 border-t border-gray-300"></div>
      <span className="text-gray-500 text-sm">{text}</span>
      <div className="flex-1 border-t border-gray-300"></div>
    </div>
  );
}
