import React, { useState, useEffect } from 'react';
import { ChevronPlay, Download, Eye } from 'lucide-react';

interface PreviewData {
  contentId: number;
  title: string;
  description: string;
  contentType: string;
  price: number;
  creator: string;
  thumbnailUrl?: string;
  thumbnailQuality?: string;
  trailerUrl?: string;
  trailerDuration?: number;
  trailerQuality?: string;
  previewText?: string;
  previewImageUrl?: string;
  contentAccessType?: string;
  totalViews?: number;
}

interface ContentPreviewProps {
  contentId: number;
  onPurchaseClick?: () => void;
  showAccessStatus?: boolean;
  userAddress?: string;
}

/**
 * ContentPreview Component
 * Displays preview content (thumbnails, trailers, preview text) for non-purchasers
 */
export const ContentPreview: React.FC<ContentPreviewProps> = ({
  contentId,
  onPurchaseClick,
  showAccessStatus = true,
  userAddress
}) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [accessStatus, setAccessStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    fetchPreview();
  }, [contentId]);

  useEffect(() => {
    if (showAccessStatus && userAddress) {
      fetchAccessStatus();
    }
  }, [contentId, userAddress, showAccessStatus]);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/preview/${contentId}`);
      if (!response.ok) throw new Error('Failed to fetch preview');
      const data = await response.json();
      setPreview(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      console.error('Error fetching preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessStatus = async () => {
    try {
      const response = await fetch(`/api/preview/${contentId}/access/${userAddress}`);
      if (response.ok) {
        const data = await response.json();
        setAccessStatus(data.data);
      }
    } catch (err) {
      console.error('Error fetching access status:', err);
    }
  };

  const handleDownloadPreview = async () => {
    try {
      await fetch(`/api/preview/${contentId}/download`, { method: 'POST' });
    } catch (err) {
      console.error('Error recording download:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error || 'Preview not available'}
      </div>
    );
  }

  const hasFullAccess = accessStatus?.hasAccess && accessStatus?.accessType !== 'preview_only';

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Preview Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Thumbnail or Trailer Container */}
        <div className="relative w-full bg-black aspect-video flex items-center justify-center">
          {showTrailer && preview.trailerUrl ? (
            <video
              src={preview.trailerUrl}
              controls
              className="w-full h-full"
              autoPlay
              onPlay={handleDownloadPreview}
            >
              Your browser does not support the video tag.
            </video>
          ) : preview.thumbnailUrl ? (
            <img
              src={preview.thumbnailUrl}
              alt={preview.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400 text-center">
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No preview available</p>
            </div>
          )}

          {/* Play Button for Trailer */}
          {!showTrailer && preview.trailerUrl && (
            <button
              onClick={() => setShowTrailer(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
            >
              <div className="bg-blue-600 rounded-full p-4 group-hover:bg-blue-700 transition-colors">
                <ChevronPlay className="w-8 h-8 text-white fill-white" />
              </div>
            </button>
          )}

          {/* Quality Badge */}
          {(showTrailer && preview.trailerQuality) || preview.thumbnailQuality ? (
            <div className="absolute top-4 right-4 bg-black/70 px-3 py-1 rounded text-white text-sm font-semibold">
              {showTrailer ? preview.trailerQuality : preview.thumbnailQuality}
            </div>
          ) : null}
        </div>

        {/* Content Information */}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">{preview.title}</h2>
          
          {/* Creator and Stats */}
          <div className="flex items-center gap-4 mb-4 text-gray-600">
            <span className="text-sm">By {preview.creator}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {preview.totalViews || 0} views
            </span>
          </div>

          <p className="text-gray-700 mb-4">{preview.description}</p>

          {/* Preview Text for Articles */}
          {preview.previewText && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2 text-gray-800">Preview</h3>
              <p className="text-gray-600 line-clamp-3">{preview.previewText}</p>
            </div>
          )}

          {/* Trailer Information */}
          {preview.trailerUrl && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 flex items-center gap-2">
              <ChevronPlay className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-900">
                Trailer available - {preview.trailerDuration ? `${Math.floor(preview.trailerDuration / 60)}:${String(preview.trailerDuration % 60).padStart(2, '0')}` : 'View preview'}
              </span>
            </div>
          )}

          {/* Content Type Badge */}
          <div className="flex gap-2 mb-6">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
              {preview.contentType}
            </span>
            {preview.contentAccessType && (
              <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
                {preview.contentAccessType.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Access Status */}
          {showAccessStatus && accessStatus && (
            <div className={`p-3 rounded-lg mb-4 ${
              hasFullAccess 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            }`}>
              {hasFullAccess ? (
                <p className="text-sm font-medium">✓ You have full access to this content</p>
              ) : (
                <p className="text-sm font-medium">Preview only - Purchase to access full content</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onPurchaseClick && !hasFullAccess && (
              <button
                onClick={onPurchaseClick}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Purchase for ${preview.price}
              </button>
            )}
            
            {preview.trailerUrl && (
              <button
                onClick={() => {
                  setShowTrailer(true);
                  handleDownloadPreview();
                }}
                className={`flex-1 flex items-center justify-center gap-2 ${
                  hasFullAccess ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 hover:bg-gray-300'
                } ${hasFullAccess ? 'text-white' : 'text-gray-800'} font-semibold py-2 px-4 rounded-lg transition-colors`}
              >
                <Download className="w-4 h-4" />
                {hasFullAccess ? 'Download' : 'Preview'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;
