import { Navigate } from "react-router-dom";
import { useCuratorVaultParams } from "@/hooks/useCuratorVaultRoute";

export function CuratorVaultGuard({ children }: { children: React.ReactNode }) {
  const { valid } = useCuratorVaultParams();
  if (!valid) return <Navigate to="/curator-console" replace />;
  return <>{children}</>;
}
