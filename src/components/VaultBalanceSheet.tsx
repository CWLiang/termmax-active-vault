import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Activity, Shield, Clock,
  Landmark, Wallet, BarChart3, Users, Award, AlertTriangle,
  Banknote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface RWAPosition {
  token: string;
  managedBy: string;
  platform: string;
  assetType: "equity_fund" | "private_credit";
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
  navPerShare: number;
}

interface VaultBalanceSheetProps {
  cash: number;
  rwaPositions: RWAPosition[];
  borrowPositions: BorrowPosition[];
  fees: FeeStructure;
  shares: ShareAccounting;
}

/* ─── Helpers ─── */
function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v).toLocaleString()}`;
  return `$${Math.round(v).toLocaleString()}`;
}

function fmtFull(v: number) {
  return `$${Math.round(v).toLocaleString()}`;
}

function pct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

function pctShort(v: number) {
  return `${(v * 100).toFixed(1)}%`;
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
  cash, rwaPositions, borrowPositions, fees, shares,
}: VaultBalanceSheetProps) {
  const totalRWA = rwaPositions.reduce((s, r) => s + r.currentValue, 0);
  const totalAssets = cash + totalRWA;

  const totalBorrows = borrowPositions.reduce((s, b) => s + b.borrowedUSDC, 0);
  const totalLiabilities = totalBorrows + fees.accruedManagementFee + fees.accruedPerformanceFee;

  const nav = totalAssets - totalLiabilities;
  const navPerShare = shares.totalSharesOutstanding > 0 ? nav / shares.totalSharesOutstanding : 0;
  const leverageRatio = nav > 0 ? totalAssets / nav : 0;

  const dailyYield = rwaPositions.reduce((s, r) => s + (r.currentValue * r.yieldRate) / 365, 0);
  const dailyCost = borrowPositions.reduce((s, b) => s + (b.borrowedUSDC * b.fixedRate) / 365, 0);
  const netSpread = dailyYield - dailyCost;

  const annualMgmtFee = totalAssets * fees.managementFeeRate;
  const estNetAPY = nav > 0 ? ((netSpread * 365) - annualMgmtFee) / nav : 0;

  const accumulatedEarnings = nav - shares.lpInvestedCapital;

  return (
    <div className="space-y-4">
      {/* ── TOP BAR: Summary Strip ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-5 py-3"
      >
        {[
          { label: "TVL", value: fmt(totalAssets), accent: false },
          { label: "NAV", value: fmt(nav), accent: true },
          { label: "Leverage", value: `${leverageRatio.toFixed(2)}x`, accent: false },
          { label: "NAV/Share", value: `$${navPerShare.toFixed(4)}`, accent: false },
          { label: "Est. Net APY", value: pctShort(estNetAPY), accent: true },
        ].map((item) => (
          <div key={item.label} className="flex items-baseline gap-2">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{item.label}</span>
            <span className={cn(
              "text-sm font-display font-bold",
              item.accent ? "text-primary" : "text-foreground"
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
            <span className="font-display font-semibold text-sm text-foreground">Assets</span>
            <span className="ml-auto font-mono text-sm text-primary font-bold">{fmt(totalAssets)}</span>
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
                <div className="text-xs text-muted-foreground font-mono mt-0.5">Instant Liquidity</div>
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
              return (
                <div key={i} className="py-3 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-foreground font-semibold text-sm">{r.token}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-mono", badge.cls)}>{badge.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-mono">{r.platform}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mb-2">
                    Managed by <span className="text-foreground">{r.managedBy}</span> via <span className="text-foreground">{r.platform}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-mono">Current Value</span>
                      <span className="font-mono text-foreground font-semibold">{fmtFull(r.currentValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
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
            <span className="font-display font-semibold text-sm text-foreground">Liabilities & Equity</span>
            <span className="ml-auto font-mono text-sm text-accent font-bold">{fmt(totalAssets)}</span>
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
                    <span className="text-muted-foreground font-mono">Fixed Rate: <span className="text-primary">{pct(b.fixedRate)}</span></span>
                    <span className="font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{formatDate(b.maturityDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-muted-foreground font-mono">LTV</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold", ltvColor(b.currentLTV))}>
                      {pctShort(b.currentLTV)}
                      {b.currentLTV > 0.80 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                      {b.currentLTV > 0.70 && b.currentLTV <= 0.80 && <AlertTriangle className="h-3 w-3 inline ml-1" />}
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
              <span className="font-mono text-muted-foreground">Management Fee <span className="text-[10px] opacity-60">→ platform</span></span>
              <span className="font-mono text-foreground">{fmtFull(fees.accruedManagementFee)}</span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="font-mono text-muted-foreground">Performance Fee <span className="text-[10px] opacity-60">→ curator</span></span>
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
                <span className="font-mono text-muted-foreground">Accumulated Earnings</span>
                <span className={cn("font-mono", accumulatedEarnings >= 0 ? "text-yield-positive" : "text-yield-negative")}>
                  {fmtFull(accumulatedEarnings)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-mono text-muted-foreground">— Accrued Fees</span>
                <span className="font-mono text-muted-foreground">
                  {fmtFull(fees.accruedManagementFee + fees.accruedPerformanceFee)}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-bold text-foreground text-sm">NAV (Mark-to-Market)</span>
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
                <span className="font-mono text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Shares Outstanding</span>
                <span className="font-mono text-foreground">{shares.totalSharesOutstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Balance check */}
          <div className="px-5 py-3 mt-auto bg-accent/5 border-t border-accent/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">LIABILITIES + EQUITY</span>
              <span className="font-mono text-accent text-lg">{fmtFull(totalAssets)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR: Yield Summary ── */}
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
              {fmtFull(netSpread)}
            </div>
          </div>
          <div className="p-4 text-center glow-primary">
            <div className="text-xs text-muted-foreground font-mono mb-1">Est. Net APY</div>
            <div className="text-lg font-display font-bold text-gradient-primary">{pctShort(estNetAPY)}</div>
          </div>
        </div>
        <div className="px-5 py-2 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-1 justify-center">
          <span className="text-[11px] font-mono text-muted-foreground">Mgmt Fee Rate {pctShort(fees.managementFeeRate)}/yr</span>
          <span className="text-[11px] font-mono text-muted-foreground">Perf Fee Rate {pctShort(fees.performanceFeeRate)} above HWM</span>
        </div>
      </motion.div>
    </div>
  );
}
