'use client';

import { useCallback, useState } from 'react';
import { handleContentShare, generateShareUrl } from '@/utils/contentSharingUtils';
import { useToast } from '@/contexts/ToastContext';

interface ContentSharingOptions {
  contentId: string;
  creatorId: string;
  title: string;
  description: string;
  hashtags?: string[];
  image?: string;
  referrerId?: string;
}

export const useContentSharing = (options: ContentSharingOptions) => {
  const { showSuccess, showError } = useToast();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const shareUrl = generateShareUrl(options.contentId, options.creatorId, options.referrerId);

  const share = useCallback(
    async (platform: 'web' | 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy') => {
      setSharing(true);
      setShareError(null);

      try {
        const result = await handleContentShare(platform, {
          title: options.title,
          description: options.description,
          url: shareUrl,
          image: options.image,
          hashtags: options.hashtags,
        });

        if (result.success) {
          showSuccess('Shared', result.message);
        } else {
          setShareError(result.message);
          showError('Share Failed', result.message);
        }

        return result.success;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Share failed';
        setShareError(message);
        showError('Share Error', message);
        return false;
      } finally {
        setSharing(false);
      }
    },
    [options.title, options.description, shareUrl, options.image, options.hashtags, showSuccess, showError]
  );

  const shareToTwitter = useCallback(() => share('twitter'), [share]);
  const shareToFacebook = useCallback(() => share('facebook'), [share]);
  const shareToLinkedIn = useCallback(() => share('linkedin'), [share]);
  const shareViaEmail = useCallback(() => share('email'), [share]);
  const shareNatively = useCallback(() => share('web'), [share]);
  const copyLink = useCallback(() => share('copy'), [share]);

  return {
    sharing,
    shareError,
    shareUrl,
    share,
    shareToTwitter,
    shareToFacebook,
    shareToLinkedIn,
    shareViaEmail,
    shareNatively,
    copyLink,
  };
};

export default useContentSharing;
