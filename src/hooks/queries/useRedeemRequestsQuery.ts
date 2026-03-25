import { useQuery } from "@tanstack/react-query";
import { normalizeVaultAddress } from "@/lib/evmAddress";
import { getRedeemRequests } from "@/services/api/vaultsApi";

export function useRedeemRequestsQuery(
  chainId: number | undefined,
  mTokenAddress: string | undefined,
) {
  const enabled =
    chainId != null && Number.isFinite(chainId) && !!mTokenAddress?.startsWith("0x");
  const addr = mTokenAddress ? normalizeVaultAddress(mTokenAddress) : "";

  return useQuery({
    queryKey: ["redeem-requests", chainId, addr, "PENDING"],
    queryFn: () =>
      getRedeemRequests(chainId!, addr, {
        status: "PENDING",
        limit: 50,
        page: 1,
        sortOrder: "desc",
      }),
    enabled,
    staleTime: 30_000,
  });
}
