import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const stats = [
  { label: "TVL", value: "$27.4M" },
  { label: "NAV/share", value: "$1.1162", sub: "+0.028%", subColor: "text-yield-positive" },
  { label: "Supply", value: "24.5M pUSDC" },
  { label: "Cap", value: "50M pUSDC" },
];

const wallets = [
  { label: "Management Wallet (Deposit Vault)", address: "0x3f4a...bc12", balance: "$27,430,215.00", full: "0x3f4abc12" },
  { label: "Fee Wallet (Deposit Vault)", address: "0x7e2d...aa09", balance: "$14,832.50", full: "0x7e2daa09" },
  { label: "Management Wallet (Redemption Vault)", address: "0x3f4a...bc12", balance: "$27,430,215.00", full: "0x3f4abc12" },
  { label: "Fee Wallet (Redemption Vault)", address: "0x7e2d...aa09", balance: "$14,832.50", full: "0x7e2daa09" },
];

export default function VaultOverviewPage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-display font-bold text-foreground">RWA Enhanced Yield</h1>
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span>0x7a3f…cd91</span>
            <button onClick={() => { navigator.clipboard.writeText("0x7a3fcd91"); toast.success("Copied"); }}>
              <Copy className="h-3 w-3 hover:text-foreground" />
            </button>
            <a href="https://etherscan.io" target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 hover:text-foreground" /></a>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Keyrock Capital · Active since Jan 2025</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-mono font-bold text-foreground mt-1">{s.value}</div>
                {s.sub && <span className={`text-xs font-mono ${s.subColor}`}>{s.sub}</span>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Token status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Token Status</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm font-mono text-foreground">pUSDC: <span className="text-yield-positive">Active</span></span>
          <Button variant="destructive" size="sm" className="text-xs">Pause pUSDC</Button>
        </CardContent>
      </Card>

      {/* Wallets */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Wallets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {wallets.map((w, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{w.label}</div>
                <div className="font-mono text-sm text-foreground">{w.address}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-foreground">{w.balance}</span>
                <a href={`https://debank.com/profile/${w.full}`} target="_blank" rel="noreferrer"
                  className="text-xs text-primary hover:underline whitespace-nowrap">
                  View on DeBank ↗
                </a>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
