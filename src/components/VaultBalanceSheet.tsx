import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Activity, Shield, Clock,
  Landmark, Wallet, BarChart3,
} from "lucide-react";

/* ─── Types ─── */
interface RWAPosition {
  token: string;
  amount: number;
  yieldRate: number;
}

interface BorrowPosition {
  id: string;
  collateralToken: string;
  collateralAmount: number;
  borrowedUSDC: number;
  fixedRate: number;
  maturityDate: string;
}

interface VaultBalanceSheetProps {
  cash: number;
  rwaPositions: RWAPosition[];
  borrowPositions: BorrowPosition[];
}

/* ─── Helpers ─── */
function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function pct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

/* ─── Component ─── */
export function VaultBalanceSheet({ cash, rwaPositions, borrowPositions }: VaultBalanceSheetProps) {
  const totalRWA = rwaPositions.reduce((s, r) => s + r.amount, 0);
  const totalAssets = cash + totalRWA;
  const totalLiabilities = borrowPositions.reduce((s, b) => s + b.borrowedUSDC, 0);
  const nav = totalAssets - totalLiabilities;
  const leverageRatio = nav > 0 ? totalAssets / nav : 0;
  const dailyYield = rwaPositions.reduce((s, r) => s + (r.amount * r.yieldRate) / 365, 0);
  const dailyCost = borrowPositions.reduce((s, b) => s + (b.borrowedUSDC * b.fixedRate) / 365, 0);
  const netSpread = dailyYield - dailyCost;

  return (
    <div className="space-y-4">
      {/* T-Account */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-xl border border-border overflow-hidden">
        {/* ── LEFT: Assets ── */}
        <div className="bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col">
          <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-sm text-foreground">Assets</span>
            <span className="ml-auto font-mono text-sm text-primary">{fmt(totalAssets)}</span>
          </div>

          {/* Cash */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-buffer-safe" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Cash</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-foreground">USDC</span>
              <span className="font-mono text-foreground">{fmt(cash)}</span>
            </div>
          </div>

          {/* RWA Positions */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">RWA Positions</span>
            </div>
            {rwaPositions.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground">{r.token}</span>
                  <span className="text-xs font-mono text-primary">{pct(r.yieldRate)}</span>
                </div>
                <span className="font-mono text-foreground">{fmt(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 border-t border-border/30 text-xs text-muted-foreground font-mono">
              <span>Subtotal</span>
              <span>{fmt(totalRWA)}</span>
            </div>
          </div>

          {/* Total Assets */}
          <div className="px-5 py-3 mt-auto bg-secondary/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">Total Assets</span>
              <span className="font-mono text-primary">{fmt(totalAssets)}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Liabilities + Equity ── */}
        <div className="bg-card flex flex-col">
          <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <span className="font-display font-semibold text-sm text-foreground">Liabilities & Equity</span>
            <span className="ml-auto font-mono text-sm text-accent">{fmt(totalAssets)}</span>
          </div>

          {/* Borrow Positions */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Borrow Positions</span>
            </div>
            {borrowPositions.map((b) => (
              <div key={b.id} className="py-2 border-b border-border/20 last:border-0">
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{b.id}</span>
                    <span className="text-xs text-muted-foreground">{b.collateralToken}</span>
                    <span className="text-xs font-mono text-primary">{pct(b.fixedRate)}</span>
                  </div>
                  <span className="font-mono text-foreground text-sm">{fmt(b.borrowedUSDC)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono">Collateral: {fmt(b.collateralAmount)} {b.collateralToken}</span>
                  <span className="font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3" />{b.maturityDate}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 border-t border-border/30 text-xs text-muted-foreground font-mono">
              <span>Total Liabilities</span>
              <span>{fmt(totalLiabilities)}</span>
            </div>
          </div>

          {/* NAV & Leverage */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Equity (NAV)</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="font-mono text-foreground">NAV</span>
              <span className="font-mono text-primary font-semibold">{fmt(nav)}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="font-mono text-muted-foreground">Leverage Ratio</span>
              <span className="font-mono text-foreground">{leverageRatio.toFixed(2)}x</span>
            </div>
          </div>

          {/* Balance check */}
          <div className="px-5 py-3 mt-auto bg-secondary/20">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="font-display text-foreground">Liabilities + Equity</span>
              <span className="font-mono text-accent">{fmt(totalAssets)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Daily Yield / Cost / Spread */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground font-mono mb-1">Daily Yield</div>
          <div className="text-lg font-display font-bold text-primary">{fmt(dailyYield)}</div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            {fmt(dailyYield * 365)}/yr
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground font-mono mb-1">Daily Cost</div>
          <div className="text-lg font-display font-bold text-destructive">{fmt(dailyCost)}</div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            {fmt(dailyCost * 365)}/yr
          </div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-card p-4 text-center glow-primary">
          <div className="text-xs text-muted-foreground font-mono mb-1">Net Spread</div>
          <div className="text-lg font-display font-bold text-gradient-primary">{fmt(netSpread)}</div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            {fmt(netSpread * 365)}/yr
          </div>
        </div>
      </motion.div>
    </div>
  );
}
