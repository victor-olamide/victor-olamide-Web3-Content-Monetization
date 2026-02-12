/**
 * Filter API Utilities
 * Wrapper functions for filter API endpoints
 */

export interface FilterSearchParams {
  categories?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface PriceRange {
  min: number;
  max: number;
  label: string;
  count: number;
}

export interface PriceRangeInfo {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  count: number;
  ranges: PriceRange[];
}

/**
 * Get all available categories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch('/api/filters/categories');
    if (!response.ok) throw new Error('Failed to fetch categories');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error fetching categories: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get price range information
 */
export async function getPriceRangeInfo(): Promise<PriceRangeInfo> {
  try {
    const response = await fetch('/api/filters/price-range');
    if (!response.ok) throw new Error('Failed to fetch price range');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error fetching price range: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Search and filter content with advanced criteria
 */
export async function searchContent(params: FilterSearchParams) {
  try {
    const response = await fetch('/api/filters/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to search content');
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error searching content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get content by category
 */
export async function getContentByCategory(
  category: string,
  limit: number = 20,
  skip: number = 0
) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      skip: skip.toString()
    });

    const response = await fetch(`/api/filters/category/${category}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch category content');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error fetching category content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get content by price range
 */
export async function getContentByPriceRange(
  minPrice: number,
  maxPrice: number,
  limit: number = 20,
  skip: number = 0
) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      skip: skip.toString()
    });

    const response = await fetch(`/api/filters/price-range`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ minPrice, maxPrice })
    });

    if (!response.ok) throw new Error('Failed to fetch price range content');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error fetching price range content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Search by keyword term
 */
export async function searchByTerm(
  searchTerm: string,
  limit: number = 20,
  skip: number = 0
) {
  try {
    const params = new URLSearchParams({
      q: searchTerm,
      limit: limit.toString(),
      skip: skip.toString()
    });

    const response = await fetch(`/api/filters/search-term?${params}`);
    if (!response.ok) throw new Error('Failed to search by term');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error searching by term: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get trending/popular content
 */
export async function getTrendingContent(limit: number = 10) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString()
    });

    const response = await fetch(`/api/filters/trending?${params}`);
    if (!response.ok) throw new Error('Failed to fetch trending content');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error fetching trending content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get recommended content based on filters
 */
export async function getRecommendedContent(
  categories: string[] = [],
  maxPrice?: number,
  limit: number = 10
) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString()
    });

    const response = await fetch(`/api/filters/recommendations?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        categories,
        ...(maxPrice !== undefined && { maxPrice })
      })
    });

    if (!response.ok) throw new Error('Failed to fetch recommendations');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error fetching recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get filter cache status (debugging)
 */
export async function getCacheStatus() {
  try {
    const response = await fetch('/api/filters/cache-status');
    if (!response.ok) throw new Error('Failed to fetch cache status');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error fetching cache status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clear filter cache manually
 */
export async function clearCache() {
  try {
    const response = await fetch('/api/filters/cache-clear', {
      method: 'POST'
    });

    if (!response.ok) throw new Error('Failed to clear cache');
    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Error clearing cache: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Export as namespace for consistency with other APIs
export const filterApi = {
  getCategories,
  getPriceRangeInfo,
  searchContent,
  getContentByCategory,
  getContentByPriceRange,
  searchByTerm,
  getTrendingContent,
  getRecommendedContent,
  getCacheStatus,
  clearCache
};
