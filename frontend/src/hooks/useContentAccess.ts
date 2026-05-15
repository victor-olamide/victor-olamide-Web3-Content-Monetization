import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from "@/contexts/AuthContext";

export const useContentAccess = (contentId: string) => {
  const { userData } = useAuth();
  const [content, setContent] = useState<any>(null);
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
      const data = await response.json();

      if (!isMountedRef.current) return;
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
        const checkResp = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/access/verify/${userAddress}/${contentId}`,
          { signal }
        );
        if (!checkResp.ok) {
          throw new Error('Failed to verify access');
        }
        const checkData = await checkResp.json();
        if (!isMountedRef.current) return;
        setHasAccess(checkData.hasAccess);
      } else {
        if (!isMountedRef.current) return;
        setHasAccess(false);
      }

      if (isMountedRef.current) setLoading(false);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      // AbortError is expected when the effect cleans up — not a real error.
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
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
