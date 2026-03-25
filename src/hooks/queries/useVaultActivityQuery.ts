import { useQuery } from "@tanstack/react-query";
import { normalizeVaultAddress } from "@/lib/evmAddress";
import { getActivity } from "@/services/api/vaultsApi";

export function useVaultActivityQuery(
  chainId: number | undefined,
  mTokenAddress: string | undefined,
) {
  const enabled =
    chainId != null && Number.isFinite(chainId) && !!mTokenAddress?.startsWith("0x");
  const addr = mTokenAddress ? normalizeVaultAddress(mTokenAddress) : "";

  return useQuery({
    queryKey: ["vault-activity", chainId, addr],
    queryFn: () => getActivity(chainId!, addr, { limit: 50, page: 1, type: "all" }),
    enabled,
    staleTime: 30_000,
  });
}
