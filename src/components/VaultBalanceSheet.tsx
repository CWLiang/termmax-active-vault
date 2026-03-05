import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Shield, Clock,
  Landmark, Wallet, BarChart3, Users, Award, AlertTriangle,
  Banknote, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface RWAPosition {
  token: string;
  managedBy: string;
  platform: string;
  assetType: "equity_fund" | "private_credit";
  costBasis: number;
  currentValue: number;
  yieldRate: number;
}

interface BorrowPosition {
  id: string;
  collateralToken: string;
  collateralValue: number;
  borrowedUSDC: number;
  fixedRate: number;
  maturityDate: string;
  currentLTV: number;
}

interface FeeStructure {
  managementFeeRate: number;
  performanceFeeRate: number;
  highWaterMark: number;
  accruedManagementFee: number;
  accruedPerformanceFee: number;
}

interface ShareAccounting {
  totalSharesOutstanding: number;
  lpInvestedCapital: number;
  accumulatedEarnings: number;
  navPerShare: number;
}

interface VaultBalanceSheetProps {
  cash: number;
  rwaPositions: RWAPosition[];
  borrowPositions: BorrowPosition[];
  fees: FeeStructure;
  shares: ShareAccounting;
  daysSinceInception?: number;
}

/* ─── Helpers ─── */
function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v).toLocaleString()}`;
  return `$${Math.round(v).toLocaleString()}`;
}

function fmtFull(v: number) {
  return `$${Math.round(v).toLocaleString()}`;
}

function fmtSigned(v: number) {
  const prefix = v >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(Math.round(v)).toLocaleString()}`;
}

function pct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

function pctShort(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function pctSigned(v: number) {
  const prefix = v >= 0 ? "+" : "";
  return `${prefix}${(v * 100).toFixed(2)}%`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ltvColor(ltv: number) {
  if (ltv > 0.80) return "bg-destructive text-destructive-foreground";
  if (ltv > 0.70) return "bg-buffer-warning text-accent-foreground";
  return "bg-yield-positive/20 text-yield-positive";
}

function assetTypeBadge(t: "equity_fund" | "private_credit") {
  if (t === "equity_fund") return { label: "Equity Fund", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
  return { label: "Private Credit", cls: "bg-teal-500/20 text-teal-400 border-teal-500/30" };
}

/* ─── Component ─── */
export function VaultBalanceSheet({
  cash, rwaPositions, borrowPositions, fees, shares, daysSinceInception = 64,
}: VaultBalanceSheetProps) {
  const totalRWA = rwaPositions.reduce((s, r) => s + r.currentValue, 0);
  const totalAssets = cash + totalRWA;

  const totalBorrows = borrowPositions.reduce((s, b) => s + b.borrowedUSDC, 0);
  const totalAccruedFees = fees.accruedManagementFee + fees.accruedPerformanceFee;
  const totalLiabilities = totalBorrows + totalAccruedFees;

  const nav = totalAssets - totalLiabilities;
  const navPerShare = shares.totalSharesOutstanding > 0 ? nav / shares.totalSharesOutstanding : 0;
  const leverageRatio = nav > 0 ? totalAssets / nav : 0;
  const sinceInception = navPerShare > 0 ? (navPerShare - 1) : 0;

  const dailyYield = rwaPositions.reduce((s, r) => s + (r.currentValue * r.yieldRate) / 365, 0);
  const dailyCost = borrowPositions.reduce((s, b) => s + (b.borrowedUSDC * b.fixedRate) / 365, 0);
  const netSpread = dailyYield - dailyCost;
  const dailyMgmtFee = (totalAssets * fees.managementFeeRate) / 365;

  const annualMgmtFee = totalAssets * fees.managementFeeRate;
  const estNetAPY = nav > 0 ? ((netSpread * 365) - annualMgmtFee) / nav : 0;

  const grossEarnings = shares.accumulatedEarnings;

  return (
    <div className="space-y-4">
      {/* ── TOP BAR: Summary Strip ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-border bg-card px-6 py-4"
      >
        {[
          { label: "Total Assets", value: fmt(totalAssets), accent: false },
          { label: "NAV", value: fmt(nav), accent: true },
          { label: "Leverage", value: `${leverageRatio.toFixed(2)}x`, accent: false },
          { label: "NAV/Share", value: `$${navPerShare.toFixed(4)}`, accent: false },
          { label: "Since Inception", value: pctSigned(sinceInception), accent: false, isPositive: sinceInception >= 0 },
          { label: "Est. Net APY", value: pctShort(estNetAPY), accent: true },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{item.label}</span>
            <span className={cn(
              "text-xl font-display font-bold",
              item.accent ? "text-primary" :
              'isPositive' in item ? (item.isPositive ? "text-yield-positive" : "text-yield-negative") :
              "text-foreground"
            )}>{item.value}</span>
          </div>
        ))}
      </motion.div>

      {/* ── T-ACCOUNT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-xl border border-border overflow-hidden">
        {/* ── LEFT: Assets ── */}
        <div className="bg-card border-b lg:border-b-0 lg:border-r-2 border-border flex flex-col" style={{ background: "linear-gradient(180deg, hsl(210 25% 9%), hsl(220 18% 8%))" }}>
          <div className="px-5 py-3 border-b border-border bg-primary/5 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Assets</span>
          </div>

          {/* Cash */}
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-buffer-safe" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Cash</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-mono text-foreground">USDC Buffer</span>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">Instant Liquidity (~5% TVL)</div>
              </div>
              <span className="font-mono text-foreground font-semibold">{fmtFull(cash)}</span>
            </div>
          </div>

          {/* RWA Positions */}
          <div className="px-5 py-4 border-b border-border/50 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">RWA Positions</span>
            </div>
            {rwaPositions.map((r, i) => {
              const badge = assetTypeBadge(r.assetType);
              const dailyY = (r.currentValue * r.yieldRate) / 365;
              const unrealizedPnL = r.currentValue - r.costBasis;
              return (
                <div key={i} className="py-3 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-foreground font-semibold text-sm">{r.token}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-mono", badge.cls)}>{badge.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-mono">{r.platform}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mb-2">
                    Managed by <span className="text-foreground">{r.managedBy}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Cost Basis</span>
                      <span className="font-mono text-muted-foreground">{fmtFull(r.costBasis)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-mono">Current Value</span>
                      <span className="font-mono text-foreground font-semibold">{fmtFull(r.currentValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Unrealized P&L</span>
                      <span className={cn("font-mono font-semibold", unrealizedPnL >= 0 ? "text-yield-positive" : "text-yield-negative")}>
                        {fmtSigned(unrealizedPnL)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground font-mono">Est. Annual Yield</span>
                      <span className="font-mono text-primary">{pctShort(r.yieldRate)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Est. Daily Yield</span>
                      <span className="font-mono text-yield-positive">{fmtFull(dailyY)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between pt-2 text-xs text-muted-foreground font-mono">
              <span>RWA Subtotal</span>
              <span>{fmtFull(totalRWA)}</span>
            </div>
          </div>

          {/* Total Assets */}
          <div className="px-5 py-3 mt-auto bg-primary/5 border-t border-primary/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">TOTAL ASSETS</span>
              <span className="font-mono text-primary text-lg">{fmtFull(totalAssets)}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Liabilities + Equity ── */}
        <div className="bg-card flex flex-col">
          <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <span className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Liabilities & Equity</span>
          </div>

          {/* Borrow Positions */}
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Borrow Positions</span>
            </div>

            {borrowPositions.map((b) => (
              <div key={b.id} className="py-3 border-b border-border/20 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground font-semibold text-sm">{b.id}</span>
                    <span className="text-xs text-muted-foreground font-mono">collateral: {b.collateralToken}</span>
                    <span className="text-xs font-mono text-muted-foreground">{fmtFull(b.collateralValue)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-mono">Borrowed</span>
                    <span className="font-mono text-foreground font-semibold">{fmtFull(b.borrowedUSDC)} USDC</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-mono flex items-center gap-1">
                      Fixed Rate: <span className="text-primary">{pct(b.fixedRate)}</span>
                      <Lock className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-muted-foreground/50 text-[10px]">locked</span>
                    </span>
                    <span className="font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{formatDate(b.maturityDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-muted-foreground font-mono">LTV</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold", ltvColor(b.currentLTV))}>
                      {pctShort(b.currentLTV)}
                      {b.currentLTV > 0.70 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-2 text-xs text-muted-foreground font-mono">
              <span>GT Borrows Subtotal</span>
              <span>{fmtFull(totalBorrows)}</span>
            </div>
          </div>

          {/* Accrued Fees */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Accrued Fees</span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <div>
                <span className="font-mono text-muted-foreground">Management Fee <span className="text-[10px] opacity-60">→ Platform</span></span>
                <div className="text-[10px] text-muted-foreground/50 font-mono flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />{daysSinceInception} days accrued, unpaid
                </div>
              </div>
              <span className="font-mono text-foreground">{fmtFull(fees.accruedManagementFee)}</span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <div>
                <span className="font-mono text-muted-foreground">Performance Fee <span className="text-[10px] opacity-60">→ Curator</span></span>
                <div className="text-[10px] text-muted-foreground/50 font-mono flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />{daysSinceInception} days accrued, unpaid
                </div>
              </div>
              <span className="font-mono text-foreground">{fmtFull(fees.accruedPerformanceFee)}</span>
            </div>
          </div>

          {/* Total Liabilities */}
          <div className="px-5 py-2 border-b border-border bg-secondary/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">TOTAL LIABILITIES</span>
              <span className="font-mono text-foreground">{fmtFull(totalLiabilities)}</span>
            </div>
          </div>

          {/* Equity */}
          <div className="px-5 py-4 border-b border-border/50 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Equity</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-mono text-muted-foreground">LP Invested Capital</span>
                <span className="font-mono text-foreground">{fmtFull(shares.lpInvestedCapital)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-mono text-muted-foreground">Accumulated Gross Earnings</span>
                <span className={cn("font-mono", grossEarnings >= 0 ? "text-yield-positive" : "text-yield-negative")}>
                  {fmtSigned(grossEarnings)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-mono text-muted-foreground">— Accrued Fees</span>
                <span className="font-mono text-yield-negative">
                  -{fmtFull(totalAccruedFees)}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-bold text-foreground text-sm">NAV</span>
                <span className="font-mono text-primary text-xl font-bold">{fmtFull(nav)}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-mono text-muted-foreground">NAV per Share</span>
                <span className="font-mono text-foreground">${navPerShare.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-mono text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" />High Water Mark</span>
                <span className="font-mono text-foreground">${fees.highWaterMark.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-mono text-muted-foreground">Since Inception</span>
                <span className={cn("font-mono font-semibold", sinceInception >= 0 ? "text-yield-positive" : "text-yield-negative")}>
                  {pctSigned(sinceInception)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-mono text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Shares Outstanding</span>
                <span className="font-mono text-foreground">{shares.totalSharesOutstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Balance check */}
          <div className="px-5 py-3 mt-auto bg-accent/5 border-t border-accent/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">TOTAL LIABILITIES + EQUITY</span>
              <span className="font-mono text-accent text-lg">{fmtFull(totalAssets)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR: Yield + Fee Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-border">
          <div className="p-4 text-center">
            <div className="text-xs text-muted-foreground font-mono mb-1">Daily Yield</div>
            <div className="text-lg font-display font-bold text-yield-positive">{fmtFull(dailyYield)}</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-xs text-muted-foreground font-mono mb-1">Daily Cost</div>
            <div className="text-lg font-display font-bold text-destructive">{fmtFull(dailyCost)}</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-xs text-muted-foreground font-mono mb-1">Net Daily Spread</div>
            <div className={cn("text-lg font-display font-bold", netSpread >= 0 ? "text-yield-positive" : "text-yield-negative")}>
              {fmtFull(netSpread)}/day
            </div>
          </div>
          <div className="p-4 text-center glow-primary">
            <div className="text-xs text-muted-foreground font-mono mb-1">Est. Net APY</div>
            <div className="text-lg font-display font-bold text-gradient-primary">{pctShort(estNetAPY)}</div>
          </div>
        </div>
        <div className="px-5 py-2.5 border-t border-border/50 flex flex-wrap gap-x-8 gap-y-1.5 justify-center">
          <span className="text-[11px] font-mono text-muted-foreground">
            Management: {pctShort(fees.managementFeeRate)}/yr of AUM → {fmtFull(dailyMgmtFee)}/day accruing
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            Performance: {pctShort(fees.performanceFeeRate)} of profits above HWM → accruing
          </span>
        </div>
      </motion.div>
    </div>
  );
}
