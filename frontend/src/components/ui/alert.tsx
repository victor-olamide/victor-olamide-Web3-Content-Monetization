import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export const Alert = ({ className = '', variant = 'default', children, ...props }: AlertProps) => {
  const variants = {
    default: 'border-gray-200 bg-white',
    destructive: 'border-red-300 bg-red-50',
  };
  return (
    <div className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`} {...props}>{children}</div>
  );
};

export const AlertDescription = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-gray-700 ${className}`} {...props}>{children}</p>
);
