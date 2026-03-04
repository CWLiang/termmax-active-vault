import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, TrendingUp, Clock } from "lucide-react";

export default function PositionsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">My Positions</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your vault deposits and earnings</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Deposited" value="$10,000" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Current Value" value="$10,342" variant="primary" subValue="+3.42%" trend="up" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Unrealized Yield" value="$342.00" variant="accent" subValue="+$342" trend="up" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Active Vault Positions</h3>
        <div className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display font-semibold text-foreground">RWA Enhanced Yield</h4>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> Entered Jan 15, 2026 • NAV at entry: 1.0000</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg text-foreground font-bold">$10,342.00</div>
              <div className="font-mono text-sm text-yield-positive">+$342.00 (+3.42%)</div>
            </div>
          </div>
        </div>
        <div className="pt-4 text-center text-sm text-muted-foreground font-mono">
          No other positions
        </div>
      </motion.div>
    </div>
  );
}
