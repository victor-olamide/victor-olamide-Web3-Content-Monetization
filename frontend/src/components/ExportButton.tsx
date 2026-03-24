'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/utils/constants';
import { useToast } from '@/contexts/ToastContext';

const ExportButton: React.FC = () => {
  const { userData } = useAuth();
  const address = userData?.profile?.stxAddress?.mainnet;
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();

  const handleExport = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/creator/export/${address}`);
      if (res.ok) {
        const data = await res.json();
        if (!data || data.length === 0) {
          showWarning('No Data', 'You have no earnings transactions to export yet.');
          return;
        }
        
        const csv = [
          ['Type', 'User', 'Amount', 'Timestamp', 'Transaction ID'].join(','),
          ...data.map((tx: any) => [
            tx.type,
            tx.user,
            tx.amount,
            new Date(tx.timestamp).toISOString(),
            tx.txId || tx.transactionId
          ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `earnings-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showSuccess('Export Complete', 'Your earnings data has been downloaded as a CSV file.');
      }
    } catch (err) {
      console.error('Export failed', err);
      showError('Export Failed', 'Could not export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
    >
      {loading ? 'Exporting...' : '📊 Export Data'}
    </button>
  );
};

export default ExportButton;
