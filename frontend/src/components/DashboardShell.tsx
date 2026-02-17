'use client';  
  
import React, { useState } from 'react';  
import ConnectWallet from './ConnectWallet';  
import Link from 'next/link';  
import { Menu, X, Home, FolderOpen, CreditCard, Settings } from 'lucide-react';  
  
const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);  
  
  const navigationItems = [  
    { href: '/dashboard', label: 'Overview', icon: Home },  
    { href: '#', label: 'My Content', icon: FolderOpen },  
    { href: '#', label: 'Subscriptions', icon: CreditCard },  
    { href: '#', label: 'Settings', icon: Settings },  
  ];  
  
  return (  
    <div className="min-h-screen bg-gray-50 flex">  
      {/* Mobile Menu Overlay */}  
      {mobileMenuOpen && (  
        <div   
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"  
          onClick={() => setMobileMenuOpen(false)}  
        />  
      )}  
  
      {/* Sidebar - Desktop */}  
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">  
        <div className="p-6">  
          <Link href="/" className="text-xl font-bold text-orange-600">StacksMonetize</Link>  
        </div>  
        <nav className="mt-6 px-4 space-y-2">  
          {navigationItems.map((item) => (  
            <Link  
              key={item.label}  
              href={item.href}  
              className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"  
            >  
              <item.icon size={18} />  
              {item.label}  
            </Link>  
          ))}  
        </nav>  
      </aside>  
  
      {/* Mobile Sidebar - Slide out */}  
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-50 md:hidden ${  
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'  
      }`}>  
        <div className="p-6 flex items-center justify-between">  
          <Link href="/" className="text-xl font-bold text-orange-600">StacksMonetize</Link>  
          <button  
            onClick={() => setMobileMenuOpen(false)}  
            className="p-2 rounded-md hover:bg-gray-100"  
          >  
            <X size={24} />  
          </button>  
        </div>  
        <nav className="mt-6 px-4 space-y-2">  
          {navigationItems.map((item) => (  
            <Link  
              key={item.label}  
              href={item.href}  
              onClick={() => setMobileMenuOpen(false)}  
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"  
            >  
              <item.icon size={18} />  
              {item.label}  
            </Link>  
          ))}  
        </nav>  
      </aside>  
  
      {/* Main Content */}  
      <div className="flex-1 flex flex-col">  
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8">  
          <div className="flex items-center gap-4">  
            {/* Mobile Menu Button */}  
            <button  
              onClick={() => setMobileMenuOpen(true)}  
              className="p-2 rounded-md hover:bg-gray-100 md:hidden"  
            >  
              <Menu size={24} />  
            </button>  
            <div className="md:hidden text-xl font-bold text-orange-600">StacksMonetize</div>  
          </div>  
          <div className="ml-auto flex items-center gap-4">  
            <ConnectWallet />  
          </div>  
        </header>  
        <main className="flex-1">  
          {children}  
        </main>  
      </div>  
    </div>  
  );  
};  
  
export default DashboardShell;
