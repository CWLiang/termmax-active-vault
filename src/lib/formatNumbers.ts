/**
 * Western-style digit grouping (e.g. 1,234.56), independent of browser locale.
 * Avoids zh-TW / zh-CN localized numerals or grouping when the UI should stay English.
 */
export const DISPLAY_NUMBER_LOCALE = "en-US" as const;

export function formatDisplayNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return String(value);
  return new Intl.NumberFormat(DISPLAY_NUMBER_LOCALE, options).format(value);
}

export type FormatNumberKmbOptions = {
  /** Fraction digits when |value| &lt; 1,000 */
  maxFracBelow1000?: number;
  /** Max fraction digits on the scaled value before K / M / B */
  suffixMaxFrac?: number;
};

/**
 * Compact count / token-style amounts: 1.2K, 3.45M, 1.2B (en-US grouping on the coefficient).
 */
export function formatNumberKmb(value: number, options?: FormatNumberKmbOptions): string {
  const maxBelow = options?.maxFracBelow1000 ?? 2;
  const suffixMax = options?.suffixMaxFrac ?? 2;
  if (!Number.isFinite(value)) return String(value);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const scaled = (div: number, letter: string) => {
    const q = abs / div;
    return `${sign}${formatDisplayNumber(q, { minimumFractionDigits: 0, maximumFractionDigits: suffixMax })}${letter}`;
  };
  if (abs >= 1_000_000_000) return scaled(1_000_000_000, "B");
  if (abs >= 1_000_000) return scaled(1_000_000, "M");
  if (abs >= 1_000) return scaled(1_000, "K");
  return formatDisplayNumber(value, { maximumFractionDigits: maxBelow });
}

/** Integer part of a base-10 string with comma grouping (no decimals). */
export function formatBigIntIntegerForDisplay(n: bigint): string {
  const s = n.toString();
  if (s.startsWith("-")) {
    if (s === "-0") return "0";
    return `-${formatBigIntIntegerForDisplay(-n)}`;
  }
  if (!/^\d+$/.test(s)) return s;
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Full USD with cents and thousands separators, e.g. $12,345.67 */
export function formatUsdWithCents(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return `$${formatDisplayNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type UsdCompactStyle = "list" | "detail" | "balanceSheet";

/**
 * Shorthand USD for cards and summaries.
 * - list: TVL-style ($1.2M / $500K / $999)
 * - detail: VaultDetail-style ($1.23M / $500K / $1,234.56)
 * - balanceSheet: M suffix with 1 decimal, else grouped whole dollars
 */
export function formatUsdCompact(value: number, style: UsdCompactStyle = "detail"): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (style === "list") {
    if (abs >= 1_000_000) {
      return `${sign}$${formatDisplayNumber(abs / 1_000_000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${formatDisplayNumber(Math.round(abs / 1_000), { maximumFractionDigits: 0 })}K`;
    }
    return `${sign}$${formatDisplayNumber(Math.round(abs), { maximumFractionDigits: 0 })}`;
  }

  if (style === "balanceSheet") {
    if (abs >= 1_000_000) {
      return `${sign}$${formatDisplayNumber(abs / 1_000_000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    return `${sign}$${formatDisplayNumber(Math.round(abs), { maximumFractionDigits: 0 })}`;
  }

  if (abs >= 1_000_000) {
    return `${sign}$${formatDisplayNumber(abs / 1_000_000, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${formatDisplayNumber(Math.round(abs / 1_000), { maximumFractionDigits: 0 })}K`;
  }
  return `${sign}$${formatDisplayNumber(abs, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
