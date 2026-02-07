'use client';

import { useAuth } from "@/contexts/AuthContext";
import EarningsCard from "@/components/EarningsCard";
import SubscribersCard from "@/components/SubscribersCard";
import RevenueChart from "@/components/RevenueChart";
import StatsOverview from "@/components/StatsOverview";
import EarningsBreakdown from "@/components/EarningsBreakdown";
import TransactionList from "@/components/TransactionList";
import TopContent from "@/components/TopContent";
import ExportButton from "@/components/ExportButton";
import UploadContent from "@/components/UploadContent";
import TokenGating from "@/components/TokenGating";
import PurchaseHistory from "@/components/PurchaseHistory";
import ContentList from "@/components/ContentList";
import DashboardShell from "@/components/DashboardShell";
import { useEffect } from "react";

export default function Dashboard() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <DashboardShell>
        <div className="min-h-full flex items-center justify-center p-8">
          <p className="text-xl">Please connect your wallet to access the dashboard.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
          <ExportButton />
        </div>
        
        <div className="mb-8">
          <StatsOverview />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <EarningsCard />
          <SubscribersCard />
          <RevenueChart />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <EarningsBreakdown />
          <TransactionList />
          <TopContent />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-8">
            <PurchaseHistory />
            <TokenGating />
          </div>
          <div className="md:col-span-2">
            <UploadContent />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          <ContentList />
        </div>
      </div>
    </DashboardShell>
  );
}
