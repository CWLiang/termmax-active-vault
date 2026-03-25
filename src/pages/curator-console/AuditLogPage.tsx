import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Download } from "lucide-react";
const logs = [
  { time: "2026-03-19 09:32", vault: "RWA Enhanced", action: "reportNAV $1.1162", by: "0x1a2b…", tx: "0xTx01…" },
  { time: "2026-03-19 08:10", vault: "T-Bill Maximizer", action: "approveRequest #1040", by: "0x1a2b…", tx: "0xTx02…" },
  { time: "2026-03-18 15:44", vault: "RWA Enhanced", action: "setInstantFee 0.10%", by: "0x1a2b…", tx: "0xTx03…" },
  { time: "2026-03-18 09:20", vault: "RWA Enhanced", action: "reportNAV $1.1159", by: "0x1a2b…", tx: "0xTx04…" },
];

export default function AuditLogPage() {
  const [vaultFilter, setVaultFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Audit Log</h1>
      </motion.div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Vault</label>
              <select value={vaultFilter} onChange={(e) => setVaultFilter(e.target.value)}
                className="block bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground mt-1">
                <option value="all">All Vaults</option>
                <option value="rwa">RWA Enhanced</option>
                <option value="tbill">T-Bill Maximizer</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Action</label>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
                className="block bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground mt-1">
                <option value="all">All Actions</option>
                <option value="nav">reportNAV</option>
                <option value="approve">approveRequest</option>
                <option value="settings">Settings Changes</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date Range</label>
              <div className="flex gap-2 mt-1">
                <Input type="date" className="font-mono text-sm" />
                <Input type="date" className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Address</label>
              <Input placeholder="0x..." className="font-mono mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">Time (UTC)</th>
                  <th className="text-left py-2 font-medium">Vault</th>
                  <th className="text-left py-2 font-medium">Action</th>
                  <th className="text-left py-2 font-medium">Executed By</th>
                  <th className="text-left py-2 font-medium">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs">{l.time}</td>
                    <td className="py-2 text-xs">{l.vault}</td>
                    <td className="py-2 font-mono text-xs">{l.action}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{l.by}</td>
                    <td className="py-2 font-mono text-xs">
                      <a href="https://etherscan.io" target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {l.tx} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" className="text-xs">
              <Download className="h-3 w-3 mr-1" />Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
