import React, { useState } from 'react';
import { Eye, Download, ShoppingCart, Lock } from 'lucide-react';
import Link from 'next/link';

interface PreviewCardProps {
  contentId: number;
  title: string;
  description: string;
  thumbnailUrl?: string;
  price: number;
  creator: string;
  contentType: string;
  totalViews?: number;
  hasAccess?: boolean;
  accessType?: 'purchase_required' | 'subscription_required' | 'token_gated' | 'free' | 'preview_only';
  onPurchaseClick?: (contentId: number) => void;
  onViewClick?: (contentId: number) => void;
  onDownloadClick?: (contentId: number) => void;
  imageHeight?: string;
}

/**
 * Preview Card Component
 * Displays content preview thumbnail with metadata
 */
export const PreviewCard: React.FC<PreviewCardProps> = ({
  contentId,
  title,
  description,
  thumbnailUrl,
  price,
  creator,
  contentType,
  totalViews = 0,
  hasAccess = false,
  accessType = 'preview_only',
  onPurchaseClick,
  onViewClick,
  onDownloadClick,
  imageHeight = 'h-48'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const getAccessBadge = () => {
    if (hasAccess) {
      return (
        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded">
          Purchased
        </span>
      );
    }

    switch (accessType) {
      case 'subscription_required':
        return (
          <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded">
            Subscription
          </span>
        );
      case 'token_gated':
        return (
          <span className="absolute top-2 left-2 bg-purple-500 text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
            <Lock className="w-3 h-3" /> Token Gated
          </span>
        );
      case 'free':
        return (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded">
            Free
          </span>
        );
      default:
        return null;
    }
  };

  const getContentTypeIcon = () => {
    const icons = {
      video: '🎬',
      article: '📄',
      image: '🖼️',
      music: '🎵'
    };
    return icons[contentType as keyof typeof icons] || '📦';
  };

  return (
    <div
      className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail Container */}
      <div className={`relative ${imageHeight} bg-gray-200 overflow-hidden group cursor-pointer`}>
        {/* Placeholder Background */}
        {!thumbnailUrl || imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
            <span className="text-4xl">{getContentTypeIcon()}</span>
          </div>
        ) : null}

        {/* Thumbnail Image */}
        {thumbnailUrl && !imageError && (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <div className="animate-pulse">Loading...</div>
              </div>
            )}
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </>
        )}

        {/* Overlay on Hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 transition-all duration-300">
            <button
              onClick={() => onViewClick?.(contentId)}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition transform hover:scale-110"
              title="View preview"
            >
              <Eye className="w-5 h-5" />
            </button>

            {onDownloadClick && (
              <button
                onClick={() => onDownloadClick(contentId)}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full p-3 transition transform hover:scale-110"
                title="Download preview"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            {onPurchaseClick && !hasAccess && (
              <button
                onClick={() => onPurchaseClick(contentId)}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 transition transform hover:scale-110"
                title="Purchase content"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Access Badge */}
        {getAccessBadge()}

        {/* View Count Badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {totalViews.toLocaleString()}
        </div>
      </div>

      {/* Content Info */}
      <div className="p-4">
        {/* Creator */}
        <p className="text-xs text-gray-500 font-semibold mb-1">by {creator}</p>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{title}</h3>

        {/* Description */}
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{description}</p>

        {/* Content Type Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
            {contentType}
          </span>
        </div>

        {/* Footer with Price and Action */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-lg font-bold text-gray-900">${price.toFixed(2)}</p>
          </div>

          {!hasAccess && onPurchaseClick && (
            <button
              onClick={() => onPurchaseClick(contentId)}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded transition"
            >
              Purchase
            </button>
          )}

          {hasAccess && (
            <div className="text-green-600 text-xs font-semibold">Owned</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewCard;
