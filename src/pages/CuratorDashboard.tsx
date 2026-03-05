import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, AlertTriangle, Activity,
  Coins, ArrowDownToLine, ArrowUpFromLine, Zap, Pause,
} from "lucide-react";
import { VaultBalanceSheet } from "@/components/VaultBalanceSheet";

/* ─── Example Data ─── */
const VAULT_CASH = 0;

const VAULT_RWA = [
  { token: "OUSG", amount: 100, yieldRate: 0.05 },
  { token: "OUSG", amount: 60, yieldRate: 0.05 },
];

const VAULT_BORROWS = [
  { id: "GT-1", collateralToken: "OUSG", collateralAmount: 100, borrowedUSDC: 60, fixedRate: 0.03, maturityDate: "2025-06-01" },
  { id: "GT-2", collateralToken: "OUSG", collateralAmount: 60, borrowedUSDC: 36, fixedRate: 0.03, maturityDate: "2025-06-01" },
];

const VAULT_FEES = {
  managementFeeRate: 0.02,
  performanceFeeRate: 0.20,
  highWaterMark: 1.0200,
  accruedManagementFee: 0.88,
  accruedPerformanceFee: 0.52,
};

const VAULT_SHARES = {
  totalSharesOutstanding: 60,
  lpInvestedCapital: 60,
  accumulatedEarnings: 3.60,
};

function formatUSD(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
export default function CuratorDashboard() {
  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Curator <span className="text-gradient-primary">Console</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">RWA Enhanced Yield Vault — Keyrock Capital</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Balance Sheet (2 cols) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-2">
          <VaultBalanceSheet cash={VAULT_CASH} rwaPositions={VAULT_RWA} borrowPositions={VAULT_BORROWS} fees={VAULT_FEES} shares={VAULT_SHARES} navMTM={63.20} />
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
