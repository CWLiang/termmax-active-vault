/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TermMax Strategy Vault API base (no trailing slash). Defaults to Render deployment. */
  readonly VITE_API_BASE_URL?: string;
  /** Optional Alchemy/Infura/etc. URL for Ethereum mainnet reads */
  readonly VITE_RPC_URL_MAINNET?: string;
  /** Optional RPC URL for Sepolia */
  readonly VITE_RPC_URL_SEPOLIA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
