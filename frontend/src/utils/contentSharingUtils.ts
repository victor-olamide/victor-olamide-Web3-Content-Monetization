// Utility functions for content sharing across social platforms

export interface ShareOptions {
  title: string;
  description: string;
  url: string;
  image?: string;
  hashtags?: string[];
}

/**
 * Share content via Web Share API (native sharing on mobile)
 */
export const shareViaWebAPI = async (options: ShareOptions): Promise<boolean> => {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: options.title,
      text: options.description,
      url: options.url,
    });
    return true;
  } catch (error) {
    console.error('Web Share failed:', error);
    return false;
  }
};

/**
 * Share to Twitter
 */
export const shareToTwitter = (options: ShareOptions): void => {
  const text = `${options.title}\n\n${options.description}`;
  const hashtags = options.hashtags?.join(',') || 'web3,content,stacks';
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(options.url)}&hashtags=${hashtags}`;
  window.open(url, 'twitter-share', 'width=550,height=420');
};

/**
 * Share to Facebook
 */
export const shareToFacebook = (options: ShareOptions): void => {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(options.url)}`;
  window.open(url, 'facebook-share', 'width=550,height=420');
};

/**
 * Share to LinkedIn
 */
export const shareToLinkedIn = (options: ShareOptions): void => {
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(options.url)}`;
  window.open(url, 'linkedin-share', 'width=550,height=420');
};

/**
 * Share via Email
 */
export const shareViaEmail = (options: ShareOptions): void => {
  const subject = encodeURIComponent(`Check out: ${options.title}`);
  const body = encodeURIComponent(
    `${options.description}\n\nView it here: ${options.url}`
  );
  const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;
};

/**
 * Copy link to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Generate shareable URL with referral parameters
 */
export const generateShareUrl = (
  contentId: string,
  creatorId: string,
  referrerId?: string
): string => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const url = new URL(`${baseUrl}/content/${contentId}`);

  if (creatorId) {
    url.searchParams.append('creator', creatorId);
  }

  if (referrerId) {
    url.searchParams.append('ref', referrerId);
  }

  return url.toString();
};

/**
 * Get platform-specific share meta tags
 */
export const getShareMetaTags = (options: ShareOptions) => {
  return {
    ogTitle: options.title,
    ogDescription: options.description,
    ogImage: options.image,
    ogUrl: options.url,
    twitterCard: 'summary_large_image',
    twitterTitle: options.title,
    twitterDescription: options.description,
    twitterImage: options.image,
  };
};

/**
 * Share handler function to manage all share options
 */
export const handleContentShare = async (
  platform: 'web' | 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy',
  options: ShareOptions
): Promise<{ success: boolean; message: string }> => {
  try {
    switch (platform) {
      case 'web':
        const webSuccess = await shareViaWebAPI(options);
        return {
          success: webSuccess,
          message: webSuccess ? 'Shared successfully' : 'Web Share API not supported',
        };

      case 'twitter':
        shareToTwitter(options);
        return { success: true, message: 'Opening Twitter share dialog' };

      case 'facebook':
        shareToFacebook(options);
        return { success: true, message: 'Opening Facebook share dialog' };

      case 'linkedin':
        shareToLinkedIn(options);
        return { success: true, message: 'Opening LinkedIn share dialog' };

      case 'email':
        shareViaEmail(options);
        return { success: true, message: 'Opening email client' };

      case 'copy':
        const copySuccess = await copyToClipboard(options.url);
        return {
          success: copySuccess,
          message: copySuccess ? 'Link copied to clipboard' : 'Failed to copy link',
        };

      default:
        return { success: false, message: 'Unknown platform' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Share failed';
    return { success: false, message };
  }
};

export default {
  shareViaWebAPI,
  shareToTwitter,
  shareToFacebook,
  shareToLinkedIn,
  shareViaEmail,
  copyToClipboard,
  generateShareUrl,
  getShareMetaTags,
  handleContentShare,
};
