import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ConfirmActionModal } from "@/components/curator-console/ConfirmActionModal";

const requests = [
  { id: 1042, address: "0xAB12…", amount: "50,000", date: "2026-03-19" },
  { id: 1041, address: "0xCD34…", amount: "45,000", date: "2026-03-18" },
  { id: 1040, address: "0xEF56…", amount: "30,000", date: "2026-03-18" },
];

export default function RedemptionPage() {
  const [selected, setSelected] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");

  const toggleSelect = (id: number) => {
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  const openConfirm = (action: string) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Redemption Management</h1>
      </motion.div>

      {/* Overview */}
      <Card className="bg-card border-border">
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Pending Requests</span>
              <div className="font-mono font-bold text-foreground text-lg">3</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Amount</span>
              <div className="font-mono font-bold text-foreground text-lg">125,000 pUSDC</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Instant Daily Limit</span>
              <div className="font-mono text-sm text-foreground">$480,000 / $500,000</div>
              <Progress value={96} className="h-1.5 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-display text-sm">Pending Requests</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs" onClick={() => openConfirm("Bulk Approve at Saved Rate")}>
              Bulk Approve at Saved Rate
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => openConfirm("Bulk Approve")}>
              Bulk Approve...
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 w-8"></th>
                <th className="text-left py-2 font-medium">#</th>
                <th className="text-left py-2 font-medium">Address</th>
                <th className="text-right py-2 font-medium">Amount (pUSDC)</th>
                <th className="text-right py-2 font-medium">Requested At</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <>
                  <tr key={r.id} className="border-b border-border/50 cursor-pointer hover:bg-secondary/30"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="py-2 font-mono">#{r.id}</td>
                    <td className="py-2 font-mono">{r.address}</td>
                    <td className="py-2 font-mono text-right">{r.amount}</td>
                    <td className="py-2 font-mono text-right text-muted-foreground">{r.date}</td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-actions`}>
                      <td colSpan={5} className="py-3 px-4 bg-secondary/20">
                        <div className="flex gap-2">
                          <Button size="sm" className="text-xs" onClick={() => openConfirm(`Approve #${r.id} at Saved Rate`)}>
                            Approve at Saved Rate
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => openConfirm(`Approve #${r.id} (new rate)`)}>
                            Approve (new rate)
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs" onClick={() => openConfirm(`Reject #${r.id}`)}>
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ConfirmActionModal open={confirmOpen} onOpenChange={setConfirmOpen} action={confirmAction} />
    </div>
  );
}
