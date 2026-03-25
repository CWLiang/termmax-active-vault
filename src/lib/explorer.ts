/** Block explorer base URL by chain (common networks). Fallback: etherscan. */
const CHAIN_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  42161: "https://arbiscan.io",
  421614: "https://sepolia.arbiscan.io",
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
};

export function getExplorerAddressUrl(chainId: number, address: string): string {
  const base = CHAIN_EXPLORERS[chainId] ?? "https://etherscan.io";
  return `${base}/address/${address}`;
}

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const base = CHAIN_EXPLORERS[chainId] ?? "https://etherscan.io";
  return `${base}/tx/${txHash}`;
}
