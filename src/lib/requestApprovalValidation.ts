import { parseUnits } from "viem";
import { stripNumberGrouping } from "@/lib/formatNumbers";

export function parseRequestIdOrNull(id: string | null | undefined): bigint | null {
  if (!id || !/^\d+$/.test(id)) return null;
  return BigInt(id);
}

export function parseRequestIdsOrError(
  ids: readonly string[],
): { ok: true; requestIds: bigint[] } | { ok: false; invalidId: string } {
  const requestIds: bigint[] = [];
  for (const id of ids) {
    const parsed = parseRequestIdOrNull(id);
    if (parsed == null) return { ok: false, invalidId: id };
    requestIds.push(parsed);
  }
  return { ok: true, requestIds };
}

export function parsePositiveRate18OrError(
  input: string,
): { ok: true; rate: bigint } | { ok: false; reason: "invalid" | "non_positive" } {
  const normalized = stripNumberGrouping(input).trim();
  let rate: bigint;
  try {
    rate = parseUnits(normalized || "0", 18);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (rate <= 0n) return { ok: false, reason: "non_positive" };
  return { ok: true, rate };
}
