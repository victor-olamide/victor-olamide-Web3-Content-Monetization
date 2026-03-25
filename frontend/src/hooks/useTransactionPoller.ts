import { useState, useEffect, useRef, useCallback } from 'react';

export type TxStatus = 'pending' | 'success' | 'failed' | null;

export interface UseTransactionPollerOptions {
  /** Polling interval in milliseconds. Defaults to 10000 (10s). */
  intervalMs?: number;
  /** Maximum number of poll attempts before giving up. Defaults to 30 (~5 min). */
  maxAttempts?: number;
  /** Called when the transaction is confirmed successful. */
  onSuccess?: () => void;
  /** Called when the transaction fails on-chain. */
  onFailure?: () => void;
  /** Called when max attempts are exhausted without a terminal status. */
  onTimeout?: () => void;
}

const STACKS_API_BASE =
  process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet'
    ? 'https://stacks-node-api.stacks.co'
    : 'https://stacks-node-api.testnet.stacks.co';

/**
 * Polls the Stacks blockchain API for a transaction status.
 *
 * Handles proper cleanup on:
 *  - component unmount (clears the interval, ignores in-flight fetch results)
 *  - successful terminal status
 *  - failed terminal status
 *  - max attempts exceeded (timeout)
 *  - individual fetch errors (keeps retrying until max attempts)
 */
export const useTransactionPoller = (options: UseTransactionPollerOptions = {}) => {
  const {
    intervalMs = 10_000,
    maxAttempts = 30,
    onSuccess,
    onFailure,
    onTimeout,
  } = options;

  const [txStatus, setTxStatus] = useState<TxStatus>(null);
  const [attempts, setAttempts] = useState(0);
  const [pollingError, setPollingError] = useState<string | null>(null);

  // Holds the active interval id so cleanup always has access to the latest value.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Holds the AbortController for the in-flight fetch so we can cancel it on unmount.
  const abortControllerRef = useRef<AbortController | null>(null);
  // Whether the hook is still mounted — prevents setting state after unmount.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (txId: string) => {
      // Reset state for a fresh poll session.
      if (isMountedRef.current) {
        setTxStatus('pending');
        setAttempts(0);
        setPollingError(null);
      }

      // Clear any existing interval before starting a new one.
      stopPolling();

      let currentAttempt = 0;

      const poll = async () => {
        if (!isMountedRef.current) {
          stopPolling();
          return;
        }

        if (currentAttempt >= maxAttempts) {
          stopPolling();
          if (isMountedRef.current) {
            setPollingError('Transaction confirmation timed out. Please check the explorer.');
          }
          onTimeout?.();
          return;
        }

        currentAttempt += 1;
        if (isMountedRef.current) setAttempts(currentAttempt);

        // Create a fresh AbortController for each request.
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const response = await fetch(
            `${STACKS_API_BASE}/extended/v1/tx/${txId}`,
            { signal: controller.signal }
          );

          // Ignore response if we were unmounted during the fetch.
          if (!isMountedRef.current) return;

          if (!response.ok) {
            // Non-fatal: keep retrying on server errors.
            console.warn(`Transaction poll returned HTTP ${response.status}. Will retry.`);
            return;
          }

          const data = await response.json();

          if (!isMountedRef.current) return;

          if (data.tx_status === 'success') {
            stopPolling();
            setTxStatus('success');
            onSuccess?.();
          } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition' || data.tx_status === 'failed') {
            stopPolling();
            setTxStatus('failed');
            onFailure?.();
          }
          // 'pending' or 'dropped' — keep polling.
        } catch (err: unknown) {
          if (!isMountedRef.current) return;

          // AbortError is expected on unmount — do not log as an error.
          if (err instanceof Error && err.name === 'AbortError') return;

          console.error('Transaction polling error:', err);
          // Non-fatal: continue polling until max attempts.
        }
      };

      // Run immediately then on the interval.
      poll();
      intervalRef.current = setInterval(poll, intervalMs);
    },
    [intervalMs, maxAttempts, onSuccess, onFailure, onTimeout, stopPolling]
  );

  // Clean up on unmount so no intervals or in-flight requests leak.
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return { txStatus, attempts, pollingError, startPolling, stopPolling };
};
