import { useQuery } from "@tanstack/react-query";
import { normalizeVaultAddress } from "@/lib/evmAddress";
import { getNavHistory, type NavPeriod } from "@/services/api/vaultsApi";

export function useNavHistoryQuery(
  chainId: number | undefined,
  mTokenAddress: string | undefined,
  period: NavPeriod,
) {
  const enabled =
    chainId != null && Number.isFinite(chainId) && !!mTokenAddress?.startsWith("0x");
  const addr = mTokenAddress ? normalizeVaultAddress(mTokenAddress) : "";

  return useQuery({
    queryKey: ["nav-history", chainId, addr, period],
    queryFn: () => getNavHistory(chainId!, addr, period),
    enabled,
    staleTime: 60_000,
  });
}
