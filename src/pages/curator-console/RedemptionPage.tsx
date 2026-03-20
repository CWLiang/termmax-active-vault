import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmActionModal } from "@/components/curator-console/ConfirmActionModal";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";

const requests = [
  { id: 1042, address: "0xAB12…", amount: "50,000", date: "2026-03-19" },
  { id: 1041, address: "0xCD34…", amount: "45,000", date: "2026-03-18" },
  { id: 1040, address: "0xEF56…", amount: "30,000", date: "2026-03-18" },
];

const CURRENT_NAV = "1.1162";

export default function RedemptionPage() {
  const { vault } = useCuratorVaultSummary();
  const [selected, setSelected] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [confirmValue, setConfirmValue] = useState("");

  // New rate modal
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateModalAction, setRateModalAction] = useState("");
  const [rateModalLabel, setRateModalLabel] = useState("");
  const [newRate, setNewRate] = useState(CURRENT_NAV);

  // Vault settings
  const [showAddToken, setShowAddToken] = useState(false);

  const toggleSelect = (id: number) => {
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  const selectAll = () => {
    if (selected.length === requests.length) setSelected([]);
    else setSelected(requests.map((r) => r.id));
  };

  const openConfirm = (action: string, value?: string) => {
    setConfirmAction(action);
    setConfirmValue(value || "");
    setConfirmOpen(true);
  };

  const openRateModal = (action: string, label: string) => {
    setNewRate(CURRENT_NAV);
    setRateModalAction(action);
    setRateModalLabel(label);
    setRateModalOpen(true);
  };

  const submitRateModal = () => {
    setRateModalOpen(false);
    openConfirm(rateModalAction, `Rate: $${newRate}`);
  };

  const selectedIds = selected.length > 0 ? `#${selected.join(", #")}` : "";

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Redemption Management</h1>
        {vault && <p className="text-sm text-muted-foreground mt-1 font-mono">{vault.name}</p>}
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
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="text-xs" disabled={selected.length === 0}
              onClick={() => openConfirm(`Bulk Approve at Saved Rate (${selectedIds})`)}>
              Bulk Approve at Saved Rate
            </Button>
            <Button size="sm" variant="outline" className="text-xs" disabled={selected.length === 0}
              onClick={() => openConfirm(`Bulk Approve at Oracle NAV (${selectedIds})`, `Rate: $${CURRENT_NAV}`)}>
              Bulk Approve
            </Button>
            <Button size="sm" variant="outline" className="text-xs" disabled={selected.length === 0}
              onClick={() => openRateModal(`Bulk Approve with New Rate (${selectedIds})`, "Bulk Approve with New Rate")}>
              Bulk Approve with New Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 w-8">
                  <Checkbox checked={selected.length === requests.length && requests.length > 0} onCheckedChange={selectAll} />
                </th>
                <th className="text-left py-2 font-medium">#</th>
                <th className="text-left py-2 font-medium">Address</th>
                <th className="text-right py-2 font-medium">Amount (pUSDC)</th>
                <th className="text-right py-2 font-medium">Requested At</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <>{/* eslint-disable-next-line react/jsx-key */}
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
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className="text-xs"
                            onClick={() => openRateModal(`Safe Approve #${r.id} with New Rate`, `Safe Approve #${r.id}`)}>
                            Safe Approve with New Rate
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs"
                            onClick={() => openRateModal(`Approve #${r.id} with New Rate`, `Approve #${r.id}`)}>
                            Approve with New Rate
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs"
                            onClick={() => openConfirm(`Reject #${r.id}`)}>
                            Reject
                          </Button>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                          <div>• <strong>Safe Approve</strong>: new rate is subject to variation tolerance check</div>
                          <div>• <strong>Approve</strong>: new rate bypasses variation check</div>
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

      {/* ── Redemption Vault Settings ── */}
      <div className="pt-4">
        <h2 className="text-xl font-display font-bold text-foreground mb-4">Redemption Vault Settings</h2>
      </div>

      {/* Wallets */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Wallets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Management Wallet", addr: "0x3f4a...bc12", bal: "$27,430,215.00", full: "0x3f4abc12" },
            { label: "Fee Wallet", addr: "0x7e2d...aa09", bal: "$14,832.50", full: "0x7e2daa09" },
          ].map((w, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground">{w.label}</div>
                <div className="font-mono text-sm text-foreground">{w.addr}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{w.bal}</span>
                <a href={`https://debank.com/profile/${w.full}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View on DeBank ↗</a>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => openConfirm(`Change ${w.label} Address`)}>Change Address</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Request Redeemer */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Request Redeemer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><label className="text-xs text-muted-foreground">Redeemer Address</label><Input defaultValue="0x7e2d...aa09" className="font-mono mt-1 max-w-md" /></div>
          <Button variant="outline" size="sm" onClick={() => openConfirm("Save Redeemer Address")}>Save</Button>
        </CardContent>
      </Card>

      {/* Instant Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Instant Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground">Instant Fee (%)</label><Input defaultValue="0.10" className="font-mono mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Instant Daily Limit (USDC)</label><Input defaultValue="500000" className="font-mono mt-1" /></div>
          </div>
          <Button variant="outline" size="sm" onClick={() => openConfirm("Save Instant Settings")}>Save</Button>
        </CardContent>
      </Card>

      {/* Variation Tolerance */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Variation Tolerance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><label className="text-xs text-muted-foreground">Safe Approval Tolerance (%)</label><Input defaultValue="1.0" className="font-mono mt-1 max-w-xs" /></div>
          <Button variant="outline" size="sm" onClick={() => openConfirm("Save Variation Tolerance")}>Save</Button>
        </CardContent>
      </Card>

      {/* Payment Tokens */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-sm">Payment Tokens</CardTitle>
          <Button size="sm" variant="ghost" className="text-xs text-primary" onClick={() => setShowAddToken(!showAddToken)}>
            <Plus className="h-3 w-3 mr-1" />Add Payment Token
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 font-medium">Token</th>
                <th className="text-left py-2 font-medium">DataFeed</th>
                <th className="text-right py-2 font-medium">Fee</th>
                <th className="text-right py-2 font-medium">Allowance</th>
                <th className="text-center py-2 font-medium">Stable</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 font-mono">USDC</td>
                <td className="py-2 font-mono">0xFeed1…</td>
                <td className="py-2 font-mono text-right">0.10%</td>
                <td className="py-2 font-mono text-right">500,000</td>
                <td className="py-2 text-center text-yield-positive">Yes</td>
                <td className="py-2 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => openConfirm("Edit Fee")}>Edit Fee</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => openConfirm("Edit Allowance")}>Edit Allowance</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2 text-destructive" onClick={() => openConfirm("Remove USDC")}>Remove</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          {showAddToken && (
            <div className="mt-4 p-4 bg-secondary/30 rounded-lg space-y-3 border border-border">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Token Address</label><Input className="font-mono mt-1" placeholder="0x..." /></div>
                <div><label className="text-xs text-muted-foreground">DataFeed</label><Input className="font-mono mt-1" placeholder="0x..." /></div>
                <div><label className="text-xs text-muted-foreground">Fee (%)</label><Input className="font-mono mt-1" placeholder="0.10" /></div>
                <div><label className="text-xs text-muted-foreground">Allowance</label><Input className="font-mono mt-1" placeholder="500000" /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch /><span className="text-xs text-muted-foreground">Stable</span>
              </div>
              <Button size="sm" onClick={() => openConfirm("Add Payment Token")}>Add</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Token (normal style) */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Withdraw Token</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Token</label>
              <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground mt-1">
                <option>USDC</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">Amount</label><Input className="font-mono mt-1" placeholder="0" /></div>
            <div><label className="text-xs text-muted-foreground">Withdraw To</label><Input className="font-mono mt-1" placeholder="0x..." /></div>
          </div>
          <Button variant="outline" onClick={() => openConfirm("Withdraw Token")}>Withdraw</Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-accent" />
            This will transfer assets directly out of the contract. Confirm before proceeding.
          </p>
        </CardContent>
      </Card>

      {/* New Rate Modal */}
      <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">{rateModalLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Redemption Rate (USD per share)</label>
              <Input value={newRate} onChange={(e) => setNewRate(e.target.value)} className="font-mono mt-1" />
            </div>
            <div className="text-xs text-muted-foreground font-mono">Current Oracle NAV: ${CURRENT_NAV}</div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRateModalOpen(false)}>Cancel</Button>
            <Button onClick={submitRateModal}>Confirm Rate & Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal open={confirmOpen} onOpenChange={setConfirmOpen} action={confirmAction} newValue={confirmValue} />
    </div>
  );
}
