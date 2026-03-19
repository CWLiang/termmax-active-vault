import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CuratorLayout } from "@/components/curator-console/CuratorLayout";
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
import AuditLogPage from "./pages/curator-console/AuditLogPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<VaultList />} />
            <Route path="/vault/:vaultId" element={<VaultDetail />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/curator" element={<CuratorDashboard />} />
            <Route path="/curator/rwa" element={<CuratorDashboard />} />
            <Route path="/curator/borrow" element={<CuratorDashboard />} />
            <Route path="/curator/risk" element={<CuratorDashboard />} />
            <Route path="/curator/governance" element={<CuratorDashboard />} />
            <Route path="/curator/analytics" element={<CuratorDashboard />} />
          </Route>
          <Route element={<CuratorLayout />}>
            <Route path="/curator-console" element={<CuratorDashboardPage />} />
            <Route path="/curator-console/vault-overview" element={<VaultOverviewPage />} />
            <Route path="/curator-console/nav" element={<NAVManagementPage />} />
            <Route path="/curator-console/redemption" element={<RedemptionPage />} />
            <Route path="/curator-console/deposit-vault" element={<DepositVaultPage />} />
            <Route path="/curator-console/audit-log" element={<AuditLogPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
