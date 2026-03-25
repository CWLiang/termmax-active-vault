import { apiGet } from "./client";
import type {
  ActivityResponseDto,
  AllocationResponseDto,
  DepositRequestListResponseDto,
  NavSnapshotDto,
  RedeemRequestListResponseDto,
  RequestStatus,
  RiskResponseDto,
  VaultDetailDto,
  VaultListResponseDto,
} from "./types";

export type NavPeriod = "7d" | "30d" | "90d";

export type VaultListQuery = {
  chainId?: number;
  underlying?: string;
  curator?: string;
  sortBy?: "apy" | "tvl";
  sortOrder?: "asc" | "desc";
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function listVaults(query: VaultListQuery = {}): Promise<VaultListResponseDto> {
  return apiGet(`/vaults${buildQuery(query)}`);
}

export function getVault(chainId: number, mTokenAddress: string): Promise<VaultDetailDto> {
  return apiGet(`/vaults/${chainId}/${mTokenAddress}`);
}

export function getNavHistory(
  chainId: number,
  mTokenAddress: string,
  period: NavPeriod,
): Promise<NavSnapshotDto[]> {
  return apiGet(`/vaults/${chainId}/${mTokenAddress}/nav-history${buildQuery({ period })}`);
}

export function getAllocations(chainId: number, mTokenAddress: string): Promise<AllocationResponseDto> {
  return apiGet(`/vaults/${chainId}/${mTokenAddress}/allocations`);
}

export function getRisk(chainId: number, mTokenAddress: string): Promise<RiskResponseDto> {
  return apiGet(`/vaults/${chainId}/${mTokenAddress}/risk`);
}

export function getActivity(
  chainId: number,
  mTokenAddress: string,
  opts: { limit?: number; page?: number; type?: "all" | "deposit" | "withdraw"; search?: string } = {},
): Promise<ActivityResponseDto> {
  return apiGet(
    `/vaults/${chainId}/${mTokenAddress}/activity${buildQuery({
      limit: opts.limit ?? 20,
      page: opts.page ?? 1,
      type: opts.type ?? "all",
      search: opts.search,
    })}`,
  );
}

export function getRedeemRequests(
  chainId: number,
  mTokenAddress: string,
  opts: {
    status?: RequestStatus;
    user?: string;
    limit?: number;
    page?: number;
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<RedeemRequestListResponseDto> {
  return apiGet(
    `/vaults/${chainId}/${mTokenAddress}/redeem-requests${buildQuery({
      status: opts.status,
      user: opts.user,
      limit: opts.limit ?? 10,
      page: opts.page ?? 1,
      sortOrder: opts.sortOrder ?? "desc",
    })}`,
  );
}

export function getDepositRequests(
  chainId: number,
  mTokenAddress: string,
  opts: {
    status?: RequestStatus;
    user?: string;
    limit?: number;
    page?: number;
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<DepositRequestListResponseDto> {
  return apiGet(
    `/vaults/${chainId}/${mTokenAddress}/deposit-requests${buildQuery({
      status: opts.status,
      user: opts.user,
      limit: opts.limit ?? 10,
      page: opts.page ?? 1,
      sortOrder: opts.sortOrder ?? "desc",
    })}`,
  );
}
