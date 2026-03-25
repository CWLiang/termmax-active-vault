import { createConfig, http, injected } from "wagmi";
import { arbitrumSepolia, mainnet, sepolia } from "wagmi/chains";

const rpcMainnet = import.meta.env.VITE_RPC_URL_MAINNET;
const rpcSepolia = import.meta.env.VITE_RPC_URL_SEPOLIA;
const rpcArbSepolia = import.meta.env.VITE_RPC_URL_ARB_SEPOLIA;

/**
 * Default chains: Ethereum mainnet + Sepolia + Arbitrum Sepolia (common test deployments).
 * Override RPCs via env when public endpoints are rate-limited.
 * Add deployment chains here as needed for curator txs.
 */
export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(rpcMainnet || undefined),
    [sepolia.id]: http(rpcSepolia || undefined),
    [arbitrumSepolia.id]: http(rpcArbSepolia || undefined),
  },
});

/** Chain IDs present in `wagmiConfig` (for UI gating before read/write). */
export const supportedWagmiChainIds = new Set(
  wagmiConfig.chains.map((c) => c.id),
);
