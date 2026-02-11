import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';

interface PreviewItem {
  contentId: number;
  title: string;
  description: string;
  contentType: string;
  price: number;
  thumbnailUrl?: string;
  totalViews: number;
  creator: string;
}

interface PreviewGalleryProps {
  onContentSelect: (contentId: number) => void;
  contentType?: string;
  showTrendingOnly?: boolean;
  limit?: number;
}

/**
 * PreviewGallery Component
 * Displays a gallery of content previews for discovery and browsing
 */
export const PreviewGallery: React.FC<PreviewGalleryProps> = ({
  onContentSelect,
  contentType,
  showTrendingOnly = false,
  limit = 12
}) => {
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>(contentType || 'all');
  const [sortBy, setSortBy] = useState<'views' | 'recent'>('views');
  const [searchQuery, setSearchQuery] = useState('');

  const contentTypes = ['all', 'video', 'article', 'image', 'music'];

  useEffect(() => {
    fetchPreviews();
  }, [selectedType, sortBy]);

  const fetchPreviews = async () => {
    try {
      setLoading(true);
      let url: string;

      if (showTrendingOnly) {
        url = `/api/preview/trending?limit=${limit}&days=7`;
      } else if (selectedType !== 'all') {
        url = `/api/preview/type/${selectedType}?limit=${limit}&skip=0`;
      } else {
        // Fallback to trending if no specific type
        url = `/api/preview/trending?limit=${limit}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch previews');
      
      const data = await response.json();
      let items = data.data?.data || data.data || [];

      // Sort
      if (sortBy === 'views') {
        items = items.sort((a: any, b: any) => (b.totalViews || 0) - (a.totalViews || 0));
      }

      // Filter by search
      if (searchQuery) {
        items = items.filter((item: any) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setPreviews(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load previews');
      console.error('Error fetching previews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-4">Discover Content</h2>
        <p className="text-gray-600">Browse previews of available content</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          {/* Search Bar */}
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Content Type Filter */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            >
              {contentTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>

          {/* Sort Filter */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'views' | 'recent')}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="views">Most Viewed</option>
              <option value="recent">Recently Added</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      ) : previews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No previews found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {previews.map(preview => (
            <PreviewCard
              key={preview.contentId}
              preview={preview}
              onSelect={() => onContentSelect(preview.contentId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * PreviewCard Component
 * Displays a single preview item in the gallery
 */
interface PreviewCardProps {
  preview: PreviewItem;
  onSelect: () => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ preview, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg shadow-md hover:shadow-lg overflow-hidden cursor-pointer transition-shadow group"
    >
      {/* Thumbnail */}
      <div className="relative w-full h-40 bg-gray-200 overflow-hidden">
        {preview.thumbnailUrl ? (
          <img
            src={preview.thumbnailUrl}
            alt={preview.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
            <span className="text-blue-300 font-semibold capitalize">{preview.contentType}</span>
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold capitalize">
          {preview.contentType}
        </div>
      </div>

      {/* Content Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
          {preview.title}
        </h3>
        
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {preview.description}
        </p>

        {/* Creator and Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span className="truncate">{preview.creator}</span>
          <span className="whitespace-nowrap ml-2">{preview.totalViews} views</span>
        </div>

        {/* Price */}
        <div className="text-lg font-bold text-blue-600">
          ${preview.price}
        </div>
      </div>
    </div>
  );
};

export default PreviewGallery;
