'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface AnalyticsDateRangePickerProps {
  onDateRangeChange: (range: DateRange) => void;
  defaultRange?: '7d' | '30d' | '90d' | 'custom';
  isLoading?: boolean;
}

export function AnalyticsDateRangePicker({
  onDateRangeChange,
  defaultRange = '30d',
  isLoading = false,
}: AnalyticsDateRangePickerProps) {
  const [selectedRange, setSelectedRange] = useState<string>(defaultRange);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const calculateDateRange = (range: string): DateRange | null => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate: string;
    let label: string;

    switch (range) {
      case '7d':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        label = 'Last 7 days';
        break;
      case '30d':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        label = 'Last 30 days';
        break;
      case '90d':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        label = 'Last 90 days';
        break;
      default:
        return null;
    }

    return { startDate, endDate, label };
  };

  const handleRangeSelect = (range: string) => {
    setSelectedRange(range);
    setShowCustom(false);

    if (range === 'custom') {
      setShowCustom(true);
      return;
    }

    const dateRange = calculateDateRange(range);
    if (dateRange) {
      onDateRangeChange(dateRange);
    }
  };

  const handleCustomRangeSubmit = () => {
    if (!customStart || !customEnd) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(customStart) > new Date(customEnd)) {
      alert('Start date must be before end date');
      return;
    }

    onDateRangeChange({
      startDate: customStart,
      endDate: customEnd,
      label: `${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()}`,
    });

    setShowCustom(false);
  };

  return (
    <div className="flex items-center gap-3">
      <Calendar className="h-4 w-4 text-slate-500" />
      <div className="relative">
        <button
          disabled={isLoading}
          onClick={() => setShowCustom(!showCustom)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {selectedRange === 'custom'
            ? 'Custom range'
            : selectedRange === '7d'
              ? 'Last 7 days'
              : selectedRange === '30d'
                ? 'Last 30 days'
                : selectedRange === '90d'
                  ? 'Last 90 days'
                  : 'Select range'}
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* Preset options */}
        <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="space-y-1 p-2">
            {['7d', '30d', '90d'].map((option) => (
              <button
                key={option}
                onClick={() => handleRangeSelect(option)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                  selectedRange === option
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option === '7d'
                  ? 'Last 7 days'
                  : option === '30d'
                    ? 'Last 30 days'
                    : 'Last 90 days'}
              </button>
            ))}
            <hr className="my-2" />
            <button
              onClick={() => handleRangeSelect('custom')}
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                selectedRange === 'custom'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Custom range
            </button>
          </div>

          {showCustom && (
            <div className="border-t border-slate-200 p-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Start date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">End date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={handleCustomRangeSubmit}
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
