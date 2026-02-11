import React, { useState, useEffect } from 'react';
import {
  Download,
  Star,
  MessageSquare,
  Eye,
  AlertCircle,
  Check,
  Filter,
  SortAsc,
  Heart,
  ChevronDown
} from 'lucide-react';

interface Purchase {
  _id: string;
  contentId: string;
  contentTitle: string;
  contentType: string;
  creatorAddress: string;
  purchasePrice: number;
  purchaseDate: string;
  transactionHash: string;
  transactionStatus: 'pending' | 'confirmed' | 'failed';
  downloads?: {
    total: number;
    lastDate?: string;
  };
  engagement?: {
    viewCount: number;
    watchTimeSeconds: number;
    completionPercentage: number;
    lastAccessedAt?: string;
  };
  rating?: {
    score?: number;
    review?: string;
    date?: string;
  };
  isFavorite?: boolean;
  refundInfo?: {
    refunded: boolean;
    date?: string;
    amount?: number;
    reason?: string;
  };
}

/**
 * Purchase History Component
 * Displays user's purchase history with filtering, sorting, and interaction options
 */
export const PurchaseHistoryComponent: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(10);

  // Rating modal
  const [ratingModal, setRatingModal] = useState<{ purchaseId: string; isOpen: boolean }>({
    purchaseId: '',
    isOpen: false
  });
  const [ratingData, setRatingData] = useState({ score: 5, review: '' });

  useEffect(() => {
    fetchPurchases();
  }, [skip, limit, filterStatus, filterType, sortBy]);

  const fetchPurchases = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        sortBy
      });

      const response = await fetch(`/api/profile/purchases?${params}`, {
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch purchases');

      const data = await response.json();
      let filteredPurchases = data.data;

      // Client-side filtering
      if (filterStatus !== 'all') {
        filteredPurchases = filteredPurchases.filter(
          (p: Purchase) => p.transactionStatus === filterStatus
        );
      }
      if (filterType !== 'all') {
        filteredPurchases = filteredPurchases.filter(
          (p: Purchase) => p.contentType === filterType
        );
      }

      setPurchases(filteredPurchases);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (purchaseId: string) => {
    try {
      const response = await fetch(`/api/profile/favorites/${purchaseId}`, {
        method: 'POST',
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        }
      });

      if (!response.ok) throw new Error('Failed to toggle favorite');

      setPurchases((prev) =>
        prev.map((p) =>
          p._id === purchaseId ? { ...p, isFavorite: !p.isFavorite } : p
        )
      );

      setSuccess('Favorite status updated!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite');
    }
  };

  const handleAddRating = async (purchaseId: string) => {
    try {
      const response = await fetch(`/api/profile/rating/${purchaseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        },
        body: JSON.stringify({
          rating: ratingData.score,
          review: ratingData.review
        })
      });

      if (!response.ok) throw new Error('Failed to submit rating');

      setRatingModal({ purchaseId: '', isOpen: false });
      setRatingData({ score: 5, review: '' });

      // Refresh purchases
      fetchPurchases();

      setSuccess('Rating submitted successfully!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    }
  };

  const handleRecordAccess = async (purchaseId: string, accessType: 'view' | 'download') => {
    try {
      const response = await fetch(`/api/profile/access/${purchaseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('sessionId') || ''
        },
        body: JSON.stringify({ accessType })
      });

      if (!response.ok) throw new Error(`Failed to record ${accessType}`);

      setSuccess(`${accessType === 'view' ? 'View' : 'Download'} recorded!`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to record ${accessType}`);
    }
  };

  if (isLoading && purchases.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Purchase History</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                  setSkip(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Content Type
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                  setSkip(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="document">Document</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <SortAsc className="w-4 h-4 inline mr-2" />
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                  setSkip(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date-desc">Latest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Items per page</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setCurrentPage(1);
                  setSkip(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Purchases List */}
        <div className="space-y-4">
          {purchases.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-600 text-lg">No purchases found</p>
            </div>
          ) : (
            purchases.map((purchase) => (
              <div key={purchase._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{purchase.contentTitle}</h3>
                      <p className="text-sm text-gray-600">{purchase.contentType}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${purchase.purchasePrice.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          purchase.transactionStatus === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : purchase.transactionStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {purchase.transactionStatus.charAt(0).toUpperCase() +
                          purchase.transactionStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Engagement Info */}
                  {purchase.engagement && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 py-4 border-t border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Views</p>
                          <p className="font-semibold text-gray-900">
                            {purchase.engagement.viewCount}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Completion</p>
                          <p className="font-semibold text-gray-900">
                            {purchase.engagement.completionPercentage}%
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${purchase.engagement.completionPercentage}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleFavorite(purchase._id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        purchase.isFavorite
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      <Heart className="w-4 h-4" fill={purchase.isFavorite ? 'currentColor' : 'none'} />
                      {purchase.isFavorite ? 'Favorited' : 'Add to Favorites'}
                    </button>

                    <button
                      onClick={() => handleRecordAccess(purchase._id, 'view')}
                      className="flex items-center gap-2 bg-blue-100 text-blue-600 hover:bg-blue-200 px-4 py-2 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>

                    <button
                      onClick={() => handleRecordAccess(purchase._id, 'download')}
                      className="flex items-center gap-2 bg-green-100 text-green-600 hover:bg-green-200 px-4 py-2 rounded-lg transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>

                    {!purchase.rating?.score && (
                      <button
                        onClick={() =>
                          setRatingModal({ purchaseId: purchase._id, isOpen: true })
                        }
                        className="flex items-center gap-2 bg-yellow-100 text-yellow-600 hover:bg-yellow-200 px-4 py-2 rounded-lg transition"
                      >
                        <Star className="w-4 h-4" />
                        Rate
                      </button>
                    )}

                    {purchase.rating?.score && (
                      <button className="flex items-center gap-2 bg-yellow-100 text-yellow-600 px-4 py-2 rounded-lg">
                        <Star className="w-4 h-4" fill="currentColor" />
                        {purchase.rating.score}/5
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {purchases.length > 0 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => {
                const newSkip = Math.max(0, skip - limit);
                setSkip(newSkip);
                setCurrentPage(currentPage - 1);
              }}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="px-4 py-2 text-gray-600">
              Page {currentPage}
            </span>

            <button
              onClick={() => {
                const newSkip = skip + limit;
                setSkip(newSkip);
                setCurrentPage(currentPage + 1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Rating Modal */}
        {ratingModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate this Purchase</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingData((prev) => ({ ...prev, score: star }))}
                        className={`p-2 rounded-lg transition ${
                          ratingData.score >= star
                            ? 'text-yellow-400 bg-yellow-100'
                            : 'text-gray-400 bg-gray-100'
                        }`}
                      >
                        <Star className="w-6 h-6" fill="currentColor" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Review</label>
                  <textarea
                    value={ratingData.review}
                    onChange={(e) =>
                      setRatingData((prev) => ({ ...prev, review: e.target.value }))
                    }
                    placeholder="Share your thoughts..."
                    maxLength={1000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddRating(ratingModal.purchaseId)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Submit Rating
                  </button>

                  <button
                    onClick={() => {
                      setRatingModal({ purchaseId: '', isOpen: false });
                      setRatingData({ score: 5, review: '' });
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseHistoryComponent;
