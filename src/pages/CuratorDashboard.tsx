import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/stat-card";
import { Gauge } from "@/components/ui/gauge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, DollarSign, TrendingUp, AlertTriangle, Activity,
  Coins, ArrowDownToLine, ArrowUpFromLine, Shield, Clock, Zap, Pause
} from "lucide-react";

const VAULT_HEALTH = {
  tvl: 12500000,
  cashBuffer: 1912500,
  bufferPercent: 15.3,
  utilization: 84.7,
  capacity: 25000000,
  remainingCapacity: 12500000,
};

const GT_POSITIONS = [
  { id: 1, collateral: "OUSG", borrowed: 400000, rate: 4.2, maturity: "2026-06-15", ltv: 65, liqThreshold: 85 },
  { id: 2, collateral: "OUSG", borrowed: 350000, rate: 3.95, maturity: "2026-09-15", ltv: 58, liqThreshold: 85 },
  { id: 3, collateral: "DigiFT T-Bill", borrowed: 250000, rate: 4.5, maturity: "2026-04-30", ltv: 72, liqThreshold: 80 },
];

const RWA_HOLDINGS = [
  { name: "OUSG", amount: 5200000, yieldRate: 4.8 },
  { name: "DigiFT T-Bill", amount: 2100000, yieldRate: 5.1 },
];

const MARKET_RATES = [
  { market: "OUSG / USDC", maturity: "90d", rate: 4.2, liquidity: 2800000 },
  { market: "OUSG / USDC", maturity: "180d", rate: 3.95, liquidity: 1500000 },
  { market: "DigiFT / USDC", maturity: "60d", rate: 4.5, liquidity: 900000 },
];

function formatUSD(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(2)}`;
}

function MonitoringPanel() {
  const hasLTVWarning = GT_POSITIONS.some(p => p.ltv / p.liqThreshold > 0.8);

  return (
    <div className="space-y-6">
      {/* Alert Bar */}
      {hasLTVWarning && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 rounded-lg bg-buffer-warning/10 border border-buffer-warning/30">
          <AlertTriangle className="h-4 w-4 text-buffer-warning shrink-0" />
          <span className="text-sm text-buffer-warning">GT Position #3 LTV at 72% — approaching danger zone (80% threshold)</span>
          <Button variant="outline" size="sm" className="ml-auto text-xs border-buffer-warning text-buffer-warning hover:bg-buffer-warning/10">
            <Zap className="h-3 w-3" /> Emergency Repay
          </Button>
        </motion.div>
      )}

      {/* Vault Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total TVL" value={formatUSD(VAULT_HEALTH.tvl)} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Cash Buffer" value={formatUSD(VAULT_HEALTH.cashBuffer)} subValue={`${VAULT_HEALTH.bufferPercent}%`} variant="accent" />
        <StatCard label="Utilization" value={`${VAULT_HEALTH.utilization}%`} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Remaining Cap" value={formatUSD(VAULT_HEALTH.remainingCapacity)} />
      </div>

      {/* GT Positions — LTV Gauges */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> GT Positions — Risk Monitor
        </h3>
        <div className="space-y-4">
          {GT_POSITIONS.map((pos) => (
            <div key={pos.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-foreground">{pos.collateral}</span>
                  <span className="text-xs text-muted-foreground">#{pos.id}</span>
                </div>
                <Gauge
                  value={pos.ltv}
                  max={pos.liqThreshold}
                  label={`LTV / Liq. ${pos.liqThreshold}%`}
                  thresholds={{ warning: 75, danger: 90 }}
                />
              </div>
              <div className="text-right space-y-0.5">
                <div className="font-mono text-sm text-foreground">{formatUSD(pos.borrowed)}</div>
                <div className="font-mono text-xs text-primary">{pos.rate}% fixed</div>
                <div className="font-mono text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" /> {pos.maturity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* RWA Holdings */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 text-sm">RWA Holdings</h3>
          {RWA_HOLDINGS.map((rwa, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
              <span className="font-mono text-foreground">{rwa.name}</span>
              <div className="text-right">
                <span className="font-mono text-foreground">{formatUSD(rwa.amount)}</span>
                <span className="font-mono text-primary ml-2 text-xs">{rwa.yieldRate}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* TermMax Rates */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 text-sm">TermMax Market Rates</h3>
          {MARKET_RATES.map((m, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
              <div>
                <span className="font-mono text-foreground text-xs">{m.market}</span>
                <span className="text-muted-foreground ml-2 text-xs">{m.maturity}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-primary text-xs">{m.rate}%</span>
                <span className="font-mono text-muted-foreground ml-2 text-xs">{formatUSD(m.liquidity)}</span>
              </div>
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
        {/* Left: Monitoring (2 cols) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-2">
          <MonitoringPanel />
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
