import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { isAddress } from "viem";
import { toast } from "sonner";
import { getExplorerAddressUrl } from "@/lib/explorer";

interface ConfirmActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  newValue?: string;
  /** Shown under the human-readable `newValue` (e.g. raw int256 for contract). */
  newValueSecondary?: string;
  /** Full `0x` contract address when known (display shortened; copy & explorer use this). */
  contractAddress?: string;
  /** Full `0x` wallet address when known. */
  walletAddress?: string;
  /** Shown for the wallet row when there is no valid `walletAddress` (e.g. "Not connected"). */
  walletFallback?: string;
  /** Enables explorer links for contract + wallet when addresses are valid. */
  explorerChainId?: number | null;
  /** @deprecated Use `contractAddress` (full), `walletAddress`, and `walletFallback` instead. */
  wallet?: string;
  /** When set, Confirm runs this instead of the demo timer (on-chain flow). */
  onConfirm?: () => Promise<void>;
  /** Label for the `newValue` row (default: "New Value"). */
  newValueLabel?: string;
  /** Extra lines under the header (e.g. batched feed updates). */
  summaryLines?: string[];
  /** Shown while `onConfirm` is in flight. */
  pendingMessage?: string;
}

function shortAddr(a: string) {
  const t = a.trim();
  return t.length > 12 ? `${t.slice(0, 6)}…${t.slice(-4)}` : t;
}

function AddressRowWithActions({
  label,
  fullAddress,
  explorerChainId,
}: {
  label: string;
  fullAddress: string;
  explorerChainId: number | null | undefined;
}) {
  const trimmed = fullAddress.trim();
  const ok = isAddress(trimmed);
  const explorerUrl =
    ok && explorerChainId != null ? getExplorerAddressUrl(explorerChainId, trimmed) : null;

  return (
    <div className="flex justify-between gap-2 items-start">
      <span className="text-muted-foreground shrink-0 pt-0.5">{label}</span>
      <div className="flex items-start gap-1.5 min-w-0 justify-end max-w-[min(100%,18rem)]">
        <span className="font-mono text-xs text-right break-all">{ok ? shortAddr(trimmed) : trimmed}</span>
        {ok ? (
          <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              aria-label={`Copy ${label}`}
              onClick={() => {
                void navigator.clipboard.writeText(trimmed);
                toast.success("Copied address");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors inline-flex"
                aria-label={`View ${label} on block explorer`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmActionModal({
  open,
  onOpenChange,
  action,
  newValue,
  newValueSecondary,
  newValueLabel = "New Value",
  contractAddress: contractAddressProp,
  walletAddress: walletAddressProp,
  walletFallback,
  explorerChainId,
  wallet: walletLegacy,
  onConfirm,
  summaryLines,
  pendingMessage = "Submit in your wallet and wait for the transaction to be mined.",
}: ConfirmActionModalProps) {
  const contractAddress = contractAddressProp ?? "0x7a3f…cd91";
  const walletAddress = walletAddressProp;
  const walletRowText =
    walletAddress && isAddress(walletAddress.trim())
      ? null
      : (walletFallback ?? walletLegacy ?? "Not connected");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorText(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (onConfirm) {
      setStatus("pending");
      setErrorText(null);
      void onConfirm()
        .then(() => {
          setStatus("success");
          setTimeout(() => {
            setStatus("idle");
            onOpenChange(false);
          }, 1500);
        })
        .catch((e: unknown) => {
          const msg =
            e instanceof Error
              ? e.message.length > 200
                ? `${e.message.slice(0, 200)}…`
                : e.message
              : "Transaction failed";
          setErrorText(msg);
          setStatus("error");
        });
      return;
    }

    setStatus("pending");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        onOpenChange(false);
      }, 1500);
    }, 2000);
  };

  const blockDismiss = status === "pending";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && blockDismiss) return;
        if (!o) {
          setStatus("idle");
          setErrorText(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="bg-card border-border"
        onPointerDownOutside={(e) => {
          if (blockDismiss) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (blockDismiss) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display">Confirm Action</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Action</span>
            <span className="font-mono text-right break-all">{action}</span>
          </div>
          {newValue ? (
            <div className="space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{newValueLabel}</span>
                <span className="font-mono text-right break-all min-w-0">{newValue}</span>
              </div>
              {newValueSecondary ? (
                <p className="text-[11px] font-mono text-muted-foreground text-right break-all leading-snug">
                  {newValueSecondary}
                </p>
              ) : null}
            </div>
          ) : null}
          {summaryLines?.length ? (
            <ul className="text-xs font-mono text-muted-foreground list-disc pl-4 space-y-1">
              {summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {isAddress(contractAddress.trim()) ? (
            <AddressRowWithActions
              label="Contract"
              fullAddress={contractAddress.trim()}
              explorerChainId={explorerChainId}
            />
          ) : (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Contract</span>
              <span className="font-mono text-xs text-right break-all">{contractAddress}</span>
            </div>
          )}
          {walletAddress && isAddress(walletAddress.trim()) ? (
            <AddressRowWithActions
              label="Wallet"
              fullAddress={walletAddress.trim()}
              explorerChainId={explorerChainId}
            />
          ) : (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Wallet</span>
              <span className="font-mono text-xs text-right break-all">{walletRowText}</span>
            </div>
          )}
        </div>

        {status === "pending" && (
          <div className="flex items-center gap-2 text-accent text-sm p-3 bg-accent/10 rounded-lg">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            {pendingMessage}
          </div>
        )}
        {status === "success" && (
          <div className="flex items-center gap-2 text-yield-positive text-sm p-3 bg-yield-positive/10 rounded-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Success. UI updated.
          </div>
        )}
        {status === "error" && (
          <div className="flex items-start gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="break-words">{errorText ?? "Transaction failed: execution reverted."}</span>
          </div>
        )}

        {(status === "idle" || status === "error") && (
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setStatus("idle");
                setErrorText(null);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Submit</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
