import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmActionModal } from "@/components/curator-console/ConfirmActionModal";
import { isAddress, parseUnits } from "viem";
import { AlertTriangle, Plus } from "lucide-react";

const DEFAULT_INSTANT_FEE = "0.10";
const DEFAULT_INSTANT_DAILY = "500000";
const DEFAULT_VARIATION = "1.0";
const DEFAULT_REDEEMER = "0x7e2d...aa09";

export default function RedemptionVaultPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [showAddToken, setShowAddToken] = useState(false);

  const [redeemerInput, setRedeemerInput] = useState(DEFAULT_REDEEMER);
  const [instantFeeInput, setInstantFeeInput] = useState(DEFAULT_INSTANT_FEE);
  const [instantDailyInput, setInstantDailyInput] = useState(DEFAULT_INSTANT_DAILY);
  const [variationInput, setVariationInput] = useState(DEFAULT_VARIATION);

  const [addTokenAddress, setAddTokenAddress] = useState("");
  const [addTokenDataFeed, setAddTokenDataFeed] = useState("");
  const [addTokenFeeInput, setAddTokenFeeInput] = useState("0.10");
  const [addTokenAllowanceInput, setAddTokenAllowanceInput] = useState("500000");
  const [addTokenStable, setAddTokenStable] = useState(false);

  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [withdrawToAddress, setWithdrawToAddress] = useState("");

  const openConfirm = (action: string) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const redeemerDirty = redeemerInput !== DEFAULT_REDEEMER;
  const instantSettingsDirty =
    instantFeeInput !== DEFAULT_INSTANT_FEE || instantDailyInput !== DEFAULT_INSTANT_DAILY;
  const variationDirty = variationInput !== DEFAULT_VARIATION;

  const addPaymentTokenCanSubmit = useMemo(() => {
    if (!isAddress(addTokenAddress.trim()) || !isAddress(addTokenDataFeed.trim())) return false;
    const feePct = Number(addTokenFeeInput);
    if (!Number.isFinite(feePct) || feePct < 0) return false;
    try {
      parseUnits(addTokenAllowanceInput || "0", 18);
    } catch {
      return false;
    }
    return true;
  }, [addTokenAddress, addTokenDataFeed, addTokenFeeInput, addTokenAllowanceInput]);

  const withdrawDemoCanSubmit = useMemo(() => {
    if (!isAddress(withdrawToAddress.trim())) return false;
    try {
      const amountRaw = parseUnits(withdrawAmountInput || "0", 18);
      return amountRaw > 0n;
    } catch {
      return false;
    }
  }, [withdrawToAddress, withdrawAmountInput]);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Redemption Vault Settings</h1>
      </motion.div>

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
          <div>
            <label className="text-xs text-muted-foreground">Redeemer Address</label>
            <Input value={redeemerInput} onChange={(e) => setRedeemerInput(e.target.value)} className="font-mono mt-1 max-w-md" />
          </div>
          <Button variant="outline" size="sm" disabled={!redeemerDirty} onClick={() => openConfirm("Save Redeemer Address")}>Save</Button>
        </CardContent>
      </Card>

      {/* Instant Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Instant Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Instant Fee (%)</label>
              <Input value={instantFeeInput} onChange={(e) => setInstantFeeInput(e.target.value)} className="font-mono mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Instant Daily Limit (USDC)</label>
              <Input value={instantDailyInput} onChange={(e) => setInstantDailyInput(e.target.value)} className="font-mono mt-1" />
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={!instantSettingsDirty} onClick={() => openConfirm("Save Instant Settings")}>Save</Button>
        </CardContent>
      </Card>

      {/* Variation Tolerance */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Variation Tolerance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Safe Approval Tolerance (%)</label>
            <Input value={variationInput} onChange={(e) => setVariationInput(e.target.value)} className="font-mono mt-1 max-w-xs" />
          </div>
          <Button variant="outline" size="sm" disabled={!variationDirty} onClick={() => openConfirm("Save Variation Tolerance")}>Save</Button>
        </CardContent>
      </Card>

      {/* Underlying Token Management */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-sm">Underlying Token Management</CardTitle>
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
                <div><label className="text-xs text-muted-foreground">Token Address</label><Input value={addTokenAddress} onChange={(e) => setAddTokenAddress(e.target.value)} className="font-mono mt-1" placeholder="0x..." /></div>
                <div><label className="text-xs text-muted-foreground">DataFeed</label><Input value={addTokenDataFeed} onChange={(e) => setAddTokenDataFeed(e.target.value)} className="font-mono mt-1" placeholder="0x..." /></div>
                <div><label className="text-xs text-muted-foreground">Fee (%)</label><Input value={addTokenFeeInput} onChange={(e) => setAddTokenFeeInput(e.target.value)} className="font-mono mt-1" placeholder="0.10" /></div>
                <div><label className="text-xs text-muted-foreground">Allowance</label><Input value={addTokenAllowanceInput} onChange={(e) => setAddTokenAllowanceInput(e.target.value)} className="font-mono mt-1" placeholder="500000" /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={addTokenStable} onCheckedChange={(v) => setAddTokenStable(Boolean(v))} />
                <span className="text-xs text-muted-foreground">Stable</span>
              </div>
              <Button size="sm" disabled={!addPaymentTokenCanSubmit} onClick={() => openConfirm("Add Payment Token")}>Add</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Token (danger) */}
      <Card className="bg-card border-destructive/50">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm text-destructive">Withdraw Token (Danger Zone)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Token</label>
              <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground mt-1">
                <option>USDC</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <Input value={withdrawAmountInput} onChange={(e) => setWithdrawAmountInput(e.target.value)} className="font-mono mt-1" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Withdraw To</label>
              <Input value={withdrawToAddress} onChange={(e) => setWithdrawToAddress(e.target.value)} className="font-mono mt-1" placeholder="0x..." />
            </div>
          </div>
          <Button variant="destructive" disabled={!withdrawDemoCanSubmit} onClick={() => openConfirm("Withdraw Token")}>Withdraw</Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            This will transfer assets directly out of the contract. Confirm before proceeding.
          </p>
        </CardContent>
      </Card>

      <ConfirmActionModal open={confirmOpen} onOpenChange={setConfirmOpen} action={confirmAction} />
    </div>
  );
}
