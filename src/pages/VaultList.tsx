import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Gauge } from "@/components/ui/gauge";
import { TrendingUp, Users, DollarSign, ArrowRight, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MOCK_VAULTS = [
  {
    id: "vault-1",
    name: "RWA Enhanced Yield",
    curator: "Keyrock Capital",
    strategy: "RWA collateral + fixed-rate leverage on TermMax",
    apy7d: 8.42,
    apy30d: 7.95,
    tvl: 20_296_699,
    capacity: 50_000_000,
    bufferRatio: 4.9,
    riskLevel: "Medium",
  },
  {
    id: "vault-2",
    name: "T-Bill Maximizer",
    curator: "Re7 Labs",
    strategy: "DigiFT T-bill + TermMax fixed-rate lending",
    apy7d: 6.18,
    apy30d: 6.05,
    tvl: 8_200_000,
    capacity: 20_000_000,
    bufferRatio: 18.7,
    riskLevel: "Low",
  },
];

function formatUSD(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function VaultListPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-display font-bold text-foreground">
          Active <span className="text-gradient-primary">Vaults</span>
        </h1>
        <p className="text-muted-foreground max-w-xl">
          Curated yield strategies powered by RWA collateral and TermMax fixed-rate borrowing. 
          Transparent, on-chain, with locked borrowing costs.
        </p>
      </motion.div>

      {/* Aggregate Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <StatCard label="Total TVL" value="$20.7M" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Avg APY (7d)" value="7.30%" variant="primary" icon={<TrendingUp className="h-4 w-4" />} subValue="+0.15%" trend="up" />
        <StatCard label="Active Vaults" value="2" icon={<Users className="h-4 w-4" />} />
      </motion.div>

      {/* Vault Cards */}
      <div className="space-y-4">
        {MOCK_VAULTS.map((vault, i) => (
          <motion.div
            key={vault.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            className="rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 cursor-pointer group"
            onClick={() => navigate(`/vault/${vault.id}`)}
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Info */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
                      {vault.name}
                    </h2>
                    <span className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                      {vault.riskLevel}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{vault.strategy}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="font-mono">{vault.curator}</span>
                    <span className="text-border">•</span>
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono">30d track record</span>
                  </div>
                </div>

                {/* Middle: Key Metrics */}
                <div className="flex gap-6 lg:gap-8">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-mono mb-1">APY (7d)</div>
                    <div className="text-2xl font-display font-bold text-primary">{vault.apy7d}%</div>
                    <div className="text-xs font-mono text-muted-foreground">{vault.apy30d}% 30d</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-mono mb-1">TVL</div>
                    <div className="text-2xl font-display font-bold text-foreground">{formatUSD(vault.tvl)}</div>
                    <div className="text-xs font-mono text-muted-foreground">/ {formatUSD(vault.capacity)}</div>
                  </div>
                </div>

                {/* Right: Buffer + CTA */}
                <div className="flex flex-col items-end gap-3 min-w-[160px]">
                  <Gauge
                    value={vault.bufferRatio}
                    max={100}
                    label="Cash Buffer"
                    thresholds={{ warning: 70, danger: 90 }}
                    className="w-full"
                  />
                  <Button variant="outline-primary" size="sm" className="group-hover:bg-primary/10 transition-all">
                    View Vault <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
