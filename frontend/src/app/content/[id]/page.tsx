'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import DashboardShell from "@/components/DashboardShell";
import { Lock, Unlock, PlayCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ContentView({ params }: { params: { id: string } }) {
  const { isLoggedIn, userData } = useAuth();
  const [content, setContent] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching content and checking access
    const fetchContent = async () => {
      setLoading(true);
      // Mock content data
      const mockContent = {
        id: params.id,
        title: "Introduction to Clarity Smart Contracts",
        description: "Learn how to build secure apps on Stacks.",
        price: "10 STX",
        creator: "SP3X...creator",
        type: "video",
        gating: {
          tokenSymbol: "MOCK",
          threshold: "1000"
        }
      };
      
      setContent(mockContent);
      // Simulate access check (e.g. check backend/contract)
      setTimeout(() => {
        setHasAccess(false); // Default to no access for now
        setLoading(false);
      }, 1500);
    };

    fetchContent();
  }, [params.id]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl animate-pulse">Checking access...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl mx-auto">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition"
        >
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">{content?.title}</h1>
            <p className="text-gray-600 mb-6">{content?.description}</p>
            
            {!hasAccess ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                <Lock size={48} className="mx-auto text-orange-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Content Locked</h2>
                <p className="text-gray-600 mb-8">
                  This content requires a one-time payment of {content?.price} or a subscription.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="bg-orange-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-orange-600 transition">
                    Purchase Access
                  </button>
                  <button className="bg-gray-800 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-900 transition">
                    Subscribe to Creator
                  </button>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-4">
                    OR hold at least {content?.gating?.threshold} {content?.gating?.tokenSymbol} tokens
                  </p>
                  <button className="text-gray-700 font-semibold py-2 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition">
                    Verify Token Balance
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden">
                {content?.type === 'video' ? (
                  <div className="bg-black aspect-video flex items-center justify-center">
                    <PlayCircle size={64} className="text-white opacity-80 cursor-pointer hover:opacity-100 transition" />
                  </div>
                ) : (
                  <div className="prose max-w-none bg-gray-50 p-8 border border-gray-100 rounded-xl">
                    <p>Exclusive article content revealed here...</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 p-6 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Creator: <span className="font-mono text-gray-700">{content?.creator}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-600 font-medium">
              {hasAccess ? <><Unlock size={18} /> Access Granted</> : <><Lock size={18} /> Locked</>}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
