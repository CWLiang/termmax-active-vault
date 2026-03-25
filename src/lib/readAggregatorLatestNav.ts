import type { Address, PublicClient } from "viem";
import { formatUnits } from "viem";

import { aggregatorV3LatestRoundDataAbi } from "@/abis/dataFeed";
import { parseDecimal } from "@/domain/vaults/mappers";

export type AggregatorLatestNav = {
  roundId: bigint;
  answerRaw: bigint;
  nav: number;
  updatedAtSec: bigint;
};

/**
 * Reads latest oracle answer from an AggregatorV3-compatible feed (e.g. CustomAggregatorV3CompatibleFeed).
 * Returns null when no round has been submitted yet (empty feed).
 */
export async function readAggregatorLatestNav(
  client: PublicClient,
  params: { address: Address; chainId: number; decimals: number },
): Promise<AggregatorLatestNav | null> {
  const row = await client.readContract({
    address: params.address,
    abi: aggregatorV3LatestRoundDataAbi,
    functionName: "latestRoundData",
    chainId: params.chainId,
  });
  const [roundId, answer, , updatedAt] = row;
  if (answer <= 0n) return null;
  const nav = parseDecimal(formatUnits(answer, params.decimals));
  return { roundId, answerRaw: answer, nav, updatedAtSec: updatedAt };
}
