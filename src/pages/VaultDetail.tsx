import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  ExternalLink,
  Info,
  FileText,
  Lock,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useVaultDetailBundle } from "@/hooks/queries/useVaultDetailBundle";
import { useVaultListData } from "@/hooks/queries/useVaultListData";
import { useAccount } from "wagmi";
import type { PortfolioPieSlice, PortfolioRow, VaultDetailView } from "@/domain/vaults/mappers";
import { getExplorerAddressUrl, getExplorerTxUrl } from "@/lib/explorer";
import { parseDecimal } from "@/domain/vaults/mappers";

function formatUSD(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Address copied to clipboard");
}

function VaultDetailsSection({ view }: { view: VaultDetailView }) {
  const perfPct = view.performanceFeeBps != null ? (view.performanceFeeBps / 100).toFixed(2) : null;
  const explorer = getExplorerAddressUrl(view.chainId, view.mTokenAddress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border bg-card p-5 space-y-1"
    >
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display font-semibold text-foreground">Vault Details</h3>
      </div>
      <Table>
        <TableBody>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0 w-40">Curator</TableCell>
            <TableCell className="text-sm py-2.5 px-0">
              <a
                href={view.curatorUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {view.curator} <ExternalLink className="h-3 w-3" />
              </a>
            </TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0 w-40">Yield Type</TableCell>
            <TableCell className="text-foreground text-sm py-2.5 px-0">{view.yieldTypeLabel}</TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Redemption</TableCell>
            <TableCell className="text-foreground text-sm py-2.5 px-0">
              {view.redemptionTerms || "—"}
            </TableCell>
          </TableRow>
          {view.managementFeePercent != null && (
            <TableRow className="border-border">
              <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Management Fee</TableCell>
              <TableCell className="text-foreground text-sm font-mono py-2.5 px-0">{view.managementFeePercent}%</TableCell>
            </TableRow>
          )}
          {perfPct != null && (
            <TableRow className="border-border">
              <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Performance Fee</TableCell>
              <TableCell className="text-foreground text-sm font-mono py-2.5 px-0">{perfPct}%</TableCell>
            </TableRow>
          )}
          {view.custody ? (
            <TableRow className="border-border">
              <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Custody</TableCell>
              <TableCell className="text-foreground text-sm py-2.5 px-0 flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-buffer-safe" />
                {view.custody}
              </TableCell>
            </TableRow>
          ) : null}
          {view.auditor ? (
            <TableRow className="border-border">
              <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Auditor</TableCell>
              <TableCell className="text-sm py-2.5 px-0 text-foreground">{view.auditor}</TableCell>
            </TableRow>
          ) : null}
          {view.riskFactors.length > 0 && (
            <TableRow className="border-border">
              <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0 align-top">Risk factors</TableCell>
              <TableCell className="text-xs py-2.5 px-0 text-muted-foreground space-y-2">
                {view.riskFactors.map((rf) => (
                  <div key={rf.id}>
                    <div className="font-medium text-foreground">{rf.title}</div>
                    <div>{rf.description}</div>
                  </div>
                ))}
              </TableCell>
            </TableRow>
          )}
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Track record</TableCell>
            <TableCell className="text-foreground text-sm font-mono py-2.5 px-0">{view.trackRecordDays}d</TableCell>
          </TableRow>
          <TableRow className="border-0">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">mToken</TableCell>
            <TableCell className="text-sm py-2.5 px-0">
              <a href={explorer} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline inline-flex items-center gap-1">
                {truncateAddress(view.mTokenAddress)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </motion.div>
  );
}

const MAX_VISIBLE = 4;

function CollapsibleRows({ rows, renderRow }: { rows: PortfolioRow[]; renderRow: (row: PortfolioRow, i: number) => ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = rows.length > MAX_VISIBLE;
  const visible = needsCollapse && !expanded ? rows.slice(0, MAX_VISIBLE) : rows;
  const hiddenCount = rows.length - MAX_VISIBLE;

  return (
    <div>
      {visible.map((row, i) => renderRow(row, i))}
      {needsCollapse && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors mt-1 pl-0"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Show less" : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}

function PortfolioSection({
  view,
  pieData,
  assetRows,
  loanRows,
  totalAssets,
  totalLoans,
  netAssetValue,
}: {
  view: VaultDetailView;
  pieData: PortfolioPieSlice[];
  assetRows: PortfolioRow[];
  loanRows: PortfolioRow[];
  totalAssets: number;
  totalLoans: number;
  netAssetValue: number;
}) {
  const loanColor = "hsl(0, 65%, 55%)";
  const [strategyExpanded, setStrategyExpanded] = useState(false);

  const byCategory = useMemo(() => {
    const m = new Map<string, PortfolioRow[]>();
    for (const r of assetRows) {
      const k = r.category || "Other";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }, [assetRows]);

  const renderRow = (row: PortfolioRow, i: number, showPct: boolean) => (
    <div key={`${row.name}-${i}`} className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-foreground truncate">{row.name}</span>
        <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">{row.protocol}</span>
      </div>
      <div className="flex items-center shrink-0">
        {showPct ? (
          <span className="font-mono text-xs text-foreground w-12 text-right">{row.valuePct.toFixed(1)}%</span>
        ) : (
          <span className="w-12" />
        )}
        <span className="font-mono text-xs text-muted-foreground w-24 text-right">{formatUSD(row.amountUsd)}</span>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-display font-semibold text-foreground mb-5">Portfolio — Asset Allocation</h3>

      <div className="rounded-lg bg-secondary/50 border border-border p-4 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Total Assets</div>
            <div className="text-lg font-mono font-bold text-foreground">{formatUSD(totalAssets)}</div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Outstanding Loans</div>
            <div className="text-lg font-mono font-bold" style={{ color: loanColor }}>
              − {formatUSD(totalLoans)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Net Asset Value</div>
            <div className="text-lg font-mono font-bold text-primary">{formatUSD(netAssetValue)}</div>
          </div>
        </div>
      </div>

      <div className="mb-6 px-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Strategy</span>
          <button
            type="button"
            onClick={() => setStrategyExpanded(!strategyExpanded)}
            className="text-[11px] text-primary flex items-center gap-1 hover:underline"
          >
            {strategyExpanded ? "Less" : "Details"}
            {strategyExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{view.strategy}</p>
        <AnimatePresence>
          {strategyExpanded && (view.strategyDetail || view.strategy) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{view.strategyDetail || view.strategy}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {pieData.length === 0 && assetRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No allocation breakdown available for this vault.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-start gap-8">
          <div className="w-44 flex-shrink-0 self-center">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={44}
                    outerRadius={68}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={2}
                    stroke="hsl(220, 18%, 10%)"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
              {pieData.map((entry, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                  {entry.name} {entry.value.toFixed(1)}%
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full space-y-5">
            {[...byCategory.entries()].map(([cat, rows]) => {
              const catAmount = rows.reduce((s, r) => s + r.amountUsd, 0);
              const catPct = totalAssets > 0 ? (catAmount / totalAssets) * 100 : 0;
              const color = pieData.find((p) => p.name === cat)?.color ?? "hsl(187, 100%, 50%)";
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color }}>
                      <span className="w-3 h-3 rounded" style={{ background: color }} />
                      {cat}
                    </span>
                    <div className="flex items-center">
                      <span className="font-mono text-xs font-semibold text-foreground w-12 text-right">{catPct.toFixed(1)}%</span>
                      <span className="font-mono text-xs text-muted-foreground w-24 text-right">{formatUSD(catAmount)}</span>
                    </div>
                  </div>
                  <div className="pl-5">
                    <CollapsibleRows rows={rows} renderRow={(row, i) => renderRow(row, i, true)} />
                  </div>
                </div>
              );
            })}

            {loanRows.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: loanColor }}>
                    <span className="w-3 h-3 rounded" style={{ background: loanColor }} />
                    Loans (Liabilities)
                  </span>
                  <div className="flex items-center">
                    <span className="w-12" />
                    <span className="font-mono text-xs font-semibold w-24 text-right" style={{ color: loanColor }}>
                      {formatUSD(totalLoans)}
                    </span>
                  </div>
                </div>
                <div className="pl-5">
                  <CollapsibleRows rows={loanRows} renderRow={(row, i) => renderRow(row, i, false)} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function NAVChart({
  view,
  navByPeriod,
}: {
  view: VaultDetailView;
  navByPeriod: import("@/hooks/queries/useVaultDetailBundle").VaultDetailBundle["navByPeriod"];
}) {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const chartData = navByPeriod[period].chart;
  const apyMap = { "7d": view.apy7d, "30d": view.apy30d, "90d": view.apy90d };
  const currentAPY = apyMap[period];
  const latestNAV = chartData.length ? chartData[chartData.length - 1].nav : view.nav;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div>
          <h3 className="font-display font-semibold text-foreground">NAV Performance</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-3 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground font-mono">APY</span>
            <span className="text-sm font-mono font-bold text-primary">{currentAPY.toFixed(2)}%</span>
          </div>
          <div className="flex bg-secondary rounded-lg p-0.5">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-xs font-mono px-2.5 py-1 rounded-md transition-all",
                  p === period ? "bg-primary/20 text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-mono font-bold text-foreground">${latestNAV.toFixed(4)}</span>
        <span
          className={cn(
            "text-xs font-mono",
            view.navDelta24h >= 0 ? "text-yield-positive" : "text-destructive",
          )}
        >
          {view.navDelta24h >= 0 ? "+" : ""}
          {view.navDelta24h.toFixed(3)}% (24h)
        </span>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">No NAV history for this range.</p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }}
                axisLine={false}
                tickLine={false}
                interval={period === "90d" ? 14 : period === "30d" ? 6 : 1}
              />
              <YAxis
                domain={["dataMin - 0.005", "dataMax + 0.005"]}
                tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toFixed(3)}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 15%, 16%)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(215, 15%, 55%)" }}
                formatter={(value: number) => [`$${value.toFixed(4)}`, "NAV"]}
              />
              <Area type="monotone" dataKey="nav" stroke="hsl(187, 100%, 50%)" strokeWidth={2} fill="url(#navGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

function DepositPanel({ view }: { view: VaultDetailView }) {
  const [amount, setAmount] = useState("");
  const parsedAmount = parseFloat(amount) || 0;
  const remainingCapacity = Math.max(0, view.capacity - view.tvl);
  const exceedsCapacity = parsedAmount > remainingCapacity;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground font-mono mb-1.5 block">
          Deposit Amount ({view.underlyingSymbol})
        </label>
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={cn(
            "font-mono text-lg bg-secondary border-border",
            exceedsCapacity && "border-destructive focus-visible:ring-destructive",
          )}
        />
      </div>
      {parsedAmount > 0 && !exceedsCapacity && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Remaining Capacity</span>
            <span className="text-foreground font-mono">{formatUSD(remainingCapacity)}</span>
          </div>
        </motion.div>
      )}
      {exceedsCapacity && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1.5"
        >
          <p className="text-xs text-destructive font-semibold">Exceeds vault capacity</p>
          <p className="text-[11px] text-muted-foreground">
            Remaining capacity is <span className="font-mono font-semibold text-foreground">{formatUSD(remainingCapacity)}</span>.
          </p>
        </motion.div>
      )}
      <Button className="w-full" disabled={parsedAmount <= 0 || exceedsCapacity}>
        <ArrowDownToLine className="h-4 w-4" /> Deposit {view.underlyingSymbol}
      </Button>
    </div>
  );
}

function WithdrawPanel({ view }: { view: VaultDetailView }) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const parsedAmount = parseFloat(amount) || 0;
  const userBalance = 0;
  const instantLiquidity = view.liquidityAmount;
  const exceedsBuffer = parsedAmount > instantLiquidity;

  return (
    <div className="space-y-4">
      {step === 1 && (
        <>
          <div>
            <label className="text-xs text-muted-foreground font-mono mb-1.5 block">
              Withdraw Amount ({view.underlyingSymbol})
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-lg bg-secondary border-border"
            />
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                Balance: {userBalance.toLocaleString()} {view.underlyingSymbol}
              </span>
            </div>
          </div>
          {exceedsBuffer && parsedAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-buffer-warning/10 border border-buffer-warning/30 space-y-2"
            >
              <p className="text-xs text-buffer-warning">
                ⚠ Exceeds instant liquidity ({formatUSD(instantLiquidity)}).
              </p>
            </motion.div>
          )}
          <Button className="w-full" variant={exceedsBuffer ? "accent" : "default"} disabled={parsedAmount <= 0} onClick={() => (exceedsBuffer ? setStep(2) : undefined)}>
            <ArrowUpFromLine className="h-4 w-4" />
            {exceedsBuffer ? "Review Withdrawal" : `Withdraw ${view.underlyingSymbol}`}
          </Button>
        </>
      )}
      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h4 className="font-display font-semibold text-foreground">Withdrawal Summary</h4>
          <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Instant withdrawal</span>
              <span className="text-buffer-safe font-mono font-semibold">{formatUSD(instantLiquidity)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Queued amount</span>
              <span className="text-buffer-warning font-mono font-semibold">{formatUSD(parsedAmount - instantLiquidity)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground font-mono">{formatUSD(parsedAmount)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="accent" className="flex-1">
              Confirm
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function VaultDetailPage() {
  const { chainId: chainIdParam, address: addressParam } = useParams();
  const navigate = useNavigate();
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : undefined;
  const mTokenAddress = addressParam;

  const { data, isLoading, isError, error } = useVaultDetailBundle(chainId, mTokenAddress);
  const { address } = useAccount();
  const { data: listData } = useVaultListData();

  const myPosition = useMemo(() => {
    if (!address || !listData?.userPositions?.length || !chainId || !mTokenAddress) return null;
    const a = mTokenAddress.toLowerCase();
    return listData.userPositions.find(
      (p) => p.chainId === chainId && p.mTokenAddress.toLowerCase() === a,
    );
  }, [address, listData, chainId, mTokenAddress]);

  if (chainId == null || Number.isNaN(chainId) || !mTokenAddress) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-muted-foreground">
        Invalid vault link. <button type="button" className="text-primary underline" onClick={() => navigate("/")}>Back</button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6 max-w-6xl mx-auto text-muted-foreground">Loading vault…</div>;
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-destructive">
        Failed to load vault{error instanceof Error ? `: ${error.message}` : ""}.
        <button type="button" className="block mt-2 text-primary underline" onClick={() => navigate("/")}>
          Back to Vaults
        </button>
      </div>
    );
  }

  const { detailView: view, portfolio, navByPeriod, activity } = data;
  const explorer = getExplorerAddressUrl(view.chainId, view.mTokenAddress);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="text-sm text-muted-foreground hover:text-primary transition-colors mb-6 flex items-center gap-1"
      >
        ← Back to Vaults
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-foreground">{view.name}</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(view.mTokenAddress)}
                      className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded hover:text-foreground transition-colors cursor-pointer"
                    >
                      {truncateAddress(view.mTokenAddress)}
                      <Copy className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Click to copy address</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <a href={explorer} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="font-mono">{view.curator}</span>
              <span className="text-border">•</span>
              <Clock className="h-4 w-4" />
              <span className="font-mono">{view.trackRecordDays}d track record</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">TVL (NAV)</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-2xl font-display font-bold text-foreground">{formatUSD(view.tvl)}</span>
                <div className="text-xs text-muted-foreground font-mono">{view.underlyingSymbol}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Vault Capacity</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {view.capacity > 0 ? `${((view.tvl / view.capacity) * 100).toFixed(0)}% filled` : "—"}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-display font-bold text-foreground">{formatUSD(view.capacity)}</span>
                <span className="text-xs text-muted-foreground font-mono">cap</span>
              </div>
              {view.capacity > 0 && (
                <div className="space-y-1.5">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, (view.tvl / view.capacity) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-end text-[10px] font-mono">
                    <span className="text-primary">Available: {formatUSD(Math.max(0, view.capacity - view.tvl))}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <NAVChart view={view} navByPeriod={navByPeriod} />

          <PortfolioSection
            view={view}
            pieData={portfolio.pieData}
            assetRows={portfolio.assetRows}
            loanRows={portfolio.loanRows}
            totalAssets={portfolio.totalAssets}
            totalLoans={portfolio.totalLoans}
            netAssetValue={portfolio.netAssetValue}
          />

          <VaultDetailsSection view={view} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h3 className="font-display font-semibold text-foreground mb-4">On-chain Activity</h3>
            <p className="text-xs text-muted-foreground mb-3">Recent deposits and withdrawals (from indexer).</p>
            <div className="space-y-3">
              {activity.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                activity.items.map((a, i) => (
                  <div key={`${a.txHash}-${i}`} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0 gap-2 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground capitalize">
                        {a.type} · {formatUSD(parseDecimal(a.usdValue))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{truncateAddress(a.user)}</span>
                      <a
                        href={getExplorerTxUrl(view.chainId, a.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary/80 hover:text-primary inline-flex items-center gap-1 truncate max-w-[140px]"
                      >
                        {truncateAddress(a.txHash)}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <div className="mt-2 mb-2 rounded-lg border border-border/40 bg-card/50 px-5 py-4">
            <div className="flex items-start gap-2.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-[11px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1.5">Risk Disclaimer</h4>
                <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                  Investing in TermMax Active Vaults involves risk, including potential loss of principal due to smart contract vulnerabilities, market
                  volatility, and liquidity constraints. Please review all relevant documentation before proceeding.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="sticky top-6 space-y-6 w-full"
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">My Position</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-display font-bold text-foreground">
                      {myPosition ? myPosition.shares.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{view.underlyingSymbol}</span>
                  </div>
                </div>
                <div className="flex justify-end mt-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {myPosition ? `≈ $${myPosition.redeemableUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Connect wallet to view"}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <Tabs defaultValue="deposit">
                  <TabsList className="w-full bg-secondary mb-4">
                    <TabsTrigger value="deposit" className="flex-1 font-mono text-xs">
                      <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" /> Deposit
                    </TabsTrigger>
                    <TabsTrigger value="withdraw" className="flex-1 font-mono text-xs">
                      <ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" /> Withdraw
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="deposit">
                    <DepositPanel view={view} />
                  </TabsContent>
                  <TabsContent value="withdraw">
                    <WithdrawPanel view={view} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
