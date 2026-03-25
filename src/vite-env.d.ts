/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TermMax Strategy Vault API base (no trailing slash). Defaults to Render deployment. */
  readonly VITE_API_BASE_URL?: string;
  /** Optional Alchemy/Infura/etc. URL for Ethereum mainnet reads */
  readonly VITE_RPC_URL_MAINNET?: string;
  /** Optional RPC URL for Sepolia */
  readonly VITE_RPC_URL_SEPOLIA?: string;
  /**
   * Confirm modals: show function/args footnotes. Unset = on in `vite dev`, off in prod.
   * Override with "true"/"1" or "false"/"0".
   */
  readonly VITE_CONFIRM_MODAL_SHOW_CONTRACT_DETAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
