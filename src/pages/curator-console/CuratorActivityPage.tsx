import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";
import { useVaultActivityQuery } from "@/hooks/queries/useVaultActivityQuery";
import { formatDisplayNumber, formatUsdCompact } from "@/lib/formatNumbers";
import { getExplorerTxUrl } from "@/lib/explorer";

function formatUSD(value: number) {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs === 0) return "$0.00";
  // Preserve signal for tiny activity values that would otherwise round to $0.00.
  if (abs < 1) {
    return `$${formatDisplayNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  }
  return formatUsdCompact(value, "detail");
}

function truncateMiddle(value: string, start = 6, end = 4) {
  if (!value) return "—";
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function parseLooseNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = raw.replace(/[$,\s]/g, "");
  const match = normalized.match(/^-?\d+(\.\d+)?/);
  if (!match) return 0;
  const n = Number.parseFloat(match[0]);
  return Number.isFinite(n) ? n : 0;
}

function formatActivityType(raw: string): "Deposit" | "Redeem" | "Other" {
  const t = raw.toLowerCase();
  if (t.includes("deposit")) return "Deposit";
  if (t.includes("redeem") || t.includes("withdraw")) return "Redeem";
  return "Other";
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { hour12: false, timeZone: "UTC" }) + " UTC";
}

export default function CuratorActivityPage() {
  const { chainId, mTokenAddress, valid, vault } = useCuratorVaultSummary();
  const { data, isLoading, isError } = useVaultActivityQuery(
    valid ? chainId : undefined,
    valid ? mTokenAddress : undefined,
  );

  const items = (data?.items ?? []).filter((x) => {
    const t = x.type.toLowerCase();
    return t.includes("deposit") || t.includes("redeem") || t.includes("withdraw");
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">{vault?.name ?? "Vault activity feed"}</p>
      </motion.div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Deposit & Redeem Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load activity.</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deposit or redeem records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Action</th>
                    <th className="py-2 pr-3 font-medium">Amount (USD value)</th>
                    <th className="py-2 pr-3 font-medium">Wallet</th>
                    <th className="py-2 font-medium">Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a, i) => {
                    const activityType = formatActivityType(a.type);
                    const amount = parseLooseNumber(a.mTokenAmount ?? a.amount);
                    const usdValue = parseLooseNumber(a.usdValue);
                    return (
                      <tr key={`${a.txHash}-${a.date}-${i}`} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3 text-foreground">{activityType}</td>
                        <td className="py-2 pr-3 text-foreground">
                          {formatDisplayNumber(amount, { minimumFractionDigits: 0, maximumFractionDigits: 6 })} (
                          {formatUSD(usdValue)})
                          <div className="text-xs text-muted-foreground font-mono">{formatDateTime(a.date)}</div>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground font-mono" title={a.user}>
                          {truncateMiddle(a.user)}
                        </td>
                        <td className="py-2 text-muted-foreground font-mono">
                          {valid ? (
                            <a
                              href={getExplorerTxUrl(chainId, a.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary/80 hover:text-primary inline-flex items-center gap-1"
                            >
                              {truncateMiddle(a.txHash)}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span>{truncateMiddle(a.txHash)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
