import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";

export const useContentAccess = (contentId: string) => {
  const { userData } = useAuth();
  const [content, setContent] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content/${contentId}`);
      if (!response.ok) {
        throw new Error('Content not found');
      }
      const data = await response.json();
      setContent(data);
      
      // Check access: creator or purchased
      const userAddress = userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet;
      const isCreator = userAddress === data.creator;
      
      if (isCreator) {
        setHasAccess(true);
      } else if (userAddress) {
        // Check access from unified backend endpoint (PPV + Token Gating)
        const checkResp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/access/verify/${userAddress}/${contentId}`);
        const checkData = await checkResp.json();
        setHasAccess(checkData.hasAccess);
      } else {
        setHasAccess(false);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contentId) checkAccess();
  }, [contentId, userData]);

  return { content, hasAccess, loading, error, refreshAccess: checkAccess };
};
