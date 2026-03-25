import { getAddress, isAddress } from "viem";

/** Normalize to EIP-55 checksummed address for URLs and API paths (matches typical server expectations). */
export function normalizeVaultAddress(address: string): string {
  const t = address.trim();
  if (!isAddress(t)) return t;
  return getAddress(t);
}
