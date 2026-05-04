/**
 * Preview API Utilities
 * Helper functions for preview API interactions
 */

const API_BASE = '/api/preview';

export interface PreviewData {
  contentId: number;
  title: string;
  description: string;
  contentType: string;
  price: number;
  creator: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  trailerDuration?: number;
  trailerQuality?: string;
  previewText?: string;
  previewImageUrl?: string;
  contentAccessType?: string;
  totalViews?: number;
}

export interface AccessStatus {
  contentId: number;
  hasAccess: boolean;
  accessType: 'purchased' | 'subscription' | 'preview_only';
  purchaseDate?: string;
  subscriptionDate?: string;
}

export interface PreviewAnalytics {
  contentId: number;
  totalViews: number;
  totalDownloads: number;
  analytics: any;
  lastUpdated: string;
}

/**
 * Get preview for single content item
 */
export async function getPreview(contentId: number): Promise<PreviewData> {
  const response = await fetch(`${API_BASE}/${contentId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch preview');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get previews for multiple content items
 */
export async function getPreviews(contentIds: number[]): Promise<PreviewData[]> {
  const response = await fetch(`${API_BASE}/batch/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentIds })
  });
  if (!response.ok) {
    throw new Error('Failed to fetch previews');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get previews by content type with pagination
 */
export async function getPreviewsByType(
  contentType: string,
  skip: number = 0,
  limit: number = 10
): Promise<{ data: PreviewData[]; total: number; skip: number; limit: number }> {
  const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
  const response = await fetch(`${API_BASE}/type/${contentType}?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch previews by type');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get trending previews
 */
export async function getTrendingPreviews(
  limit: number = 10,
  days: number = 7
): Promise<PreviewData[]> {
  const params = new URLSearchParams({ limit: limit.toString(), days: days.toString() });
  const response = await fetch(`${API_BASE}/trending?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch trending previews');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Check user access status for content
 */
export async function checkAccessStatus(
  contentId: number,
  userAddress: string
): Promise<AccessStatus> {
  const response = await fetch(`${API_BASE}/${contentId}/access/${userAddress}`);
  if (!response.ok) {
    throw new Error('Failed to check access status');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Record preview download
 */
export async function recordPreviewDownload(contentId: number): Promise<PreviewData> {
  const response = await fetch(`${API_BASE}/${contentId}/download`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to record download');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get preview analytics
 */
export async function getPreviewAnalytics(contentId: number): Promise<PreviewAnalytics> {
  const response = await fetch(`${API_BASE}/${contentId}/analytics`);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get analytics for multiple previews
 */
export async function getPreviewsAnalytics(contentIds: number[]): Promise<PreviewAnalytics[]> {
  const response = await fetch(`${API_BASE}/analytics/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentIds })
  });
  if (!response.ok) {
    throw new Error('Failed to fetch batch analytics');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Track preview engagement event
 */
export async function trackPreviewEvent(
  contentId: number,
  eventType: 'view' | 'download'
): Promise<void> {
  const response = await fetch(`${API_BASE}/${contentId}/track/${eventType}`, {
    method: 'POST'
  });
  if (!response.ok) {
    throw new Error(`Failed to track ${eventType} event`);
  }
}

/**
 * Create or update preview
 */
export async function createPreview(
  contentId: number,
  previewData: Partial<PreviewData>
): Promise<PreviewData> {
  const response = await fetch(`${API_BASE}/${contentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(previewData)
  });
  if (!response.ok) {
    throw new Error('Failed to create/update preview');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Upload thumbnail
 */
export async function uploadThumbnail(
  contentId: number,
  file: File,
  quality: 'low' | 'medium' | 'high' | 'ultra' = 'high'
): Promise<PreviewData> {
  const formData = new FormData();
  formData.append('thumbnail', file);
  formData.append('quality', quality);

  const response = await fetch(`${API_BASE}/${contentId}/thumbnail`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error('Failed to upload thumbnail');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Upload trailer
 */
export async function uploadTrailer(
  contentId: number,
  file: File,
  quality: '360p' | '480p' | '720p' | '1080p' = '720p'
): Promise<PreviewData> {
  const formData = new FormData();
  formData.append('trailer', file);
  formData.append('quality', quality);

  const response = await fetch(`${API_BASE}/${contentId}/trailer`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error('Failed to upload trailer');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Toggle preview visibility
 */
export async function togglePreviewVisibility(
  contentId: number,
  enabled: boolean
): Promise<PreviewData> {
  const response = await fetch(`${API_BASE}/${contentId}/visibility`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  if (!response.ok) {
    throw new Error('Failed to toggle preview visibility');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Delete preview
 */
export async function deletePreview(contentId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/${contentId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Failed to delete preview');
  }
}

/**
 * Get preview statistics for creator
 */
export async function getCreatorPreviewStats(): Promise<any> {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch preview stats');
  }
  const data = await response.json();
  return data.data;
}
