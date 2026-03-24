/** Subset of OpenAPI DTOs — https://termmax-strategy-vault-service.onrender.com/api-json */

export interface VaultSummaryDto {
  id: string;
  chainId: number;
  mTokenAddress: string;
  name: string;
  description: string;
  riskLevel: string;
  underlyingSymbol: string;
  underlyingAddress: string;
  underlyingName: string;
  underlyingIcon: string;
  curator: string;
  curatorUrl: string;
  curatorIcon: string;
  totalSupply: string;
  tvl: string;
  capacityCap: string;
  capacityValue: string;
  bufferPercentage: number;
  navPerShare: string;
  apy7d: number;
  apy30d: number;
  trackRecordDays: number;
}

export interface VaultListResponseDto {
  items: VaultSummaryDto[];
  totalCount: number;
}

export interface VaultDetailDto extends VaultSummaryDto {
  depositVaultAddress: string;
  redemptionVaultAddress: string;
  vaultAddress: string;
  instantFee: number;
  performanceFee: number;
  redemptionTerms: string;
  apy90d: number;
  navChange24h: number;
}

export interface NavSnapshotDto {
  timestamp: string;
  navPerShare: string;
  tvl: string;
}

export interface AllocationTokenDto {
  symbol: string;
  amount: number;
  usdValue: number;
}

export interface AllocationItemDto {
  protocolId: string;
  protocolName: string;
  protocolLogo: string;
  poolId: string;
  category: string;
  netUsdValue: number;
  healthRate?: number;
  tokens: AllocationTokenDto[];
}

export interface AllocationResponseDto {
  totalAssets: number;
  outstandingLoans: number;
  netAssetValue: number;
  strategyDetails: string;
  assets: AllocationItemDto[];
  loans: AllocationItemDto[];
}

export interface RiskFactorDto {
  id: string;
  title: string;
  description: string;
}

export interface RiskResponseDto {
  riskFactors: RiskFactorDto[];
  performanceFee: string;
  redemptionTerms: string;
  custody: string;
  auditor: string;
}

export interface ActivityItemDto {
  date: string;
  type: string;
  amount: string;
  usdValue: string;
  user: string;
  txHash: string;
}

export interface ActivityResponseDto {
  items: ActivityItemDto[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export type RequestStatus = "PENDING" | "PROCESSED" | "CANCELED";

export interface RedeemRequestItemDto {
  chainId: number;
  vaultAddress: string;
  requestId: string;
  status: RequestStatus;
  sender: string;
  recipient: string;
  tokenOut: string;
  amountMTokenIn: string;
  feeAmount: string;
  createdAt: string;
  updatedAt: string | null;
  createdTxHash: string;
  updatedTxHash: string | null;
  processedMTokenRate: string | null;
  terminalEventType: "APPROVE" | "SAFE_APPROVE" | "REJECT" | null;
}

export interface RedeemRequestListResponseDto {
  items: RedeemRequestItemDto[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface UserPositionDto {
  vaultId: string;
  vaultName: string;
  chainId: number;
  mTokenAddress: string;
  underlyingSymbol: string;
  shares: string;
  estimatedValue: string;
  navPerShare: string;
  curator: string;
  apy7d: number;
}
