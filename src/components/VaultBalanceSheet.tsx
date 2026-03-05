import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, TrendingUp, Shield, Clock,
  Landmark, Wallet, BarChart3, Users, Award, AlertTriangle,
  Banknote, Lock, Timer, CheckCircle2, Waves, ChevronDown, ChevronRight,
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

interface FRTPosition {
  protocol: string;
  token: string;
  assetType: "fixed_rate_token";
  faceValue: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  maturityDate: string;
  impliedYield: number;
}

interface LendingPosition {
  protocol: string;
  asset: string;
  receiptToken: string;
  principal: number;
  currentValue: number;
  apy: number;
  rateType: "floating" | "fixed";
  depositDate: string;
  withdrawable: boolean;
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
  frtPositions: FRTPosition[];
  lendingPositions: LendingPosition[];
  borrowPositions: BorrowPosition[];
  fees: FeeStructure;
  shares: ShareAccounting;
  daysSinceInception?: number;
  today?: string;
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

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
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

function protocolBadge(p: string) {
  if (p === "TermMax") return "bg-primary/15 text-primary border-primary/30";
  if (p === "Pendle") return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
  if (p === "Aave") return "bg-violet-500/20 text-violet-400 border-violet-500/30";
  if (p === "Morpho") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  return "bg-secondary text-muted-foreground border-border";
}

function computeAmortizedValue(frt: FRTPosition, today: string) {
  const totalDays = daysBetween(frt.purchaseDate, frt.maturityDate);
  const elapsed = Math.max(0, daysBetween(frt.purchaseDate, today));
  if (totalDays <= 0) return frt.purchasePrice;
  return frt.purchasePrice + (frt.faceValue - frt.purchasePrice) * (elapsed / totalDays);
}

/* ─── Collapsible Section ─── */
function CollapsibleSection({
  icon,
  title,
  subtotal,
  defaultOpen = false,
  summaryItems,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtotal: string;
  defaultOpen?: boolean;
  summaryItems?: { name: string; value: string }[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          {open ? <ChevronDown className="h-3 w-3 text-muted-foreground/50" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
        </div>
        <span className="font-mono text-foreground font-semibold text-sm">{subtotal}</span>
      </button>
      {/* Collapsed summary: show each item name + value */}
      {!open && summaryItems && summaryItems.length > 0 && (
        <div className="px-5 pb-2.5 -mt-1 space-y-0.5">
          {summaryItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">{item.name}</span>
              <span className="font-mono text-muted-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Component ─── */
export function VaultBalanceSheet({
  cash, rwaPositions, frtPositions, lendingPositions, borrowPositions, fees, shares, daysSinceInception = 64, today = "2025-03-05",
}: VaultBalanceSheetProps) {
  const totalRWA = rwaPositions.reduce((s, r) => s + r.currentValue, 0);
  const frtAmortized = frtPositions.map(f => ({ ...f, amortizedValue: computeAmortizedValue(f, today) }));
  const totalFRT_AC = frtAmortized.reduce((s, f) => s + f.amortizedValue, 0);
  const totalFRT_MTM = frtPositions.reduce((s, f) => s + f.currentPrice, 0);
  const totalLending = lendingPositions.reduce((s, l) => s + l.currentValue, 0);
  const totalAssets_AC = cash + totalRWA + totalFRT_AC + totalLending;
  const totalAssets_MTM = cash + totalRWA + totalFRT_MTM + totalLending;

  const totalBorrows = borrowPositions.reduce((s, b) => s + b.borrowedUSDC, 0);
  const totalAccruedFees = fees.accruedManagementFee + fees.accruedPerformanceFee;
  const totalLiabilities = totalBorrows + totalAccruedFees;

  const nav_AC = totalAssets_AC - totalLiabilities;
  const nav_MTM = totalAssets_MTM - totalLiabilities;
  const navPerShare = shares.totalSharesOutstanding > 0 ? nav_AC / shares.totalSharesOutstanding : 0;
  const leverageRatio = nav_AC > 0 ? totalAssets_AC / nav_AC : 0;
  const sinceInception = navPerShare > 0 ? (navPerShare - 1) : 0;

  const dailyYield_RWA = rwaPositions.reduce((s, r) => s + (r.currentValue * r.yieldRate) / 365, 0);
  const dailyYield_FRT = frtAmortized.reduce((s, f) => {
    const totalDays = daysBetween(f.purchaseDate, f.maturityDate);
    return s + (totalDays > 0 ? (f.faceValue - f.purchasePrice) / totalDays : 0);
  }, 0);
  const dailyYield_Lending = lendingPositions.reduce((s, l) => s + (l.currentValue * l.apy) / 365, 0);
  const dailyYield = dailyYield_RWA + dailyYield_FRT + dailyYield_Lending;
  const dailyCost = borrowPositions.reduce((s, b) => s + (b.borrowedUSDC * b.fixedRate) / 365, 0);
  const netSpread = dailyYield - dailyCost;
  const dailyMgmtFee = (totalAssets_AC * fees.managementFeeRate) / 365;

  const estNetAPY = nav_AC > 0 ? ((netSpread * 365) - (totalAssets_AC * fees.managementFeeRate)) / nav_AC : 0;

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
          { label: "Total Assets", value: fmt(totalAssets_AC), accent: false },
          { label: "NAV", value: fmt(nav_AC), accent: true },
          { label: "Leverage", value: `${leverageRatio.toFixed(2)}x`, accent: false },
          { label: "NAV/Share", value: `$${navPerShare.toFixed(4)}`, accent: false },
          { label: "Since Inception", value: pctSigned(sinceInception), accent: false, isPositive: sinceInception >= 0 },
          { label: "Est. Net APY", value: `~${pctShort(estNetAPY)}`, accent: true },
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

          {/* ★ TOTAL ASSETS — at the TOP */}
          <div className="px-5 py-3 bg-primary/5 border-b border-primary/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">TOTAL ASSETS (AC)</span>
              <span className="font-mono text-primary text-lg">{fmtFull(totalAssets_AC)}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span className="font-mono text-muted-foreground/60">TOTAL ASSETS (MTM)</span>
              <span className="font-mono text-muted-foreground/60">{fmtFull(totalAssets_MTM)}</span>
            </div>
          </div>

          {/* [1] Cash — always visible, no collapse needed */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-buffer-safe" />
                <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Cash</span>
                <span className="text-[10px] text-muted-foreground/50 font-mono">USDC Buffer</span>
              </div>
              <span className="font-mono text-foreground font-semibold text-sm">{fmtFull(cash)}</span>
            </div>
          </div>

          {/* [2] Lending Positions — collapsible */}
          {lendingPositions.length > 0 && (
            <CollapsibleSection
              icon={<Waves className="h-3.5 w-3.5 text-violet-400" />}
              title="Yield-Bearing Liquidity"
              subtotal={fmtFull(totalLending)}
              summaryItems={lendingPositions.map(l => ({ name: `${l.protocol} ${l.receiptToken}`, value: fmtFull(l.currentValue) }))}
            >
              <div className="text-[10px] text-muted-foreground/60 font-mono mb-2">Withdrawable on demand · floating rate</div>
              {lendingPositions.map((l, i) => {
                const dailyY = (l.currentValue * l.apy) / 365;
                return (
                  <div key={i} className="py-3 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-mono", protocolBadge(l.protocol))}>{l.protocol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-mono">{l.asset}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-400 font-mono">
                        ~{l.rateType}
                      </span>
                    </div>
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-mono">Receipt Token</span>
                        <span className="font-mono text-muted-foreground">{l.receiptToken}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-mono">Principal</span>
                        <span className="font-mono text-muted-foreground">{fmtFull(l.principal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-mono">Current Value</span>
                        <span className="font-mono text-foreground font-semibold">{fmtFull(l.currentValue)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-mono">APY</span>
                        <span className="font-mono text-primary">~{pctShort(l.apy)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-mono">Daily Yield</span>
                        <span className="font-mono text-yield-positive">{fmtFull(dailyY)}/day</span>
                      </div>
                      {l.withdrawable && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-[10px] font-mono text-emerald-400">Withdrawable</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CollapsibleSection>
          )}

          {/* [3] RWA Positions — collapsible */}
          <CollapsibleSection
            icon={<Landmark className="h-3.5 w-3.5 text-accent" />}
            title="RWA Positions"
            subtotal={fmtFull(totalRWA)}
            summaryItems={rwaPositions.map(r => ({ name: r.token, value: fmtFull(r.currentValue) }))}
          >
            {rwaPositions.map((r, i) => {
              const badge = assetTypeBadge(r.assetType);
              const dailyY = (r.currentValue * r.yieldRate) / 365;
              const unrealizedPnL = r.currentValue - r.costBasis;
              return (
                <div key={i} className="py-3 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-foreground font-semibold text-sm">{r.token}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-mono", badge.cls)}>{badge.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-muted-foreground/30 bg-secondary text-muted-foreground font-mono">{r.platform}</span>
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
                      <span className="font-mono text-yield-positive">{fmtFull(dailyY)}/day</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CollapsibleSection>

          {/* [4] Fixed Rate Token Positions — collapsible */}
          <CollapsibleSection
            icon={<Timer className="h-3.5 w-3.5 text-amber-400" />}
            title="Fixed Rate Tokens"
            subtotal={fmtFull(totalFRT_AC)}
            summaryItems={frtAmortized.map(f => ({ name: f.token, value: fmtFull(f.amortizedValue) }))}
          >
            {frtAmortized.map((f, i) => {
              const totalDays = daysBetween(f.purchaseDate, f.maturityDate);
              const elapsed = Math.max(0, daysBetween(f.purchaseDate, today));
              const progress = totalDays > 0 ? (elapsed / totalDays) * 100 : 0;
              const dailyAccrual = totalDays > 0 ? (f.faceValue - f.purchasePrice) / totalDays : 0;
              return (
                <div key={i} className="py-3 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-mono", protocolBadge(f.protocol))}>{f.protocol}</span>
                    <span className="font-mono text-foreground font-semibold text-sm">{f.token}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-400 font-mono">Fixed Rate</span>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Face Value</span>
                      <span className="font-mono text-muted-foreground">{fmtFull(f.faceValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Purchase Price</span>
                      <span className="font-mono text-muted-foreground">{fmtFull(f.purchasePrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-mono">Amortized Value</span>
                      <span className="font-mono text-foreground font-semibold">{fmtFull(f.amortizedValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Market Value</span>
                      <span className="font-mono text-muted-foreground/60">{fmtFull(f.currentPrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground font-mono flex items-center gap-1">
                        Implied Yield <Lock className="h-3 w-3 text-muted-foreground/50" /> <span className="text-[10px] text-muted-foreground/50">locked yield</span>
                      </span>
                      <span className="font-mono text-primary">{pctShort(f.impliedYield)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Daily Accrual</span>
                      <span className="font-mono text-yield-positive">{fmtFull(dailyAccrual)}/day</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Maturity</span>
                      <span className="font-mono text-muted-foreground">{formatDate(f.maturityDate)}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5">
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400/60 transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 text-right">
                        {elapsed} / {totalDays} days
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CollapsibleSection>

          {/* Spacer to push content */}
          <div className="flex-1" />
        </div>

        {/* ── RIGHT: Liabilities + Equity ── */}
        <div className="bg-card flex flex-col">
          <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <span className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Liabilities & Equity</span>
          </div>

          {/* ★ TOTAL LIABILITIES + EQUITY — at the TOP */}
          <div className="px-5 py-3 bg-accent/5 border-b border-accent/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">TOTAL L + E</span>
              <span className="font-mono text-accent text-lg">{fmtFull(totalAssets_AC)}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="font-mono text-muted-foreground/70">Liabilities</span>
              <span className="font-mono text-muted-foreground">{fmtFull(totalLiabilities)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground/70">Equity (NAV)</span>
              <span className="font-mono text-primary">{fmtFull(nav_AC)}</span>
            </div>
          </div>

          {/* Borrow Positions — collapsible */}
          <CollapsibleSection
            icon={<Shield className="h-3.5 w-3.5 text-destructive" />}
            title="Borrow Positions"
            subtotal={fmtFull(totalBorrows)}
            summaryItems={borrowPositions.map(b => ({ name: `${b.id} (${b.collateralToken})`, value: fmtFull(b.borrowedUSDC) }))}
          >
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
          </CollapsibleSection>

          {/* Accrued Fees — collapsible */}
          <CollapsibleSection
            icon={<Banknote className="h-3.5 w-3.5 text-accent" />}
            title="Accrued Fees"
            subtotal={fmtFull(totalAccruedFees)}
            summaryItems={[
              { name: "Management Fee", value: fmtFull(fees.accruedManagementFee) },
              { name: "Performance Fee", value: fmtFull(fees.accruedPerformanceFee) },
            ]}
          >
            <div className="flex items-center justify-between py-1 text-sm">
              <div>
                <span className="font-mono text-muted-foreground">Management Fee <span className="text-[10px] opacity-60">→ Platform</span></span>
                <div className="text-[10px] text-muted-foreground/50 font-mono flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />{daysSinceInception} days accrued · unpaid
                </div>
              </div>
              <span className="font-mono text-foreground">{fmtFull(fees.accruedManagementFee)}</span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <div>
                <span className="font-mono text-muted-foreground">Performance Fee <span className="text-[10px] opacity-60">→ Curator</span></span>
                <div className="text-[10px] text-muted-foreground/50 font-mono flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />{daysSinceInception} days accrued · unpaid
                </div>
              </div>
              <span className="font-mono text-foreground">{fmtFull(fees.accruedPerformanceFee)}</span>
            </div>
          </CollapsibleSection>

          {/* Total Liabilities line */}
          <div className="px-5 py-2 border-b border-border bg-secondary/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">TOTAL LIABILITIES</span>
              <span className="font-mono text-foreground">{fmtFull(totalLiabilities)}</span>
            </div>
          </div>

          {/* Equity — collapsible */}
          <CollapsibleSection
            icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
            title="Equity"
            subtotal={fmtFull(nav_AC)}
            defaultOpen
            summaryItems={[
              { name: "NAV per Share", value: `$${navPerShare.toFixed(4)}` },
              { name: "Since Inception", value: pctSigned(sinceInception) },
            ]}
          >
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
                <span className="font-display font-bold text-foreground text-sm">NAV (Amortized Cost)</span>
                <span className="font-mono text-primary text-xl font-bold">{fmtFull(nav_AC)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-muted-foreground/60 text-xs">NAV (Mark-to-Market)</span>
                <span className="font-mono text-muted-foreground/60 text-xs">{fmtFull(nav_MTM)}</span>
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
          </CollapsibleSection>

          {/* Spacer */}
          <div className="flex-1" />
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
            <div className="text-xs text-muted-foreground font-mono mb-1">Daily Yield (AC)</div>
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
            <div className="text-lg font-display font-bold text-gradient-primary">~{pctShort(estNetAPY)}</div>
          </div>
        </div>
        {/* Yield breakdown */}
        <div className="px-5 py-2.5 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-1.5 justify-center">
          {rwaPositions.map(r => (
            <span key={r.token} className="text-[11px] font-mono text-muted-foreground">
              {r.token} {fmtFull((r.currentValue * r.yieldRate) / 365)}/day
            </span>
          ))}
          {frtAmortized.map(f => {
            const totalDays = daysBetween(f.purchaseDate, f.maturityDate);
            const daily = totalDays > 0 ? (f.faceValue - f.purchasePrice) / totalDays : 0;
            return (
              <span key={f.token} className="text-[11px] font-mono text-muted-foreground">
                {f.token} {fmtFull(daily)}/day
              </span>
            );
          })}
          {lendingPositions.map(l => (
            <span key={l.receiptToken} className="text-[11px] font-mono text-muted-foreground">
              {l.protocol} {fmtFull((l.currentValue * l.apy) / 365)}/day
            </span>
          ))}
        </div>
        <div className="px-5 py-2.5 border-t border-border/50 flex flex-wrap gap-x-8 gap-y-1.5 justify-center">
          <span className="text-[11px] font-mono text-muted-foreground">
            Mgmt: {pctShort(fees.managementFeeRate)}/yr · ~{fmtFull(dailyMgmtFee)}/day accruing
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            Perf: {pctShort(fees.performanceFeeRate)} above HWM · accruing
          </span>
        </div>
      </motion.div>
    </div>
  );
}
