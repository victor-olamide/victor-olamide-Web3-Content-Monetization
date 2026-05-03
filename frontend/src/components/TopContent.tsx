'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/utils/constants';

interface ContentPerformance {
  _id: string;
  revenue: number;
  sales: number;
}

const TopContent: React.FC = () => {
  const { userData } = useAuth();
  const address = userData?.profile?.stxAddress?.mainnet;
  const [topContent, setTopContent] = useState<ContentPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchTopContent = async () => {
      try {
        const res = await fetch(`${API_URL}/creator/top-content/${address}?limit=5`);
        if (res.ok) {
          const data = await res.json();
          setTopContent(data);
        }
      } catch (err) {
        console.error('Failed to fetch top content', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopContent();
  }, [address]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-4">Top Performing Content</h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 animate-pulse rounded"></div>
          ))}
        </div>
      ) : topContent.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No content data yet</p>
      ) : (
        <div className="space-y-3">
          {topContent.map((content, i) => (
            <div key={content._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    Content #{content._id.slice(-8)}
                  </p>
                  <p className="text-xs text-gray-500">{content.sales} sales</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{content.revenue.toFixed(2)}</p>
                <p className="text-xs text-gray-500">STX</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopContent;
