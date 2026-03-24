import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext<{ value: string; onChange: (v: string) => void }>({ value: '', onChange: () => {} });

export const Tabs = ({ defaultValue = '', value, onValueChange, children, className = '' }: { defaultValue?: string; value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; className?: string }) => {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const onChange = (v: string) => { setInternal(v); onValueChange?.(v); };
  return <TabsContext.Provider value={{ value: current, onChange }}><div className={className}>{children}</div></TabsContext.Provider>;
};

export const TabsList = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`inline-flex h-10 items-center rounded-md bg-gray-100 p-1 ${className}`}>{children}</div>
);

export const TabsTrigger = ({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) => {
  const ctx = useContext(TabsContext);
  return (
    <button onClick={() => ctx.onChange(value)} className={`inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${ctx.value === value ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'} ${className}`}>
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) => {
  const ctx = useContext(TabsContext);
  return ctx.value === value ? <div className={className}>{children}</div> : null;
};
