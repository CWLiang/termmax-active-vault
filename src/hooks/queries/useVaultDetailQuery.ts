import { useQuery } from "@tanstack/react-query";
import { normalizeVaultAddress } from "@/lib/evmAddress";
import { getVault } from "@/services/api/vaultsApi";

/** Fetches vault detail (includes deposit / redemption vault addresses). Lighter than `useVaultDetailBundle`. */
export function useVaultDetailQuery(chainId: number | undefined, mTokenAddress: string | undefined) {
  const enabled =
    chainId != null && Number.isFinite(chainId) && !!mTokenAddress?.startsWith("0x");
  const addr = mTokenAddress ? normalizeVaultAddress(mTokenAddress) : "";

  return useQuery({
    queryKey: ["vault-detail", chainId, addr],
    queryFn: () => getVault(chainId!, addr),
    enabled,
    staleTime: 60_000,
  });
}
