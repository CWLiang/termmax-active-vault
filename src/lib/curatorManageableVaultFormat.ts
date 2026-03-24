import { formatUnits, isAddress, parseUnits } from "viem";
import { formatDisplayNumber, formatNumberKmb } from "./formatNumbers";

/** Matches `addPaymentToken` / on-chain token allowance storage (base-18 style amount). */
export const PAYMENT_ALLOWANCE_DECIMALS = 18;

export function shortAddr(a?: string) {
  if (!a) return "—";
  return a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
}

export function formatAmount(raw: bigint | undefined, decimals: number | undefined, maxFrac = 2) {
  if (raw == null) return "—";
  const d = decimals ?? 18;
  const n = Number(formatUnits(raw, d));
  if (!Number.isFinite(n)) return "—";
  const suffixFrac = maxFrac >= 6 ? 3 : 2;
  return formatNumberKmb(n, { maxFracBelow1000: maxFrac, suffixMaxFrac: suffixFrac });
}

export function formatFeePercent(raw: bigint | undefined) {
  if (raw == null) return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  return `${formatDisplayNumber(n / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/** Table cell display for payment-token allowance; full value in `title` tooltip. */
export function formatPaymentAllowanceDisplay(raw: bigint | undefined): string {
  if (raw == null) return "—";
  if (raw === 0n) return "0";
  const full = formatUnits(raw, PAYMENT_ALLOWANCE_DECIMALS);
  const n = Number(full);
  const fitsNumber = Number.isFinite(n) && Math.abs(n) <= 1e15;
  if (fitsNumber) {
    return formatNumberKmb(n, { maxFracBelow1000: 6, suffixMaxFrac: 2 });
  }
  const [intPart] = full.split(".");
  const digits = intPart.replace(/^-/, "");
  const intLen = digits.length;
  if (intLen > 9) {
    const sign = full.startsWith("-") ? "-" : "";
    const head = digits.slice(0, 3);
    const next = digits.slice(3, 5);
    const exp = intLen - 1;
    return `${sign}${head}.${next}×10^${exp}`;
  }
  return full.length > 32 ? `${full.slice(0, 28)}…` : full;
}

/** Multicall-style entry from `useReadContracts` (wagmi / viem). */
export function readContractsSuccessResult<T>(entry: unknown): T | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  const e = entry as { status?: string; result?: T };
  if (e.status !== "success") return undefined;
  return e.result;
}

export type PaymentTokenConfigRow = {
  dataFeed: `0x${string}`;
  fee: bigint;
  allowance: bigint;
  stable: boolean;
};

export function parsePaymentTokenDecimalsRead(entry: unknown): number | undefined {
  const v = readContractsSuccessResult<number | bigint>(entry);
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 255) return v;
  if (typeof v === "bigint" && v >= 0n && v <= 255n) return Number(v);
  return undefined;
}

export function parseTokenConfigResult(result: unknown): PaymentTokenConfigRow | undefined {
  if (result == null) return undefined;
  if (Array.isArray(result) && result.length >= 4) {
    const [dataFeed, fee, allowance, stable] = result;
    if (
      typeof dataFeed === "string" &&
      isAddress(dataFeed) &&
      typeof fee === "bigint" &&
      typeof allowance === "bigint" &&
      typeof stable === "boolean"
    ) {
      return { dataFeed, fee, allowance, stable };
    }
    return undefined;
  }
  if (typeof result !== "object") return undefined;
  const o = result as {
    dataFeed?: `0x${string}`;
    fee?: bigint;
    allowance?: bigint;
    stable?: boolean;
  };
  if (
    typeof o.dataFeed !== "string" ||
    !isAddress(o.dataFeed) ||
    typeof o.fee !== "bigint" ||
    typeof o.allowance !== "bigint" ||
    typeof o.stable !== "boolean"
  ) {
    return undefined;
  }
  return {
    dataFeed: o.dataFeed,
    fee: o.fee,
    allowance: o.allowance,
    stable: o.stable,
  };
}

export type InstantSettingsParseResult =
  | { ok: true; feePercent: number; feeRaw: bigint; dailyLimit: bigint }
  | { ok: false; reason: "fee" | "daily_invalid" | "daily_negative" };

export function parseInstantSettingsInputs(
  instantFeeInput: string,
  instantDailyLimitInput: string,
  mTokenDecimals: number | undefined,
): InstantSettingsParseResult {
  const feePercent = Number(instantFeeInput);
  if (!Number.isFinite(feePercent) || feePercent < 0) return { ok: false, reason: "fee" };
  const feeRaw = BigInt(Math.round(feePercent * 100));
  let dailyLimit: bigint;
  try {
    dailyLimit = parseUnits(instantDailyLimitInput || "0", mTokenDecimals != null ? Number(mTokenDecimals) : 18);
  } catch {
    return { ok: false, reason: "daily_invalid" };
  }
  if (dailyLimit < 0n) return { ok: false, reason: "daily_negative" };
  return { ok: true, feePercent, feeRaw, dailyLimit };
}
