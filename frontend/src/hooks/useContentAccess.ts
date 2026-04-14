import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import type { Content } from '@/types/content';

export const useContentAccess = (contentId: string) => {
  const { userData } = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track whether the hook is still mounted so we never set state on an
  // unmounted component after an async fetch resolves.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkAccess = useCallback(async (signal?: AbortSignal) => {
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content/${contentId}`,
        { signal }
      );
      if (!response.ok) {
        throw new Error('Content not found');
      }
      const data: Content = await response.json();
      setContent(data);

      // Check access: creator or purchased
      const userAddress =
        userData?.profile?.stxAddress?.mainnet ||
        userData?.profile?.stxAddress?.testnet;
      const isCreator = userAddress === data.creator;

      if (isCreator) {
        setHasAccess(true);
      } else if (userAddress) {
        // Check access from unified backend endpoint (PPV + Token Gating)
        const checkResp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/access/verify/${userAddress}/${contentId}`);
        const checkData: { hasAccess: boolean } = await checkResp.json();
        setHasAccess(checkData.hasAccess);
      } else {
        if (!isMountedRef.current) return;
        setHasAccess(false);
      }

      setLoading(false);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to check access');
      setLoading(false);
    }
  }, [contentId, userData]);

  useEffect(() => {
    if (!contentId) return;
    const controller = new AbortController();
    checkAccess(controller.signal);
    return () => {
      controller.abort();
    };
  }, [contentId, userData, checkAccess]);

  // Expose a manual refresh that creates its own AbortController.
  const refreshAccess = useCallback(() => {
    const controller = new AbortController();
    checkAccess(controller.signal);
  }, [checkAccess]);

  return { content, hasAccess, loading, error, refreshAccess };
};
