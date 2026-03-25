import { Outlet } from "react-router-dom";

/** Parent route for `/curator-console/vault/:chainId/:address/*` — renders nested curator vault tools. */
export function CuratorVaultOutlet() {
  return <Outlet />;
}
