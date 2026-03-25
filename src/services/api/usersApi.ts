import { apiGet } from "./client";
import type { UserPositionDto } from "./types";

export function getUserPositions(walletAddress: string): Promise<UserPositionDto[]> {
  const addr = walletAddress.startsWith("0x") ? walletAddress : `0x${walletAddress}`;
  return apiGet(`/users/${encodeURIComponent(addr)}/positions`);
}
