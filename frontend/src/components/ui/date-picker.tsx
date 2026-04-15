import React from 'react';

interface DateRange { from?: Date; to?: Date; }

export const DatePickerWithRange = ({ value, onChange, className = '' }: { value?: DateRange; onChange?: (range: DateRange) => void; className?: string }) => {
  return (
    <div className={`flex gap-2 ${className}`}>
      <input
        type="date"
        className="h-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={value?.from ? value.from.toISOString().split('T')[0] : ''}
        onChange={e => onChange?.({ ...value, from: e.target.value ? new Date(e.target.value) : undefined })}
      />
      <span className="flex items-center text-sm text-gray-500">to</span>
      <input
        type="date"
        className="h-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={value?.to ? value.to.toISOString().split('T')[0] : ''}
        onChange={e => onChange?.({ ...value, to: e.target.value ? new Date(e.target.value) : undefined })}
      />
    </div>
  );
};
