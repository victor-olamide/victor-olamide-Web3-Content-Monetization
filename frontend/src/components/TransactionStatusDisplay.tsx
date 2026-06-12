'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface TransactionStatusDisplayProps {
  status: {
    status: 'idle' | 'pending' | 'confirmed' | 'failed';
    txId?: string;
    error?: string;
  };
  explorerUrl?: string;
  onRetry?: () => void;
}

export const TransactionStatusDisplay: React.FC<TransactionStatusDisplayProps> = ({
  status,
  explorerUrl,
  onRetry,
}) => {
  const statusLabel = status.status.charAt(0).toUpperCase() + status.status.slice(1);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Transaction Status</p>
            <p className="text-sm text-gray-500">{statusLabel}</p>
          </div>
          {status.status === 'confirmed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : status.status === 'failed' ? (
            <AlertCircle className="h-5 w-5 text-red-600" />
          ) : (
            <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
          )}
        </div>
        {status.txId && (
          <p className="mt-2 text-xs text-gray-500">Tx: {status.txId}</p>
        )}
        {status.error && (
          <p className="mt-2 text-xs text-red-600">{status.error}</p>
        )}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View on Stacks Explorer
          </a>
        )}
      </div>
      {status.status === 'failed' && onRetry && (
        <Button variant="outline" onClick={onRetry} className="w-full">
          Retry Transaction
        </Button>
      )}
    </div>
  );
};

export default TransactionStatusDisplay;
