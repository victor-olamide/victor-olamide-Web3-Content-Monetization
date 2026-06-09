'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Content } from '@/types/content';

interface AccessRecord {
  contentId: string;
  hasAccess: boolean;
  accessType: 'owned' | 'subscribed' | 'tokenGated' | 'free';
  expiresAt?: number;
  purchasedAt?: number;
}

interface ContentAccessContextType {
  accessRecords: Map<string, AccessRecord>;
  grantAccess: (contentId: string, accessType: AccessRecord['accessType'], expiresAt?: number) => void;
  revokeAccess: (contentId: string) => void;
  checkAccess: (contentId: string) => AccessRecord | undefined;
  hasAccess: (contentId: string) => boolean;
  clearExpiredAccess: () => void;
}

const ContentAccessContext = createContext<ContentAccessContextType | undefined>(undefined);

export const ContentAccessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [accessRecords, setAccessRecords] = useState<Map<string, AccessRecord>>(new Map());

  // Clear expired access on mount and periodically
  useEffect(() => {
    const clearExpired = () => {
      setAccessRecords((prev) => {
        const updated = new Map(prev);
        for (const [key, record] of updated) {
          if (record.expiresAt && record.expiresAt < Date.now()) {
            updated.delete(key);
          }
        }
        return updated;
      });
    };

    const interval = setInterval(clearExpired, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const grantAccess = useCallback(
    (contentId: string, accessType: AccessRecord['accessType'], expiresAt?: number) => {
      setAccessRecords((prev) => {
        const updated = new Map(prev);
        updated.set(contentId, {
          contentId,
          hasAccess: true,
          accessType,
          expiresAt,
          purchasedAt: Date.now(),
        });
        return updated;
      });
    },
    []
  );

  const revokeAccess = useCallback((contentId: string) => {
    setAccessRecords((prev) => {
      const updated = new Map(prev);
      updated.delete(contentId);
      return updated;
    });
  }, []);

  const checkAccess = useCallback(
    (contentId: string) => {
      return accessRecords.get(contentId);
    },
    [accessRecords]
  );

  const hasAccess = useCallback(
    (contentId: string) => {
      const record = accessRecords.get(contentId);
      if (!record) return false;

      // Check if access has expired
      if (record.expiresAt && record.expiresAt < Date.now()) {
        // Automatically revoke expired access
        revokeAccess(contentId);
        return false;
      }

      return record.hasAccess;
    },
    [accessRecords, revokeAccess]
  );

  const clearExpiredAccess = useCallback(() => {
    setAccessRecords((prev) => {
      const updated = new Map(prev);
      for (const [key, record] of updated) {
        if (record.expiresAt && record.expiresAt < Date.now()) {
          updated.delete(key);
        }
      }
      return updated;
    });
  }, []);

  const value: ContentAccessContextType = {
    accessRecords,
    grantAccess,
    revokeAccess,
    checkAccess,
    hasAccess,
    clearExpiredAccess,
  };

  return (
    <ContentAccessContext.Provider value={value}>
      {children}
    </ContentAccessContext.Provider>
  );
};

export const useContentAccessContext = (): ContentAccessContextType => {
  const context = useContext(ContentAccessContext);
  if (!context) {
    throw new Error('useContentAccessContext must be used within ContentAccessProvider');
  }
  return context;
};

export default ContentAccessContext;
