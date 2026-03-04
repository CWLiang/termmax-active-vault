import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import VaultList from "./pages/VaultList";
import VaultDetail from "./pages/VaultDetail";
import Positions from "./pages/Positions";
import CuratorDashboard from "./pages/CuratorDashboard";
import NotFound from "./pages/NotFound";

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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
