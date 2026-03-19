import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface ConfirmActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  newValue?: string;
  contractAddress?: string;
  wallet?: string;
}

export function ConfirmActionModal({
  open, onOpenChange, action, newValue, contractAddress = "0x7a3f…cd91",
  wallet = "0x1a2b…ef12 (Gnosis Safe)",
}: ConfirmActionModalProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  const handleConfirm = () => {
    setStatus("pending");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        onOpenChange(false);
      }, 1500);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setStatus("idle"); onOpenChange(o); }}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Confirm Action</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Action</span><span className="font-mono">{action}</span></div>
          {newValue && <div className="flex justify-between"><span className="text-muted-foreground">New Value</span><span className="font-mono">{newValue}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Contract</span><span className="font-mono text-xs">{contractAddress}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Wallet</span><span className="font-mono text-xs">{wallet}</span></div>
        </div>

        {status === "pending" && (
          <div className="flex items-center gap-2 text-accent text-sm p-3 bg-accent/10 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            Transaction submitted. Waiting for Safe signature confirmation.
          </div>
        )}
        {status === "success" && (
          <div className="flex items-center gap-2 text-yield-positive text-sm p-3 bg-yield-positive/10 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            Success. UI updated.
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
            <XCircle className="h-4 w-4" />
            Transaction failed: execution reverted.
          </div>
        )}

        {status === "idle" && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm}>Confirm & Send</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
