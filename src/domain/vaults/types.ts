export type RiskLevel = "Low" | "Medium" | "High";

export interface VaultSummary {
  id: string;
  chainId: number;
  mTokenAddress: string;
  name: string;
  curator: string;
  strategy: string;
  apy7d: number;
  apy30d: number;
  tvl: number;
  capacity: number;
  bufferRatio: number;
  riskLevel: RiskLevel;
  trackRecordDays: number;
  underlyingSymbol: string;
  /** NAV per share (underlying units), from API */
  navPerShare: number;
}

export interface UserPositionSummary {
  vaultId: string;
  vaultName: string;
  chainId: number;
  mTokenAddress: string;
  underlyingSymbol: string;
  shares: number;
  pricePerShare: number;
  redeemableUSDC: number;
  redeemableUSD: number;
  apy7d: number;
}

export interface VaultListViewData {
  vaults: VaultSummary[];
  userPositions: UserPositionSummary[];
}
