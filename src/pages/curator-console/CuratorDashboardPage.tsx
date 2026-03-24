import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVaultListData } from "@/hooks/queries/useVaultListData";
import { curatorVaultSectionPath } from "@/lib/curatorConsolePaths";
import { formatDisplayNumber, formatUsdCompact } from "@/lib/formatNumbers";

function formatUSD(value: number) {
  return formatUsdCompact(value, "list");
}

export default function CuratorDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useVaultListData();
  const vaults = data?.vaults ?? [];
  const termmaxFrontendBase = "https://termmax-frontend-v3.onrender.com";

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
          Choose a vault to open curator tools (overview, price, redemption, deposit, activity).
        </p>
      </motion.div>

      {vaults.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published vaults returned by the API.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vaults.map((v, i) => {
            const price = v.navPerShare;
            const nav = v.totalSupply * price;
            const capacity = Math.max(0, v.capacityCap - v.totalSupply) * price;
            return (
            <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg">{v.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">NAV</span>
                      <div className="font-mono font-semibold text-foreground">{formatUSD(nav)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Price</span>
                      <div className="font-mono font-semibold text-foreground">
                        $
                        {formatDisplayNumber(price, { minimumFractionDigits: 0, maximumFractionDigits: 6 })}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">APY (7d)</span>
                      <div className="flex items-center gap-1.5 font-mono text-sm text-yield-positive">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {formatDisplayNumber(v.apy7d, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Capacity</span>
                      <div className="font-mono font-semibold text-foreground">{formatUSD(capacity)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      className="flex-1"
                      onClick={() => navigate(curatorVaultSectionPath(v.chainId, v.mTokenAddress, "overview"))}
                    >
                      Manage <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        window.open(
                          `${termmaxFrontendBase}/strategy-vault/${v.chainId}/${v.id}`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Public vault page <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
