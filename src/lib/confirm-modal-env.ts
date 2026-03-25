/**
 * Whether confirm modals show raw contract call notes (function + args).
 * - Unset: show in Vite dev (`import.meta.env.DEV`), hide in production builds.
 * - `VITE_CONFIRM_MODAL_SHOW_CONTRACT_DETAILS=true|1` / `false|0` to override.
 */
export function showConfirmModalContractDetails(): boolean {
  const raw = import.meta.env.VITE_CONFIRM_MODAL_SHOW_CONTRACT_DETAILS;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return Boolean(import.meta.env.DEV);
}
