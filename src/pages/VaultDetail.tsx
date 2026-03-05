import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Gauge } from "@/components/ui/gauge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Shield, Clock, ChevronDown, ChevronUp, ArrowDownToLine, ArrowUpFromLine,
  PieChart as PieChartIcon, Activity, ExternalLink, Info, FileText, Lock, Copy
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const VAULT_DATA = {
  name: "RWA Enhanced Yield",
  curator: "Keyrock Capital",
  strategy: "RWA collateral + fixed-rate leverage on TermMax",
  strategyDetail: "This vault purchases OUSG (Ondo US Government Bond) tokens using deposited USDC. The RWA tokens are then collateralized on TermMax to borrow USDC at a fixed interest rate, which is locked at the time of entry. The borrowed USDC is redeployed into additional RWA purchases, creating a leverage loop that amplifies the base yield while keeping borrowing costs certain.",
  apy7d: 8.42,
  apy30d: 7.95,
  apy90d: 8.12,
  tvl: 12500000,
  capacity: 25000000,
  bufferRatio: 15.3,
  bufferAmount: 1912500,
  nav: 1.0342,
  navDelta24h: 0.012,
  navDelta7d: 0.34,
  sharePrice: 1.0342,
  positions: { rwa: 62, termmax: 23, cash: 15 },
  managementFee: 1.0,
  performanceFee: 10.0,
  yieldType: "Auto-compounded in NAV",
  redemptionTimeline: "Instant up to buffer, 1–3 days queued",
  custody: "Non-custodial smart contract",
  auditor: "OpenZeppelin",
  inceptionDate: "Jan 2026",
  contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
  strategyContract: "0xabcdef1234567890abcdef1234567890abcdef12",
};

// Mock NAV history for chart — different lengths per timeframe
const NAV_HISTORY_7D = Array.from({ length: 7 }, (_, i) => ({
  day: `Feb ${i + 22}`,
  nav: +(1.028 + Math.random() * 0.008 + i * 0.0008).toFixed(4),
}));
const NAV_HISTORY_30D = Array.from({ length: 30 }, (_, i) => ({
  day: `Feb ${i + 1}`,
  nav: +(1.02 + Math.random() * 0.015 + i * 0.0005).toFixed(4),
}));
const NAV_HISTORY_90D = Array.from({ length: 90 }, (_, i) => ({
  day: `Dec ${(i % 31) + 1}`,
  nav: +(1.005 + Math.random() * 0.02 + i * 0.0003).toFixed(4),
}));

const NAV_DATA_MAP: Record<string, typeof NAV_HISTORY_7D> = {
  "7d": NAV_HISTORY_7D,
  "30d": NAV_HISTORY_30D,
  "90d": NAV_HISTORY_90D,
};
const APY_MAP: Record<string, number> = {
  "7d": VAULT_DATA.apy7d,
  "30d": VAULT_DATA.apy30d,
  "90d": VAULT_DATA.apy90d,
};

type RateType = "fixed" | "variable" | null;
type AllocationCategory = "RWA" | "Yield" | "Loan" | "Instant Liquidity";

interface AllocationItem {
  name: string;
  protocol: string;
  category: AllocationCategory;
  rateType: RateType;
  value: number;
  amount: number;
  color: string;
}

const CATEGORY_COLORS: Record<AllocationCategory, string> = {
  RWA: "hsl(187, 100%, 50%)",
  Yield: "hsl(270, 70%, 55%)",
  Loan: "hsl(0, 65%, 55%)",
  "Instant Liquidity": "hsl(160, 70%, 45%)",
};

const ALLOCATION_DATA: AllocationItem[] = [
  { name: "OUSG", protocol: "Ondo Finance", category: "RWA", rateType: null, value: 42, amount: 5250000, color: CATEGORY_COLORS.RWA },
  { name: "DigiFT Treasury", protocol: "DigiFT", category: "RWA", rateType: null, value: 12, amount: 1500000, color: CATEGORY_COLORS.RWA },
  { name: "USDC Supply", protocol: "Morpho", category: "Yield", rateType: "variable", value: 8, amount: 1000000, color: CATEGORY_COLORS.Yield },
  { name: "FT-USDC-Jun26", protocol: "TermMax", category: "Yield", rateType: "fixed", value: 10, amount: 1250000, color: CATEGORY_COLORS.Yield },
  { name: "PT-sUSDe-Mar26", protocol: "Pendle", category: "Yield", rateType: "fixed", value: 6, amount: 750000, color: CATEGORY_COLORS.Yield },
  { name: "USDC Borrow", protocol: "AAVE", category: "Loan", rateType: "variable", value: 5, amount: 625000, color: CATEGORY_COLORS.Loan },
  { name: "GT-USDC-Jun26", protocol: "TermMax", category: "Loan", rateType: "fixed", value: 2, amount: 250000, color: CATEGORY_COLORS.Loan },
  { name: "USDC", protocol: "Vault", category: "Instant Liquidity", rateType: null, value: 15, amount: 1875000, color: CATEGORY_COLORS["Instant Liquidity"] },
];

const CATEGORY_META: Record<AllocationCategory, { label: string }> = {
  RWA: { label: "RWA" },
  Yield: { label: "Yield" },
  Loan: { label: "Loan" },
  "Instant Liquidity": { label: "Instant Liquidity" },
};

// Assets only (exclude Loan) for pie chart
const ASSET_CATEGORIES: AllocationCategory[] = ["RWA", "Yield", "Instant Liquidity"];
const LOAN_DATA = ALLOCATION_DATA.filter((d) => d.category === "Loan");

const PIE_DATA = Object.entries(
  ALLOCATION_DATA.filter((d) => d.category !== "Loan").reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.value;
    return acc;
  }, {} as Record<string, number>)
).map(([name, value]) => ({
  name,
  value,
  color: CATEGORY_COLORS[name as AllocationCategory],
}));

const MOCK_ACTIONS = [
  { time: "2h ago", type: "RWA Purchase", tx: "0x1a2b...3c4d" },
  { time: "6h ago", type: "Open GT Position", tx: "0x3c4d...5e6f" },
  { time: "1d ago", type: "Place Lending Order", tx: "0x5e6f...7890" },
  { time: "2d ago", type: "Replenish Buffer", tx: "0x7890...abcd" },
];

function formatUSD(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// --- Factsheet Section ---
function FactsheetSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="rounded-xl border border-border bg-card p-5 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display font-semibold text-foreground">Factsheet</h3>
      </div>
      <Table>
        <TableBody>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0 w-40">Strategy</TableCell>
            <TableCell className="text-foreground text-sm py-2.5 px-0">{VAULT_DATA.strategy}</TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Yield Type</TableCell>
            <TableCell className="text-foreground text-sm py-2.5 px-0">{VAULT_DATA.yieldType}</TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Redemption</TableCell>
            <TableCell className="text-foreground text-sm py-2.5 px-0">{VAULT_DATA.redemptionTimeline}</TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Management Fee</TableCell>
            <TableCell className="text-foreground text-sm font-mono py-2.5 px-0">{VAULT_DATA.managementFee}%</TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Performance Fee</TableCell>
            <TableCell className="text-foreground text-sm font-mono py-2.5 px-0">{VAULT_DATA.performanceFee}%</TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Custody</TableCell>
            <TableCell className="text-foreground text-sm py-2.5 px-0 flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-buffer-safe" />
              {VAULT_DATA.custody}
            </TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Auditor</TableCell>
            <TableCell className="text-foreground text-sm py-2.5 px-0">{VAULT_DATA.auditor}</TableCell>
          </TableRow>
          <TableRow className="border-border">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Inception</TableCell>
            <TableCell className="text-foreground text-sm font-mono py-2.5 px-0">{VAULT_DATA.inceptionDate}</TableCell>
          </TableRow>
          <TableRow className="border-0">
            <TableCell className="text-muted-foreground text-xs font-mono py-2.5 px-0">Contract</TableCell>
            <TableCell className="text-sm py-2.5 px-0">
              <span className="font-mono text-primary cursor-pointer hover:underline inline-flex items-center gap-1">
                {truncateAddress(VAULT_DATA.contractAddress)}
                <ExternalLink className="h-3 w-3" />
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </motion.div>
  );
}

// --- Redemption Capacity Donut ---
function RedemptionCapacity() {
  const bufferPct = VAULT_DATA.bufferRatio;
  const deployedPct = 100 - bufferPct;
  const data = [
    { name: "Cash Buffer", value: bufferPct },
    { name: "Deployed", value: deployedPct },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-display font-semibold text-foreground">Instant Redemption Capacity</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Cash buffer available for instant withdrawals. Withdrawals exceeding the buffer are queued and processed within 1–3 days.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={38} outerRadius={55} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                <Cell fill="hsl(160, 70%, 45%)" />
                <Cell fill="hsl(220, 15%, 18%)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-mono font-bold text-foreground">{bufferPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground font-mono mb-0.5">Available Instantly</div>
            <div className="text-lg font-mono font-semibold text-buffer-safe">{formatUSD(VAULT_DATA.bufferAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-mono mb-0.5">Total TVL</div>
            <div className="text-sm font-mono text-foreground">{formatUSD(VAULT_DATA.tvl)}</div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-buffer-safe transition-all" style={{ width: `${(VAULT_DATA.tvl / VAULT_DATA.capacity) * 100}%` }} />
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            Vault Utilization: {formatUSD(VAULT_DATA.tvl)} / {formatUSD(VAULT_DATA.capacity)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Rate Type Badge ---
function RateTypeBadge({ type }: { type: RateType }) {
  if (!type) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold font-mono uppercase tracking-wider",
      type === "fixed"
        ? "bg-primary/15 text-primary border border-primary/20"
        : "bg-accent/15 text-accent-foreground border border-accent/30"
    )}>
      {type}
    </span>
  );
}

// --- Portfolio — Combined Assets, Loans & NAV ---
function PortfolioSection() {
  const totalAssets = ALLOCATION_DATA.filter(d => d.category !== "Loan").reduce((s, i) => s + i.amount, 0);
  const totalLoans = LOAN_DATA.reduce((s, i) => s + i.amount, 0);
  const nav = totalAssets - totalLoans;
  const loanColor = CATEGORY_COLORS.Loan;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-display font-semibold text-foreground mb-5">Portfolio — Asset Allocation</h3>

      {/* NAV Summary Bar */}
      <div className="rounded-lg bg-secondary/50 border border-border p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Total Assets</div>
            <div className="text-lg font-mono font-bold text-foreground">{formatUSD(totalAssets)}</div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Outstanding Loans</div>
            <div className="text-lg font-mono font-bold" style={{ color: loanColor }}>− {formatUSD(totalLoans)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Net Asset Value</div>
            <div className="text-lg font-mono font-bold text-primary">{formatUSD(nav)}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-8">
        {/* Pie chart — assets only */}
        <div className="w-44 flex-shrink-0 self-center">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PIE_DATA} innerRadius={44} outerRadius={68} dataKey="value" strokeWidth={2} stroke="hsl(220, 18%, 10%)">
                  {PIE_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
            {PIE_DATA.map((entry, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                {entry.name} {entry.value}%
              </span>
            ))}
          </div>
        </div>

        {/* Asset + Loan breakdown */}
        <div className="flex-1 w-full space-y-5">
          {/* Asset categories */}
          {ASSET_CATEGORIES.map((cat) => {
            const items = ALLOCATION_DATA.filter((d) => d.category === cat);
            if (items.length === 0) return null;
            const meta = CATEGORY_META[cat];
            const catTotal = items.reduce((s, i) => s + i.value, 0);
            const catAmount = items.reduce((s, i) => s + i.amount, 0);
            const catColor = CATEGORY_COLORS[cat];

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: catColor }}>
                    <span className="w-3 h-3 rounded" style={{ background: catColor }} />
                    {meta.label}
                  </span>
                  <span className="text-xs font-mono font-semibold text-foreground">{catTotal}%
                    <span className="text-muted-foreground font-normal ml-1.5">{formatUSD(catAmount)}</span>
                  </span>
                </div>
                <div className="pl-5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground/70 font-mono">{item.protocol}</span>
                        <RateTypeBadge type={item.rateType} />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-foreground w-10 text-right">{item.value}%</span>
                        <span className="font-mono text-xs text-muted-foreground w-16 text-right">{formatUSD(item.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Loan section within same panel */}
          <div>
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: loanColor }}>
                <span className="w-3 h-3 rounded" style={{ background: loanColor }} />
                Loans (Liabilities)
              </span>
              <span className="text-xs font-mono font-semibold" style={{ color: loanColor }}>
                {formatUSD(totalLoans)}
              </span>
            </div>
            <div className="pl-5">
              {LOAN_DATA.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground/70 font-mono">{item.protocol}</span>
                    <RateTypeBadge type={item.rateType} />
                  </div>
                  <span className="font-mono text-sm text-foreground">{formatUSD(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- NAV Chart with integrated APY ---
function NAVChart() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const chartData = NAV_DATA_MAP[period];
  const currentAPY = APY_MAP[period];
  const latestNAV = chartData[chartData.length - 1]?.nav;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card p-5">
      {/* Header row: Title + APY + Period Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div>
          <h3 className="font-display font-semibold text-foreground">NAV Performance</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* APY Badge */}
          <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-3 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground font-mono">APY</span>
            <span className="text-sm font-mono font-bold text-primary">{currentAPY}%</span>
          </div>
          {/* Period toggle */}
          <div className="flex bg-secondary rounded-lg p-0.5">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs font-mono px-2.5 py-1 rounded-md transition-all ${p === period ? "bg-primary/20 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current NAV callout */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-mono font-bold text-foreground">${latestNAV?.toFixed(4)}</span>
        <span className="text-xs font-mono text-yield-positive">+{VAULT_DATA.navDelta24h}% (24h)</span>
      </div>

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
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} axisLine={false} tickLine={false} interval={period === "90d" ? 14 : period === "30d" ? 6 : 1} />
            <YAxis domain={["dataMin - 0.005", "dataMax + 0.005"]} tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(3)} />
            <RechartsTooltip
              contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 15%, 16%)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "hsl(215, 15%, 55%)" }}
              formatter={(value: number) => [`$${value.toFixed(4)}`, "NAV"]}
            />
            <Area type="monotone" dataKey="nav" stroke="hsl(187, 100%, 50%)" strokeWidth={2} fill="url(#navGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// --- Deposit Panel ---
function DepositPanel() {
  const [amount, setAmount] = useState("");
  const parsedAmount = parseFloat(amount) || 0;
  const estimatedShares = parsedAmount / VAULT_DATA.nav;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground font-mono mb-1.5 block">Deposit Amount (USDC)</label>
        <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="font-mono text-lg bg-secondary border-border" />
      </div>
      {parsedAmount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Estimated APY</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-primary font-mono">{VAULT_DATA.apy7d}% <Info className="h-2.5 w-2.5 inline text-muted-foreground" /></span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Historical 7d APY. Not guaranteed.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Vault Shares</span>
            <span className="text-foreground font-mono">{estimatedShares.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Remaining Capacity</span>
            <span className="text-foreground font-mono">{formatUSD(VAULT_DATA.capacity - VAULT_DATA.tvl)}</span>
          </div>
        </motion.div>
      )}
      <Button className="w-full" disabled={parsedAmount <= 0}>
        <ArrowDownToLine className="h-4 w-4" /> Deposit USDC
      </Button>
    </div>
  );
}

// --- Withdraw Panel ---
function WithdrawPanel() {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const parsedAmount = parseFloat(amount) || 0;
  const exceedsBuffer = parsedAmount > VAULT_DATA.bufferAmount;

  return (
    <div className="space-y-4">
      {step === 1 && (
        <>
          <div>
            <label className="text-xs text-muted-foreground font-mono mb-1.5 block">Withdraw Amount (USDC)</label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-lg bg-secondary border-border" />
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Instant Available</span>
              <span className="text-buffer-safe font-mono">{formatUSD(VAULT_DATA.bufferAmount)}</span>
            </div>
            <Gauge value={VAULT_DATA.bufferRatio} max={100} label="Cash Buffer" thresholds={{ warning: 70, danger: 90 }} />
          </div>
          {exceedsBuffer && parsedAmount > 0 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-buffer-warning/10 border border-buffer-warning/30 space-y-2">
              <p className="text-xs text-buffer-warning">
                ⚠ Requested amount exceeds the cash buffer. You can withdraw up to {formatUSD(VAULT_DATA.bufferAmount)} instantly.
              </p>
              <p className="text-xs text-muted-foreground">
                The remaining {formatUSD(parsedAmount - VAULT_DATA.bufferAmount)} will be queued and processed when the Curator replenishes the buffer.
              </p>
            </motion.div>
          )}
          <Button className="w-full" variant={exceedsBuffer ? "accent" : "default"} disabled={parsedAmount <= 0}
            onClick={() => exceedsBuffer ? setStep(2) : undefined}>
            <ArrowUpFromLine className="h-4 w-4" />
            {exceedsBuffer ? "Review Withdrawal" : "Withdraw USDC"}
          </Button>
          {exceedsBuffer && (
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
              Or redeem as FT tokens (advanced)
            </Button>
          )}
        </>
      )}
      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h4 className="font-display font-semibold text-foreground">Withdrawal Summary</h4>
          <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Instant withdrawal</span>
              <span className="text-buffer-safe font-mono font-semibold">{formatUSD(VAULT_DATA.bufferAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Queued amount</span>
              <span className="text-buffer-warning font-mono font-semibold">{formatUSD(parsedAmount - VAULT_DATA.bufferAmount)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground font-mono">{formatUSD(parsedAmount)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Queued withdrawals are processed in order. Estimated wait: 1–3 days depending on Curator operations.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button variant="accent" className="flex-1">Confirm</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function VaultDetailPage() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const [strategyExpanded, setStrategyExpanded] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary transition-colors mb-6 flex items-center gap-1">
        ← Back to Vaults
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Vault Info (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header with Share Price */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-foreground">{VAULT_DATA.name}</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded cursor-help">
                      Leveraged RWA
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    This vault uses RWA collateral with fixed-rate leverage. Principal is subject to market and smart contract risk.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="font-mono">{VAULT_DATA.curator}</span>
              <span className="text-border">•</span>
              <Clock className="h-4 w-4" />
              <span className="font-mono">Active since {VAULT_DATA.inceptionDate}</span>
            </div>
          </motion.div>

          {/* TVL Stat */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3">
            <StatCard label="TVL" value={formatUSD(VAULT_DATA.tvl)} />
            <StatCard label="Capacity" value={formatUSD(VAULT_DATA.capacity)} subValue={`${((VAULT_DATA.tvl / VAULT_DATA.capacity) * 100).toFixed(0)}% filled`} />
          </motion.div>

          {/* 1. NAV Chart (hero visual — includes APY toggle) */}
          <NAVChart />

          {/* 2. Portfolio — Asset Allocation */}
          <PortfolioSection />
          {/* 3. Redemption Capacity (visual) */}
          <RedemptionCapacity />

          {/* 4. Strategy (text, expandable) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">Strategy</h3>
              <button onClick={() => setStrategyExpanded(!strategyExpanded)}
                className="text-xs text-primary flex items-center gap-1 hover:underline">
                {strategyExpanded ? "Less" : "Details"}
                {strategyExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{VAULT_DATA.strategy}</p>
            <AnimatePresence>
              {strategyExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed">{VAULT_DATA.strategyDetail}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 5. Factsheet (structured details) */}
          <FactsheetSection />

          {/* 6. On-chain Activity Log */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">On-chain Activity Log</h3>
            <div className="space-y-3">
              {MOCK_ACTIONS.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{a.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span>{a.time}</span>
                    <span className="text-primary/70">{a.tx}</span>
                    <ExternalLink className="h-3 w-3 cursor-pointer hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: Deposit/Withdraw Panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 sticky top-6">
            <Tabs defaultValue="deposit">
              <TabsList className="w-full bg-secondary mb-4">
                <TabsTrigger value="deposit" className="flex-1 font-mono text-xs">
                  <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" /> Deposit
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="flex-1 font-mono text-xs">
                  <ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" /> Withdraw
                </TabsTrigger>
              </TabsList>
              <TabsContent value="deposit"><DepositPanel /></TabsContent>
              <TabsContent value="withdraw"><WithdrawPanel /></TabsContent>
            </Tabs>
          </div>

          {/* My Position */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-display font-semibold text-foreground text-sm">My Position</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposited</span>
                <span className="font-mono text-foreground">$10,000.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Value</span>
                <span className="font-mono text-foreground">$10,342.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Realized Yield</span>
                <span className="font-mono text-yield-positive">+$342.00</span>
              </div>
            </div>
          </div>

          {/* Contract Info */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-display font-semibold text-foreground text-sm">Contracts</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Vault</span>
                <span className="font-mono text-primary flex items-center gap-1 cursor-pointer hover:underline">
                  {truncateAddress(VAULT_DATA.contractAddress)} <ExternalLink className="h-3 w-3" />
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Strategy</span>
                <span className="font-mono text-primary flex items-center gap-1 cursor-pointer hover:underline">
                  {truncateAddress(VAULT_DATA.strategyContract)} <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
              <Shield className="h-3 w-3 text-buffer-safe" /> Audited by {VAULT_DATA.auditor}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
