'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

export function Logo({ size = 'md', href = '/' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg',
  };

  const content = (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold shadow-md`}>
        C
      </div>
      {size !== 'sm' && (
        <span className="font-bold text-gray-900 hidden sm:inline text-lg">
          Content
        </span>
      )}
    </div>
  );

  return (
    <Link href={href} className="flex items-center gap-2 hover:opacity-80 transition">
      {content}
    </Link>
  );
}

export default Logo;
