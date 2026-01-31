'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, CreditCard } from 'lucide-react';

const PurchaseHistory: React.FC = () => {
  const { stxAddress } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!stxAddress) return;
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/purchases/user/${stxAddress}`);
        const data = await response.json();
        setPurchases(data);
      } catch (err) {
        console.error("Failed to fetch purchases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, [stxAddress]);

  if (loading) return <div className="p-4">Loading purchase history...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="text-orange-500" size={20} />
        <h3 className="text-lg font-bold">Purchase History</h3>
      </div>
      {purchases.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No purchases yet.</p>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <div key={purchase.txId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Content ID: {purchase.contentId}</p>
                <p className="text-xs text-gray-500">{new Date(purchase.timestamp).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-orange-600">{purchase.amount} STX</p>
                <a 
                  href={`https://explorer.stacks.co/txid/${purchase.txId}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-gray-400 flex items-center gap-1 hover:text-blue-500"
                >
                  TX Details <ExternalLink size={8} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
