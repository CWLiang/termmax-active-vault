import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVaultListData } from "@/hooks/queries/useVaultListData";
import { vaultDetailPath } from "@/domain/vaults/mappers";
import { curatorVaultSectionPath } from "@/lib/curatorConsolePaths";

function formatUSD(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function CuratorDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useVaultListData();
  const vaults = data?.vaults ?? [];

  if (isLoading) {
    return <div className="p-6 max-w-6xl text-muted-foreground">Loading strategy vaults…</div>;
  }

  if (isError) {
    return <div className="p-6 max-w-6xl text-destructive">Failed to load vaults from API.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Strategy vaults</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a vault to open curator tools (overview, NAV, redemption, deposit, audit).
        </p>
      </motion.div>

      {vaults.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published vaults returned by the API.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vaults.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg">{v.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">TVL</span>
                      <div className="font-mono font-semibold text-foreground">{formatUSD(v.tvl)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">NAV (USD / share)</span>
                      <div className="font-mono font-semibold text-foreground">
                        ${v.navPerShare.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">APY (7d)</span>
                      <div className="flex items-center gap-1.5 font-mono text-sm text-yield-positive">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {v.apy7d.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Buffer %</span>
                      <div className="flex items-center gap-1.5 font-mono text-sm">
                        {v.bufferRatio >= 15 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-yield-positive" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                        )}
                        <span>{v.bufferRatio.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      className="flex-1"
                      onClick={() => navigate(curatorVaultSectionPath(v.chainId, v.mTokenAddress, "overview"))}
                    >
                      Manage <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => navigate(vaultDetailPath(v.chainId, v.mTokenAddress))}>
                      Public vault page <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
