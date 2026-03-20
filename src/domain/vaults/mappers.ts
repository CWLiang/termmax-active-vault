import type { UserPositionSummary, VaultSummary, RiskLevel } from "@/domain/vaults/types";
import { normalizeVaultAddress } from "@/lib/evmAddress";
import type {
  AllocationItemDto,
  AllocationResponseDto,
  NavSnapshotDto,
  RiskResponseDto,
  UserPositionDto,
  VaultDetailDto,
  VaultSummaryDto,
} from "@/services/api/types";

export function parseDecimal(s: string | undefined | null): number {
  if (s == null || s === "") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeRiskLevel(raw: string): RiskLevel {
  const x = raw?.toLowerCase() ?? "";
  if (x === "low") return "Low";
  if (x === "high") return "High";
  return "Medium";
}

export function vaultDetailPath(chainId: number, mTokenAddress: string): string {
  return `/vault/${chainId}/${normalizeVaultAddress(mTokenAddress)}`;
}

export function mapVaultSummaryDto(dto: VaultSummaryDto): VaultSummary {
  return {
    id: dto.id,
    chainId: dto.chainId,
    mTokenAddress: dto.mTokenAddress,
    name: dto.name,
    curator: dto.curator,
    strategy: dto.description,
    apy7d: dto.apy7d,
    apy30d: dto.apy30d,
    tvl: parseDecimal(dto.tvl),
    capacity: parseDecimal(dto.capacityValue),
    bufferRatio: dto.bufferPercentage,
    riskLevel: normalizeRiskLevel(dto.riskLevel),
    trackRecordDays: dto.trackRecordDays,
    underlyingSymbol: dto.underlyingSymbol,
    navPerShare: parseDecimal(dto.navPerShare),
  };
}

export function mapUserPositionDto(dto: UserPositionDto): UserPositionSummary {
  const est = parseDecimal(dto.estimatedValue);
  const nav = parseDecimal(dto.navPerShare);
  return {
    vaultId: dto.vaultId,
    vaultName: dto.vaultName,
    chainId: dto.chainId,
    mTokenAddress: dto.mTokenAddress,
    underlyingSymbol: dto.underlyingSymbol,
    shares: parseDecimal(dto.shares),
    pricePerShare: nav,
    redeemableUSDC: est,
    redeemableUSD: est,
    apy7d: dto.apy7d,
  };
}

const PIE_PALETTE = [
  "hsl(187, 100%, 50%)",
  "hsl(40, 90%, 55%)",
  "hsl(270, 70%, 60%)",
  "hsl(160, 70%, 45%)",
  "hsl(330, 70%, 55%)",
  "hsl(24, 90%, 55%)",
];

export type PortfolioPieSlice = { name: string; value: number; color: string };
export type PortfolioRow = {
  name: string;
  protocol: string;
  category: string;
  valuePct: number;
  amountUsd: number;
  isLoan: boolean;
};

export function buildPortfolioFromAllocations(allocation: AllocationResponseDto | null | undefined): {
  totalAssets: number;
  totalLoans: number;
  netAssetValue: number;
  strategyDetails: string;
  pieData: PortfolioPieSlice[];
  assetRows: PortfolioRow[];
  loanRows: PortfolioRow[];
} {
  if (!allocation) {
    return {
      totalAssets: 0,
      totalLoans: 0,
      netAssetValue: 0,
      strategyDetails: "",
      pieData: [],
      assetRows: [],
      loanRows: [],
    };
  }

  const totalAssets = allocation.totalAssets || 0;
  const totalLoans = allocation.outstandingLoans || 0;
  const nav = allocation.netAssetValue || Math.max(0, totalAssets - totalLoans);

  const byCategory = new Map<string, number>();
  for (const item of allocation.assets ?? []) {
    const key = item.category || "Other";
    byCategory.set(key, (byCategory.get(key) ?? 0) + item.netUsdValue);
  }

  const pieData: PortfolioPieSlice[] = [];
  let i = 0;
  for (const [name, value] of byCategory.entries()) {
    if (value <= 0) continue;
    const pct = totalAssets > 0 ? (value / totalAssets) * 100 : 0;
    pieData.push({
      name,
      value: pct,
      color: PIE_PALETTE[i % PIE_PALETTE.length],
    });
    i += 1;
  }

  const mapItem = (item: AllocationItemDto, isLoan: boolean): PortfolioRow => {
    const label =
      item.tokens?.map((t) => t.symbol).filter(Boolean).join(", ") ||
      item.poolId ||
      item.protocolName;
    const denom = isLoan ? totalLoans || 1 : totalAssets || 1;
    const valuePct = (item.netUsdValue / denom) * 100;
    return {
      name: label,
      protocol: item.protocolName,
      category: item.category || (isLoan ? "Loan" : "Asset"),
      valuePct,
      amountUsd: item.netUsdValue,
      isLoan,
    };
  };

  const assetRows = (allocation.assets ?? []).map((a) => mapItem(a, false));
  const loanRows = (allocation.loans ?? []).map((a) => mapItem(a, true));

  return {
    totalAssets,
    totalLoans,
    netAssetValue: nav,
    strategyDetails: allocation.strategyDetails ?? "",
    pieData,
    assetRows,
    loanRows,
  };
}

export function navSnapshotsToChartData(snapshots: NavSnapshotDto[]): { day: string; nav: number }[] {
  return (snapshots ?? []).map((s) => ({
    day: formatChartTick(s.timestamp),
    nav: parseDecimal(s.navPerShare),
  }));
}

function formatChartTick(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return iso;
  }
}

export interface VaultDetailView {
  chainId: number;
  mTokenAddress: string;
  name: string;
  curator: string;
  curatorUrl: string;
  strategy: string;
  strategyDetail: string;
  apy7d: number;
  apy30d: number;
  apy90d: number;
  tvl: number;
  capacity: number;
  bufferRatio: number;
  bufferAmount: number;
  liquidityAmount: number;
  nav: number;
  navDelta24h: number;
  navDelta7d: number;
  sharePrice: number;
  performanceFeeBps: number;
  instantFeeBps: number;
  redemptionTerms: string;
  custody: string;
  auditor: string;
  underlyingSymbol: string;
  depositVaultAddress: string;
  redemptionVaultAddress: string;
  vaultAddress: string;
  trackRecordDays: number;
  riskFactors: { id: string; title: string; description: string }[];
  /** Fields not in API — UI may hide or show placeholders */
  managementFeePercent: number | null;
  yieldTypeLabel: string;
  auditUrl: string;
  bugBountyLabel: string;
  bugBountyUrl: string;
  defiSafetyScore: number | null;
  defiSafetyUrl: string;
}

export function buildVaultDetailView(
  detail: VaultDetailDto,
  risk: RiskResponseDto | null | undefined,
  allocation: AllocationResponseDto | null | undefined,
): VaultDetailView {
  const tvl = parseDecimal(detail.tvl);
  const cap = parseDecimal(detail.capacityValue);
  const nav = parseDecimal(detail.navPerShare);
  const bufPct = detail.bufferPercentage;
  const bufferAmount = tvl * (bufPct / 100);

  return {
    chainId: detail.chainId,
    mTokenAddress: detail.mTokenAddress,
    name: detail.name,
    curator: detail.curator,
    curatorUrl: detail.curatorUrl || "#",
    strategy: detail.description,
    strategyDetail: allocation?.strategyDetails ?? "",
    apy7d: detail.apy7d,
    apy30d: detail.apy30d,
    apy90d: detail.apy90d,
    tvl,
    capacity: cap,
    bufferRatio: bufPct,
    bufferAmount,
    liquidityAmount: bufferAmount,
    nav,
    navDelta24h: detail.navChange24h,
    navDelta7d: 0,
    sharePrice: nav,
    performanceFeeBps: detail.performanceFee,
    instantFeeBps: detail.instantFee,
    redemptionTerms: risk?.redemptionTerms || detail.redemptionTerms || "",
    custody: risk?.custody ?? "",
    auditor: risk?.auditor ?? "",
    underlyingSymbol: detail.underlyingSymbol,
    depositVaultAddress: detail.depositVaultAddress,
    redemptionVaultAddress: detail.redemptionVaultAddress,
    vaultAddress: detail.vaultAddress,
    trackRecordDays: detail.trackRecordDays,
    riskFactors: risk?.riskFactors?.length ? risk.riskFactors : [],
    managementFeePercent: null,
    yieldTypeLabel: "Auto-compounded in NAV",
    auditUrl: "",
    bugBountyLabel: "",
    bugBountyUrl: "",
    defiSafetyScore: null,
    defiSafetyUrl: "",
  };
}

export function computeNavDelta7d(snapshots: NavSnapshotDto[]): number {
  if (!snapshots?.length) return 0;
  const first = parseDecimal(snapshots[0].navPerShare);
  const last = parseDecimal(snapshots[snapshots.length - 1].navPerShare);
  if (first <= 0) return 0;
  return ((last - first) / first) * 100;
}
