import { normalizeVaultAddress } from "@/lib/evmAddress";

/** Base path for a vault inside Curator Console (no trailing section). */
export function curatorVaultBasePath(chainId: number | string, mTokenAddress: string): string {
  return `/curator-console/vault/${chainId}/${normalizeVaultAddress(mTokenAddress)}`;
}

export type CuratorVaultSection = "overview" | "nav" | "redemption" | "deposit" | "audit-log";

export function curatorVaultSectionPath(
  chainId: number | string,
  mTokenAddress: string,
  section: CuratorVaultSection,
): string {
  return `${curatorVaultBasePath(chainId, mTokenAddress)}/${section}`;
}
