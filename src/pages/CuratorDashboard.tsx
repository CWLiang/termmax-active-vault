import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/stat-card";
import { Gauge } from "@/components/ui/gauge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, DollarSign, TrendingUp, AlertTriangle, Activity,
  Coins, ArrowDownToLine, ArrowUpFromLine, Shield, Clock, Zap, Pause,
  ArrowRight, Landmark, Wallet, Users
} from "lucide-react";

/* ─── Mock Data ─── */
const ASSETS = {
  rwa: [
    { name: "OUSG (Ondo)", value: 5_200_000, yield: 4.8, allocation: 41.6 },
    { name: "DigiFT T-Bill", value: 2_100_000, yield: 5.1, allocation: 16.8 },
  ],
  termMaxFT: [
    { id: 1, collateral: "OUSG", principal: 400_000, rate: 4.2, maturity: "2026-06-15", ltv: 65, liqThreshold: 85, allocation: 3.2 },
    { id: 2, collateral: "OUSG", principal: 350_000, rate: 3.95, maturity: "2026-09-15", ltv: 58, liqThreshold: 85, allocation: 2.8 },
    { id: 3, collateral: "DigiFT", principal: 250_000, rate: 4.5, maturity: "2026-04-30", ltv: 72, liqThreshold: 80, allocation: 2.0 },
  ],
  cash: { value: 4_200_000, allocation: 33.6 },
};

const LIABILITIES = {
  depositorShares: { value: 12_150_000, sharePrice: 1.0234 },
  pendingWithdrawals: { value: 280_000, count: 3 },
  accruedFees: { management: 12_500, performance: 37_500 },
};

const totalAssets = ASSETS.rwa.reduce((s, r) => s + r.value, 0)
  + ASSETS.termMaxFT.reduce((s, f) => s + f.principal, 0)
  + ASSETS.cash.value;

const totalLiabilities = LIABILITIES.depositorShares.value
  + LIABILITIES.pendingWithdrawals.value
  + LIABILITIES.accruedFees.management
  + LIABILITIES.accruedFees.performance;

const netEquity = totalAssets - totalLiabilities;

const MARKET_RATES = [
  { market: "OUSG / USDC", maturity: "90d", rate: 4.2, liquidity: 2_800_000 },
  { market: "OUSG / USDC", maturity: "180d", rate: 3.95, liquidity: 1_500_000 },
  { market: "DigiFT / USDC", maturity: "60d", rate: 4.5, liquidity: 900_000 },
];

function formatUSD(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/* ─── T-Account Balance Sheet ─── */
function BalanceSheet() {
  const hasLTVWarning = ASSETS.termMaxFT.some(p => p.ltv / p.liqThreshold > 0.8);

  return (
    <div className="space-y-4">
      {/* Alert Bar */}
      {hasLTVWarning && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 rounded-lg bg-buffer-warning/10 border border-buffer-warning/30">
          <AlertTriangle className="h-4 w-4 text-buffer-warning shrink-0" />
          <span className="text-sm text-buffer-warning font-mono">GT #3 LTV 72% — approaching 80% threshold</span>
          <Button variant="outline" size="sm" className="ml-auto text-xs border-buffer-warning text-buffer-warning hover:bg-buffer-warning/10">
            <Zap className="h-3 w-3" /> Emergency Repay
          </Button>
        </motion.div>
      )}

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground font-mono mb-1">Total Assets</div>
          <div className="text-xl font-display font-bold text-foreground">{formatUSD(totalAssets)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground font-mono mb-1">Total Liabilities</div>
          <div className="text-xl font-display font-bold text-foreground">{formatUSD(totalLiabilities)}</div>
        </div>
        <div className="rounded-xl border border-primary/30 bg-card p-4 text-center glow-primary">
          <div className="text-xs text-muted-foreground font-mono mb-1">Net Equity</div>
          <div className="text-xl font-display font-bold text-gradient-primary">{formatUSD(netEquity)}</div>
        </div>
      </div>

      {/* T-Account: Assets | Liabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-xl border border-border overflow-hidden">
        {/* ── LEFT: Assets ── */}
        <div className="bg-card border-b lg:border-b-0 lg:border-r border-border">
          <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-sm text-foreground">Assets</span>
            <span className="ml-auto font-mono text-sm text-primary">{formatUSD(totalAssets)}</span>
          </div>

          {/* RWA */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">RWA Holdings</span>
            </div>
            {ASSETS.rwa.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground">{r.name}</span>
                  <span className="text-xs font-mono text-primary">{r.yield}%</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-foreground">{formatUSD(r.value)}</span>
                  <span className="text-xs text-muted-foreground ml-2">{r.allocation}%</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 border-t border-border/30 text-xs text-muted-foreground font-mono">
              <span>Subtotal</span>
              <span>{formatUSD(ASSETS.rwa.reduce((s, r) => s + r.value, 0))}</span>
            </div>
          </div>

          {/* TermMax FT Positions */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">TermMax FT Positions</span>
            </div>
            {ASSETS.termMaxFT.map((ft) => (
              <div key={ft.id} className="py-2 border-b border-border/20 last:border-0">
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{ft.collateral}</span>
                    <span className="text-xs text-muted-foreground">#{ft.id}</span>
                    <span className="text-xs font-mono text-primary">{ft.rate}%</span>
                  </div>
                  <span className="font-mono text-foreground text-sm">{formatUSD(ft.principal)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Gauge
                    value={ft.ltv}
                    max={ft.liqThreshold}
                    label={`LTV ${ft.ltv}% / Liq ${ft.liqThreshold}%`}
                    thresholds={{ warning: 75, danger: 90 }}
                    className="flex-1"
                    showPercentage={false}
                  />
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />{ft.maturity}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 border-t border-border/30 text-xs text-muted-foreground font-mono">
              <span>Subtotal</span>
              <span>{formatUSD(ASSETS.termMaxFT.reduce((s, f) => s + f.principal, 0))}</span>
            </div>
          </div>

          {/* Cash */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-buffer-safe" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Cash Buffer</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-foreground">USDC</span>
              <div className="text-right">
                <span className="font-mono text-foreground">{formatUSD(ASSETS.cash.value)}</span>
                <span className="text-xs text-buffer-safe ml-2">{ASSETS.cash.allocation}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Liabilities + Equity ── */}
        <div className="bg-card">
          <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <span className="font-display font-semibold text-sm text-foreground">Liabilities & Equity</span>
            <span className="ml-auto font-mono text-sm text-accent">{formatUSD(totalLiabilities + netEquity)}</span>
          </div>

          {/* Depositor Shares */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Depositor Shares</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-mono text-foreground">Vault Shares (ERC-4626)</span>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Share Price: <span className="text-primary font-mono">${LIABILITIES.depositorShares.sharePrice.toFixed(4)}</span>
                </div>
              </div>
              <span className="font-mono text-foreground">{formatUSD(LIABILITIES.depositorShares.value)}</span>
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-buffer-warning" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Pending Withdrawals</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-mono text-foreground">Queued Requests</span>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {LIABILITIES.pendingWithdrawals.count} requests in queue
                </div>
              </div>
              <span className="font-mono text-buffer-warning">{formatUSD(LIABILITIES.pendingWithdrawals.value)}</span>
            </div>
          </div>

          {/* Accrued Fees */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Accrued Fees</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="font-mono text-muted-foreground">Management (1% AUM)</span>
              <span className="font-mono text-foreground">{formatUSD(LIABILITIES.accruedFees.management)}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="font-mono text-muted-foreground">Performance (10% profit)</span>
              <span className="font-mono text-foreground">{formatUSD(LIABILITIES.accruedFees.performance)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-border/30 text-xs text-muted-foreground font-mono">
              <span>Subtotal</span>
              <span>{formatUSD(LIABILITIES.accruedFees.management + LIABILITIES.accruedFees.performance)}</span>
            </div>
          </div>

          {/* Net Equity */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Net Equity (Surplus)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-foreground">Unrealized P&L</span>
              <span className="font-mono text-primary font-semibold">{formatUSD(netEquity)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TermMax Market Rates */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> TermMax Market Rates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MARKET_RATES.map((m, i) => (
            <div key={i} className="rounded-lg bg-secondary/50 border border-border p-3 space-y-1">
              <div className="font-mono text-xs text-foreground">{m.market}</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg text-primary font-semibold">{m.rate}%</span>
                <span className="text-xs text-muted-foreground">{m.maturity}</span>
              </div>
              <div className="text-xs text-muted-foreground font-mono">Liq: {formatUSD(m.liquidity)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CuratorDashboard() {
  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Curator <span className="text-gradient-primary">Command Center</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">RWA Enhanced Yield Vault — Keyrock Capital</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Balance Sheet (2 cols) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-2">
          <BalanceSheet />
        </motion.div>

        {/* Right: Action Panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="rounded-xl border border-border bg-card p-5 sticky top-6">
            <Tabs defaultValue="rwa">
              <TabsList className="w-full bg-secondary mb-4 flex-wrap h-auto gap-0.5 p-1">
                <TabsTrigger value="rwa" className="text-xs font-mono flex-1"><Coins className="h-3 w-3 mr-1" />RWA</TabsTrigger>
                <TabsTrigger value="borrow" className="text-xs font-mono flex-1"><Activity className="h-3 w-3 mr-1" />Borrow</TabsTrigger>
                <TabsTrigger value="emergency" className="text-xs font-mono flex-1"><AlertTriangle className="h-3 w-3 mr-1" />Emergency</TabsTrigger>
              </TabsList>

              <TabsContent value="rwa" className="space-y-4">
                <h4 className="font-display font-semibold text-sm text-foreground">Buy RWA Token</h4>
                <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono">
                  <option>OUSG (Ondo)</option>
                  <option>DigiFT T-Bill</option>
                </select>
                <input type="number" placeholder="USDC Amount" className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground" />
                <Button className="w-full"><ArrowDownToLine className="h-4 w-4" />Buy RWA</Button>
                <div className="border-t border-border pt-4">
                  <h4 className="font-display font-semibold text-sm text-foreground mb-3">Redeem RWA Token</h4>
                  <Button variant="outline" className="w-full"><ArrowUpFromLine className="h-4 w-4" />Redeem</Button>
                </div>
              </TabsContent>

              <TabsContent value="borrow" className="space-y-4">
                <h4 className="font-display font-semibold text-sm text-foreground">Open GT Position</h4>
                <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono">
                  <option>OUSG → USDC (90d @ 4.2%)</option>
                  <option>OUSG → USDC (180d @ 3.95%)</option>
                  <option>DigiFT → USDC (60d @ 4.5%)</option>
                </select>
                <input type="number" placeholder="Collateral Amount" className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground" />
                <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Fixed Rate</span><span className="text-primary font-mono">4.20%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Est. LTV</span><span className="text-foreground font-mono">62%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Maturity</span><span className="text-foreground font-mono">2026-06-15</span></div>
                </div>
                <Button className="w-full"><Activity className="h-4 w-4" />Open Position</Button>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-4">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-2">
                  <p className="text-xs text-destructive">Emergency operations execute immediately without Timelock.</p>
                </div>
                <Button variant="destructive" className="w-full"><Zap className="h-4 w-4" />Emergency Repay</Button>
                <Button variant="destructive" className="w-full"><ArrowUpFromLine className="h-4 w-4" />Force Redeem RWA</Button>
                <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10"><Pause className="h-4 w-4" />Pause New Deposits</Button>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
