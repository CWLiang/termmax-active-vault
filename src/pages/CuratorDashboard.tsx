import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Activity,
  Coins, ArrowDownToLine, ArrowUpFromLine, Zap, Pause, Timer, Waves,
} from "lucide-react";
import { VaultBalanceSheet } from "@/components/VaultBalanceSheet";

/* ─── Example Data — ~$39M Total Assets, 64 days since inception ─── */
const VAULT_CASH = 670_000;

const VAULT_RWA = [
  {
    token: "bEQTY",
    managedBy: "BNY",
    platform: "DigiFT",
    assetType: "equity_fund" as const,
    costBasis: 18_840_000,
    currentValue: 19_322_000,
    yieldRate: 0.065,
  },
  {
    token: "iSNR",
    managedBy: "Invesco",
    platform: "DigiFT",
    assetType: "private_credit" as const,
    costBasis: 10_990_000,
    currentValue: 10_990_000,
    yieldRate: 0.07,
  },
];

const VAULT_FRT = [
  {
    protocol: "TermMax",
    token: "FT-USDC-Jun25",
    assetType: "fixed_rate_token" as const,
    faceValue: 2_650_000,
    purchasePrice: 2_500_000,
    currentPrice: 2_500_000,
    purchaseDate: "2025-03-05",
    maturityDate: "2025-06-03",
    impliedYield: 0.0822,
  },
  {
    protocol: "Pendle",
    token: "PT-sUSDe-Sep25",
    assetType: "fixed_rate_token" as const,
    faceValue: 2_000_000,
    purchasePrice: 1_900_000,
    currentPrice: 1_900_000,
    purchaseDate: "2025-03-05",
    maturityDate: "2025-09-25",
    impliedYield: 0.0944,
  },
];

const VAULT_LENDING = [
  {
    protocol: "Aave",
    asset: "USDC",
    receiptToken: "aUSDC",
    principal: 2_000_000,
    currentValue: 2_000_000,
    apy: 0.045,
    rateType: "floating" as const,
    depositDate: "2025-03-05",
    withdrawable: true,
  },
  {
    protocol: "Morpho",
    asset: "USDC",
    receiptToken: "mUSDC",
    principal: 1_600_000,
    currentValue: 1_600_000,
    apy: 0.052,
    rateType: "floating" as const,
    depositDate: "2025-03-05",
    withdrawable: true,
  },
];

const VAULT_BORROWS = [
  {
    id: "GT-1",
    collateralToken: "bEQTY",
    collateralValue: 19_322_000,
    borrowedUSDC: 7_200_000,
    fixedRate: 0.04,
    maturityDate: "2025-06-03",
    currentLTV: 0.373,
  },
  {
    id: "GT-2",
    collateralToken: "iSNR",
    collateralValue: 10_990_000,
    borrowedUSDC: 4_200_000,
    fixedRate: 0.04,
    maturityDate: "2025-06-03",
    currentLTV: 0.382,
  },
];

const VAULT_FEES = {
  managementFeeRate: 0.02,
  performanceFeeRate: 0.10,
  highWaterMark: 1.00,
  accruedManagementFee: 110_144,
  accruedPerformanceFee: 75_157,
};

const VAULT_SHARES = {
  totalSharesOutstanding: 24_500_000,
  lpInvestedCapital: 24_500_000,
  accumulatedEarnings: 751_568,
  navPerShare: 1.1182,
};

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
          <VaultBalanceSheet
            cash={VAULT_CASH}
            rwaPositions={VAULT_RWA}
            frtPositions={VAULT_FRT}
            lendingPositions={VAULT_LENDING}
            borrowPositions={VAULT_BORROWS}
            fees={VAULT_FEES}
            shares={VAULT_SHARES}
            daysSinceInception={64}
            today="2025-03-05"
          />
        </motion.div>

        {/* Right: Action Panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="rounded-xl border border-border bg-card p-5 sticky top-6">
            <Tabs defaultValue="rwa">
              <TabsList className="w-full bg-secondary mb-4 flex-wrap h-auto gap-0.5 p-1">
                <TabsTrigger value="rwa" className="text-xs font-mono flex-1"><Coins className="h-3 w-3 mr-1" />RWA</TabsTrigger>
                <TabsTrigger value="frt" className="text-xs font-mono flex-1"><Timer className="h-3 w-3 mr-1" />FRT</TabsTrigger>
                <TabsTrigger value="lending" className="text-xs font-mono flex-1"><Waves className="h-3 w-3 mr-1" />Lend</TabsTrigger>
                <TabsTrigger value="borrow" className="text-xs font-mono flex-1"><Activity className="h-3 w-3 mr-1" />Borrow</TabsTrigger>
                <TabsTrigger value="emergency" className="text-xs font-mono flex-1"><AlertTriangle className="h-3 w-3 mr-1" />Emergency</TabsTrigger>
              </TabsList>

              <TabsContent value="rwa" className="space-y-4">
                <h4 className="font-display font-semibold text-sm text-foreground">Buy RWA Token</h4>
                <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono">
                  <option>bEQTY (BNY via DigiFT)</option>
                  <option>iSNR (Invesco via DigiFT)</option>
                </select>
                <input type="number" placeholder="USDC Amount" className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground" />
                <Button className="w-full"><ArrowDownToLine className="h-4 w-4" />Buy RWA</Button>
                <div className="border-t border-border pt-4">
                  <h4 className="font-display font-semibold text-sm text-foreground mb-3">Redeem RWA Token</h4>
                  <Button variant="outline" className="w-full"><ArrowUpFromLine className="h-4 w-4" />Redeem</Button>
                </div>
              </TabsContent>

              <TabsContent value="frt" className="space-y-4">
                <h4 className="font-display font-semibold text-sm text-foreground">Buy Fixed Rate Token</h4>
                <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono">
                  <option>FT-USDC-Jun25 (TermMax, 8.22%)</option>
                  <option>PT-sUSDe-Sep25 (Pendle, 9.44%)</option>
                </select>
                <input type="number" placeholder="USDC Amount" className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground" />
                <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Implied Yield</span><span className="text-primary font-mono">8.22%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Maturity</span><span className="text-foreground font-mono">Jun 3, 2025</span></div>
                </div>
                <Button className="w-full"><ArrowDownToLine className="h-4 w-4" />Buy FRT</Button>
              </TabsContent>

              <TabsContent value="lending" className="space-y-4">
                <h4 className="font-display font-semibold text-sm text-foreground">Deploy to Lending</h4>
                <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono">
                  <option>Aave USDC (~4.5% APY)</option>
                  <option>Morpho USDC (~5.2% APY)</option>
                </select>
                <input type="number" placeholder="USDC Amount" className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground" />
                <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Rate Type</span><span className="text-amber-400 font-mono">~Floating</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Withdrawable</span><span className="text-emerald-400 font-mono">✓ On demand</span></div>
                </div>
                <Button className="w-full"><ArrowDownToLine className="h-4 w-4" />Deploy</Button>
                <div className="border-t border-border pt-4">
                  <h4 className="font-display font-semibold text-sm text-foreground mb-3">Withdraw from Lending</h4>
                  <Button variant="outline" className="w-full"><ArrowUpFromLine className="h-4 w-4" />Withdraw</Button>
                </div>
              </TabsContent>

              <TabsContent value="borrow" className="space-y-4">
                <h4 className="font-display font-semibold text-sm text-foreground">Open GT Position</h4>
                <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono">
                  <option>bEQTY → USDC (90d @ 4.0%)</option>
                  <option>iSNR → USDC (90d @ 4.0%)</option>
                </select>
                <input type="number" placeholder="Collateral Amount" className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground" />
                <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Fixed Rate</span><span className="text-primary font-mono">4.00%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Est. LTV</span><span className="text-foreground font-mono">37.3%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Maturity</span><span className="text-foreground font-mono">2025-09-03</span></div>
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
