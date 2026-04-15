import React, { createContext, useContext, useState } from 'react';

const SelectContext = createContext<{ value: string; onChange: (v: string) => void; open: boolean; setOpen: (v: boolean) => void }>({ value: '', onChange: () => {}, open: false, setOpen: () => {} });

export const Select = ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) => {
  const [internal, setInternal] = useState('');
  const [open, setOpen] = useState(false);
  const current = value ?? internal;
  const onChange = (v: string) => { setInternal(v); onValueChange?.(v); setOpen(false); };
  return <SelectContext.Provider value={{ value: current, onChange, open, setOpen }}><div className="relative">{children}</div></SelectContext.Provider>;
};

export const SelectTrigger = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { setOpen, open } = useContext(SelectContext);
  return <button onClick={() => setOpen(!open)} className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ${className}`}>{children}</button>;
};

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = useContext(SelectContext);
  return <span>{value || placeholder}</span>;
};

export const SelectContent = ({ children }: { children: React.ReactNode }) => {
  const { open } = useContext(SelectContext);
  return open ? <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">{children}</div> : null;
};

export const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { onChange } = useContext(SelectContext);
  return <div onClick={() => onChange(value)} className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100">{children}</div>;
};
