'use client';

import { useAuth } from "@/contexts/AuthContext";
import EarningsCard from "@/components/EarningsCard";
import UploadContent from "@/components/UploadContent";
import ContentList from "@/components/ContentList";
import { useEffect } from "react";

export default function Dashboard() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Please connect your wallet to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Creator Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <EarningsCard />
        <div className="md:col-span-2">
          <UploadContent />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8">
        <ContentList />
      </div>
    </div>
  );
}
