import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const alerts = [
  { vault: "RWA Enhanced Yield", msg: "NAV last updated 18h ago", type: "warning" as const },
  { vault: "T-Bill Maximizer", msg: "3 pending redemption requests", type: "warning" as const },
];

const vaults = [
  { id: "rwa", name: "RWA Enhanced Yield", tvl: "$27.4M", nav: "$1.1162", lastUpdated: "18h ago", lastUpdatedOk: false, pendingRedemptions: 0 },
  { id: "tbill", name: "T-Bill Maximizer", tvl: "$8.2M", nav: "$1.0312", lastUpdated: "4h ago", lastUpdatedOk: true, pendingRedemptions: 3 },
];

export default function CuratorDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
      </motion.div>

      {/* Alert banners */}
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 border border-accent/30 text-sm"
          >
            <AlertTriangle className="h-4 w-4 text-accent shrink-0" />
            <span className="text-foreground font-medium">{a.vault}</span>
            <span className="text-muted-foreground">— {a.msg}</span>
          </motion.div>
        ))}
      </div>

      {/* Vault cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vaults.map((v, i) => (
          <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg">{v.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">TVL</span>
                    <div className="font-mono font-semibold text-foreground">{v.tvl}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">NAV</span>
                    <div className="font-mono font-semibold text-foreground">{v.nav}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Last Updated</span>
                    <div className="flex items-center gap-1.5 font-mono text-sm">
                      {v.lastUpdatedOk
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-yield-positive" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-accent" />}
                      <span className={v.lastUpdatedOk ? "text-yield-positive" : "text-accent"}>{v.lastUpdated}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Pending Redemptions</span>
                    <div className="flex items-center gap-1.5 font-mono text-sm">
                      {v.pendingRedemptions > 0 && <AlertTriangle className="h-3.5 w-3.5 text-accent" />}
                      <span className={v.pendingRedemptions > 0 ? "text-accent" : "text-foreground"}>{v.pendingRedemptions}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-2 text-primary" onClick={() => navigate("/curator-console/vault-overview")}>
                  Manage <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
