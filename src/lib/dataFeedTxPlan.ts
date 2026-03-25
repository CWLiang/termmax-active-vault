/**
 * Build a valid transaction sequence for DataFeed min/max bounds.
 * @see midas-contract-interface/DataFeed.sol — each setter enforces the other bound already on-chain.
 */
export type DataFeedBoundTx =
  | { kind: "setMinExpectedAnswer"; value: bigint }
  | { kind: "setMaxExpectedAnswer"; value: bigint };

export function planMinMaxAnswerTxs(
  chainMin: bigint,
  chainMax: bigint,
  targetMin: bigint,
  targetMax: bigint,
): DataFeedBoundTx[] {
  if (targetMin <= 0n || targetMax <= 0n || targetMax <= targetMin) {
    throw new Error("Min/max expected answers must be positive integers with max > min.");
  }

  let min = chainMin;
  let max = chainMax;
  const txs: DataFeedBoundTx[] = [];
  let guard = 0;

  while (min !== targetMin || max !== targetMax) {
    if (guard++ > 32) {
      throw new Error("Could not derive a valid update order; adjust min/max in smaller steps.");
    }

    const before = txs.length;

    if (min !== targetMin && max > targetMin) {
      txs.push({ kind: "setMinExpectedAnswer", value: targetMin });
      min = targetMin;
    }

    if (max !== targetMax && targetMax > min) {
      txs.push({ kind: "setMaxExpectedAnswer", value: targetMax });
      max = targetMax;
    }

    if (txs.length === before) {
      throw new Error(
        "On-chain bounds prevent this update in one batch. Try intermediate values (e.g. adjust max before min).",
      );
    }
  }

  return txs;
}
