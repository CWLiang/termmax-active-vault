import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { AppLayout } from "@/components/layout/AppLayout";
import { CuratorLayout } from "@/components/curator-console/CuratorLayout";
import { CuratorVaultOutlet } from "@/components/curator-console/CuratorVaultOutlet";
import { CuratorVaultGuard } from "@/components/curator-console/CuratorVaultGuard";
import VaultList from "./pages/VaultList";
import VaultDetail from "./pages/VaultDetail";
import Positions from "./pages/Positions";
import CuratorDashboard from "./pages/CuratorDashboard";
import NotFound from "./pages/NotFound";
import CuratorDashboardPage from "./pages/curator-console/CuratorDashboardPage";
import VaultOverviewPage from "./pages/curator-console/VaultOverviewPage";
import NAVManagementPage from "./pages/curator-console/NAVManagementPage";
import RedemptionPage from "./pages/curator-console/RedemptionPage";
import DepositVaultPage from "./pages/curator-console/DepositVaultPage";
import CuratorActivityPage from "./pages/curator-console/CuratorActivityPage";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/curator-console" replace />} />
              <Route path="/vaults" element={<VaultList />} />
              <Route path="/vault/:chainId/:address" element={<VaultDetail />} />
              <Route path="/positions" element={<Positions />} />
              <Route path="/curator" element={<CuratorDashboard />} />
              <Route path="/curator/rwa" element={<CuratorDashboard />} />
              <Route path="/curator/borrow" element={<CuratorDashboard />} />
              <Route path="/curator/risk" element={<CuratorDashboard />} />
              <Route path="/curator/governance" element={<CuratorDashboard />} />
              <Route path="/curator/analytics" element={<CuratorDashboard />} />
            </Route>
            <Route path="/curator-console" element={<CuratorLayout />}>
              <Route index element={<CuratorDashboardPage />} />
              <Route path="vault/:chainId/:address" element={<CuratorVaultOutlet />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route
                  path="overview"
                  element={
                    <CuratorVaultGuard>
                      <VaultOverviewPage />
                    </CuratorVaultGuard>
                  }
                />
                <Route
                  path="nav"
                  element={
                    <CuratorVaultGuard>
                      <NAVManagementPage />
                    </CuratorVaultGuard>
                  }
                />
                <Route
                  path="redemption"
                  element={
                    <CuratorVaultGuard>
                      <RedemptionPage />
                    </CuratorVaultGuard>
                  }
                />
                <Route
                  path="deposit"
                  element={
                    <CuratorVaultGuard>
                      <DepositVaultPage />
                    </CuratorVaultGuard>
                  }
                />
                <Route
                  path="activity"
                  element={
                    <CuratorVaultGuard>
                      <CuratorActivityPage />
                    </CuratorVaultGuard>
                  }
                />
                <Route path="audit-log" element={<Navigate to="overview" replace />} />
              </Route>
              <Route path="vault-overview" element={<Navigate to="/curator-console" replace />} />
              <Route path="nav" element={<Navigate to="/curator-console" replace />} />
              <Route path="redemption" element={<Navigate to="/curator-console" replace />} />
              <Route path="deposit-vault" element={<Navigate to="/curator-console" replace />} />
              <Route path="activity" element={<Navigate to="/curator-console" replace />} />
              <Route path="audit-log" element={<Navigate to="/curator-console" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
