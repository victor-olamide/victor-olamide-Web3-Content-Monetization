'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

interface NavigationLinksProps {
  links: NavLink[];
  className?: string;
  onLinkClick?: () => void;
}

export function NavigationLinks({
  links,
  className = '',
  onLinkClick,
}: NavigationLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={`flex flex-col md:flex-row ${className}`}>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition duration-200 ${
              isActive
                ? 'bg-blue-50 text-blue-600 border-b-2 md:border-b-0 md:border-blue-600'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {Icon && <Icon size={18} />}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default NavigationLinks;
