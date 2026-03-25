import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, TrendingUp, Clock } from "lucide-react";
import { useAccount } from "wagmi";
import { useVaultListData } from "@/hooks/queries/useVaultListData";
import { useNavigate } from "react-router-dom";
import { vaultDetailPath } from "@/domain/vaults/mappers";
import { formatDisplayNumber } from "@/lib/formatNumbers";

export default function PositionsPage() {
  const { isConnected, address } = useAccount();
  const { data, isLoading, isError } = useVaultListData();
  const navigate = useNavigate();

  const positions = data?.userPositions ?? [];
  const totalValue = positions.reduce((s, p) => s + p.redeemableUSD, 0);
  const weightApy =
    totalValue > 0
      ? positions.reduce((s, p) => s + p.apy7d * p.redeemableUSD, 0) / totalValue
      : positions.length
        ? positions.reduce((s, p) => s + p.apy7d, 0) / positions.length
        : 0;

  if (!isConnected) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-display font-bold text-foreground">My Positions</h1>
        <p className="text-sm text-muted-foreground">Connect your wallet to see positions.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6 max-w-4xl mx-auto text-muted-foreground">Loading positions…</div>;
  }

  if (isError) {
    return <div className="p-6 max-w-4xl mx-auto text-destructive">Failed to load positions.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">My Positions</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your vault deposits (wallet {address?.slice(0, 6)}…)</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <StatCard
          label="Positions"
          value={formatDisplayNumber(positions.length, { maximumFractionDigits: 0 })}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Total estimated value"
          value={`$${formatDisplayNumber(totalValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          variant="primary"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Avg APY (7d, weighted)"
          value={`${formatDisplayNumber(weightApy, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
          variant="accent"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="font-display font-semibold text-foreground mb-4">Active Vault Positions</h3>
        {positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vault positions for this wallet.</p>
        ) : (
          <div className="space-y-4">
            {positions.map((pos) => (
              <button
                key={`${pos.chainId}-${pos.mTokenAddress}`}
                type="button"
                onClick={() => navigate(vaultDetailPath(pos.chainId, pos.mTokenAddress))}
                className="w-full text-left border-b border-border pb-4 last:border-0 last:pb-0 hover:bg-secondary/20 rounded-lg p-2 -m2 transition-colors"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="font-display font-semibold text-foreground">{pos.vaultName}</h4>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDisplayNumber(pos.shares, { maximumFractionDigits: 4 })} shares · NAV $
                      {formatDisplayNumber(pos.pricePerShare, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}{" "}
                      (USD/share) · APY {formatDisplayNumber(pos.apy7d, { maximumFractionDigits: 2 })}%
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg text-foreground font-bold">
                      $
                      {formatDisplayNumber(pos.redeemableUSD, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="font-mono text-sm text-muted-foreground">{pos.underlyingSymbol}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
