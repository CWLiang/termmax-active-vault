import { useQuery } from "@tanstack/react-query";
import type { NavSnapshotDto } from "@/services/api/types";
import {
  buildPortfolioFromAllocations,
  buildVaultDetailView,
  computeNavDelta7d,
  navSnapshotsToChartData,
} from "@/domain/vaults/mappers";
import {
  getActivity,
  getAllocations,
  getNavHistory,
  getRisk,
  getVault,
  type NavPeriod,
} from "@/services/api/vaultsApi";
import { normalizeVaultAddress } from "@/lib/evmAddress";

export type VaultDetailBundle = {
  detailView: ReturnType<typeof buildVaultDetailView>;
  portfolio: ReturnType<typeof buildPortfolioFromAllocations>;
  navByPeriod: Record<NavPeriod, { chart: ReturnType<typeof navSnapshotsToChartData>; raw: NavSnapshotDto[] }>;
  activity: Awaited<ReturnType<typeof getActivity>>;
};

async function fetchBundle(chainId: number, mTokenAddress: string): Promise<VaultDetailBundle> {
  const addr = normalizeVaultAddress(mTokenAddress);

  const [detail, nav7d, nav30d, nav90d, activity] = await Promise.all([
    getVault(chainId, addr),
    getNavHistory(chainId, addr, "7d").catch((): NavSnapshotDto[] => []),
    getNavHistory(chainId, addr, "30d").catch((): NavSnapshotDto[] => []),
    getNavHistory(chainId, addr, "90d").catch((): NavSnapshotDto[] => []),
    getActivity(chainId, addr, { limit: 25, page: 1, type: "all" }).catch(() => ({
      items: [],
      page: 1,
      totalPages: 0,
      totalItems: 0,
    })),
  ]);

  const [risk, allocation] = await Promise.all([
    getRisk(chainId, addr).catch(() => null),
    getAllocations(chainId, addr).catch(() => null),
  ]);

  const detailView = buildVaultDetailView(detail, risk, allocation);
  detailView.navDelta7d = computeNavDelta7d(nav7d);

  const portfolio = buildPortfolioFromAllocations(allocation);

  const navByPeriod = {
    "7d": { chart: navSnapshotsToChartData(nav7d), raw: nav7d },
    "30d": { chart: navSnapshotsToChartData(nav30d), raw: nav30d },
    "90d": { chart: navSnapshotsToChartData(nav90d), raw: nav90d },
  } as const;

  return { detailView, portfolio, navByPeriod, activity };
}

export function useVaultDetailBundle(chainId: number | undefined, mTokenAddress: string | undefined) {
  const enabled = chainId != null && Number.isFinite(chainId) && !!mTokenAddress && mTokenAddress.startsWith("0x");

  return useQuery({
    queryKey: ["vault-detail-bundle", chainId, mTokenAddress ? normalizeVaultAddress(mTokenAddress) : ""],
    queryFn: () => fetchBundle(chainId!, mTokenAddress!),
    enabled,
  });
}
