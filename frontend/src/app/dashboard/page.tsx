'use client';

import { useAuth } from "@/contexts/AuthContext";
import { useJWTAuth } from "@/contexts/JWTAuthContext";
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
import ContentList from "@/components/DashboardContentList";
import DashboardShell from "@/components/DashboardShell";
import WalletBalanceCard from "@/components/WalletBalanceCard";
import { useEffect } from "react";
import { ProtectedRoute } from "@/components/AuthGuard";

export default function Dashboard() {
  const { isLoggedIn } = useAuth();
  const { isAuthenticated: isJWTAuthenticated, isLoading } = useJWTAuth();

  // Show loading state
  if (isLoading) {
    return (
      <DashboardShell>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full"></div>
        </div>
      </DashboardShell>
    );
  }

  // If neither auth method is available, show message
  if (!isLoggedIn && !isJWTAuthenticated) {
    return (
      <DashboardShell>
        <div className="min-h-full flex items-center justify-center p-8">
          <p className="text-xl">Please connect your wallet or log in to access the dashboard.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <ProtectedRoute fallback={
      <DashboardShell>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full"></div>
        </div>
      </DashboardShell>
    }>
      <DashboardShell>
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
            <ExportButton />
          </div>
          
          <div className="mb-8">
            <StatsOverview />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <WalletBalanceCard />
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
    </ProtectedRoute>
  );
}
