import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { VaultListViewData } from "@/domain/vaults/types";
import { mapUserPositionDto, mapVaultSummaryDto } from "@/domain/vaults/mappers";
import { listVaults } from "@/services/api/vaultsApi";
import { getUserPositions } from "@/services/api/usersApi";

async function fetchVaultListView(walletAddress: string | undefined): Promise<VaultListViewData> {
  const list = await listVaults({ sortBy: "tvl", sortOrder: "desc" });
  const vaults = list.items.map(mapVaultSummaryDto);

  let userPositions: VaultListViewData["userPositions"] = [];
  if (walletAddress) {
    try {
      const raw = await getUserPositions(walletAddress);
      userPositions = raw.map(mapUserPositionDto);
    } catch {
      userPositions = [];
    }
  }

  return { vaults, userPositions };
}

export function useVaultListData() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["vault-list-data", address ?? ""],
    queryFn: () => fetchVaultListView(address),
  });
}
