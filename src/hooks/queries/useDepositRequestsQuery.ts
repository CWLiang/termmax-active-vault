import { useQuery } from "@tanstack/react-query";
import { normalizeVaultAddress } from "@/lib/evmAddress";
import { getDepositRequests } from "@/services/api/vaultsApi";

export function useDepositRequestsQuery(
  chainId: number | undefined,
  mTokenAddress: string | undefined,
) {
  const enabled =
    chainId != null && Number.isFinite(chainId) && !!mTokenAddress?.startsWith("0x");
  const addr = mTokenAddress ? normalizeVaultAddress(mTokenAddress) : "";

  return useQuery({
    queryKey: ["deposit-requests", chainId, addr, "PENDING"],
    queryFn: () =>
      getDepositRequests(chainId!, addr, {
        status: "PENDING",
        limit: 50,
        page: 1,
        sortOrder: "desc",
      }),
    enabled,
    staleTime: 30_000,
  });
}
