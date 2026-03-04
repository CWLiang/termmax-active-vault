import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Gauge } from "@/components/ui/gauge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Shield, Clock, ChevronDown, ChevronUp, ArrowDownToLine, ArrowUpFromLine, DollarSign,
  PieChart, Activity, ExternalLink
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

const VAULT_DATA = {
  name: "RWA Enhanced Yield",
  curator: "Keyrock Capital",
  strategy: "RWA collateral + fixed-rate leverage on TermMax",
  strategyDetail: "This vault purchases OUSG (Ondo US Government Bond) tokens using deposited USDC. The RWA tokens are then collateralized on TermMax to borrow USDC at a fixed interest rate, which is locked at the time of entry. The borrowed USDC is redeployed into additional RWA purchases, creating a leverage loop that amplifies the base yield while keeping borrowing costs certain.",
  apy7d: 8.42,
  apy30d: 7.95,
  tvl: 12500000,
  capacity: 25000000,
  bufferRatio: 15.3,
  bufferAmount: 1912500,
  nav: 1.0342,
  positions: { rwa: 62, termmax: 23, cash: 15 },
};

const MOCK_ACTIONS = [
  { time: "2h ago", action: "Bought OUSG", amount: "$500,000", tx: "0x1a2b..." },
  { time: "6h ago", action: "Opened GT Position", amount: "$400,000 borrowed", tx: "0x3c4d..." },
  { time: "1d ago", action: "Placed Lending Order", amount: "$200,000", tx: "0x5e6f..." },
];

function formatUSD(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

function DepositPanel() {
  const [amount, setAmount] = useState("");
  const parsedAmount = parseFloat(amount) || 0;
  const estimatedShares = parsedAmount / VAULT_DATA.nav;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground font-mono mb-1.5 block">Deposit Amount (USDC)</label>
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="font-mono text-lg bg-secondary border-border"
        />
      </div>
      {parsedAmount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Estimated APY</span>
            <span className="text-primary font-mono">{VAULT_DATA.apy7d}%</span>
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
        <ArrowDownToLine className="h-4 w-4" />
        Deposit USDC
      </Button>
    </div>
  );
}

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
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-lg bg-secondary border-border"
            />
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
          <Button
            className="w-full"
            variant={exceedsBuffer ? "accent" : "default"}
            disabled={parsedAmount <= 0}
            onClick={() => exceedsBuffer ? setStep(2) : undefined}
          >
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

export default function VaultDetailPage() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const [strategyExpanded, setStrategyExpanded] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary transition-colors mb-6 flex items-center gap-1">
        ← Back to Vaults
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Vault Info (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-foreground">{VAULT_DATA.name}</h1>
              <span className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="font-mono">{VAULT_DATA.curator}</span>
              <span className="text-border">•</span>
              <Clock className="h-4 w-4" />
              <span className="font-mono">Active since Jan 2026</span>
            </div>
          </motion.div>

          {/* Key Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="APY (7d)" value={`${VAULT_DATA.apy7d}%`} variant="primary" subValue="+0.15%" trend="up" />
            <StatCard label="APY (30d)" value={`${VAULT_DATA.apy30d}%`} />
            <StatCard label="TVL" value={formatUSD(VAULT_DATA.tvl)} />
            <StatCard label="NAV" value={VAULT_DATA.nav.toFixed(4)} subValue="+0.34%" trend="up" />
          </motion.div>

          {/* Strategy (Layered) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">Strategy</h3>
              <button
                onClick={() => setStrategyExpanded(!strategyExpanded)}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                {strategyExpanded ? "Less" : "Details"}
                {strategyExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{VAULT_DATA.strategy}</p>
            <AnimatePresence>
              {strategyExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-border space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{VAULT_DATA.strategyDetail}</p>
                    {/* Position Breakdown */}
                    <div>
                      <h4 className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Position Breakdown</h4>
                      <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                        <div className="bg-primary" style={{ width: `${VAULT_DATA.positions.rwa}%` }} title={`RWA: ${VAULT_DATA.positions.rwa}%`} />
                        <div className="bg-accent" style={{ width: `${VAULT_DATA.positions.termmax}%` }} title={`TermMax: ${VAULT_DATA.positions.termmax}%`} />
                        <div className="bg-muted-foreground" style={{ width: `${VAULT_DATA.positions.cash}%` }} title={`Cash: ${VAULT_DATA.positions.cash}%`} />
                      </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> RWA {VAULT_DATA.positions.rwa}%</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent" /> TermMax {VAULT_DATA.positions.termmax}%</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground" /> Cash {VAULT_DATA.positions.cash}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* NAV Chart Placeholder */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">NAV Performance</h3>
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm font-mono border border-dashed border-border rounded-lg">
              NAV Chart — Coming Soon
            </div>
          </motion.div>

          {/* Recent Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Recent Curator Actions</h3>
            <div className="space-y-3">
              {MOCK_ACTIONS.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-foreground">{a.action}</span>
                      <span className="text-muted-foreground ml-2 font-mono">{a.amount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span>{a.time}</span>
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
        </motion.div>
      </div>
    </div>
  );
}
