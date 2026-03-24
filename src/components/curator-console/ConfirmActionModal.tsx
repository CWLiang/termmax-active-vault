import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { isAddress } from "viem";
import { toast } from "sonner";
import { getExplorerAddressUrl, getExplorerTxUrl } from "@/lib/explorer";
import { showConfirmModalContractDetails } from "@/lib/confirm-modal-env";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";

/** One row in the confirmation summary: readable text first, optional raw calldata note below. */
export type ConfirmSummaryRow = {
  human: string;
  contractNote?: string;
};

/** Label + value rows (e.g. Amount / Recipient) shown like the Action row — no parent "Summary" label. */
export type ConfirmModalValueRow = {
  label: string;
  value: string;
};

export type ConfirmSuccessTxRow = {
  label: string;
  hash: string;
};

interface ConfirmActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Human-readable title for what the user is doing (not a raw function name). */
  action: string;
  /**
   * Dev-only footnote under Action: function name and encoded args (see `showConfirmModalContractDetails`).
   */
  actionContractNote?: string;
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
  /** Step-by-step summary: human-readable lines with optional contract call footnotes. */
  summaryRows?: ConfirmSummaryRow[];
  /** When set, shown as primary label/value rows instead of `newValue` + `newValueLabel` (no "Summary" header). */
  valueRows?: ConfirmModalValueRow[];
  /** Shown while `onConfirm` is in flight. */
  pendingMessage?: string;
  /** When set with `total > 1`, shows a progress bar for multi-step wallet flows. */
  batchProgress?: { current: number; total: number } | null;
  /** Successful tx hashes to show after submission completes. */
  successTxRows?: ConfirmSuccessTxRow[];
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
  actionContractNote,
  newValue,
  newValueSecondary,
  newValueLabel = "New Value",
  contractAddress: contractAddressProp,
  walletAddress: walletAddressProp,
  walletFallback,
  explorerChainId,
  wallet: walletLegacy,
  onConfirm,
  summaryRows,
  valueRows,
  pendingMessage = "Submit in your wallet and wait for the transaction to be mined.",
  batchProgress = null,
  successTxRows = [],
}: ConfirmActionModalProps) {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const { connectAsync, connectors, isPending: isConnectPending } = useConnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const contractAddress = contractAddressProp ?? "0x7a3f…cd91";
  const walletAddress = walletAddressProp;
  const walletRowText =
    walletAddress && isAddress(walletAddress.trim())
      ? null
      : (walletFallback ?? walletLegacy ?? "Not connected");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  /** True once this modal opening had a real submit handler (prevents false "Preview only" after parent state clears). */
  const [hadConfirmHandler, setHadConfirmHandler] = useState(false);
  const wrongChain =
    isConnected &&
    explorerChainId != null &&
    Number.isFinite(explorerChainId) &&
    walletChainId !== explorerChainId;
  const showContractDetails = showConfirmModalContractDetails();
  const validSuccessTxRows = successTxRows.filter(
    (row) =>
      row.label.trim().length > 0 &&
      /^0x([A-Fa-f0-9]{64})$/.test(row.hash.trim()),
  );

  const handleConnectWallet = async () => {
    const connector = connectors[0];
    if (!connector) {
      toast.error("No wallet connector available.");
      return;
    }
    try {
      await connectAsync({ connector });
      toast.success("Wallet connected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to connect wallet";
      toast.error(msg.length > 140 ? `${msg.slice(0, 140)}…` : msg);
    }
  };

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorText(null);
      setHadConfirmHandler(Boolean(onConfirm));
    }
  }, [open]);

  useEffect(() => {
    if (open && onConfirm) setHadConfirmHandler(true);
  }, [open, onConfirm]);

  const handleConfirm = () => {
    if (onConfirm) {
      setStatus("pending");
      setErrorText(null);
      void onConfirm()
        .then(() => {
          setStatus("success");
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
    }, 2000);
  };

  const blockDismiss = status === "pending";
  const isPreviewOnly = !onConfirm && !hadConfirmHandler;

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
          <div className="space-y-1">
            <div className="flex justify-between gap-2 items-start">
              <span className="text-muted-foreground shrink-0 pt-0.5">Action</span>
              <span className="text-foreground text-right break-words min-w-0 max-w-[min(100%,20rem)] leading-snug">
                {action}
              </span>
            </div>
            {showContractDetails && actionContractNote ? (
              <p className="text-[11px] font-mono text-muted-foreground text-right break-all leading-snug">
                {/^contract\b/i.test(actionContractNote.trim())
                  ? actionContractNote
                  : `Contract: ${actionContractNote}`}
              </p>
            ) : null}
          </div>
          {valueRows != null && valueRows.length > 0 ? (
            <div className="space-y-2">
              {valueRows.map((row, i) => (
                <div key={`${row.label}-${i}`} className="flex justify-between gap-2 items-start">
                  <span className="text-muted-foreground shrink-0 pt-0.5">{row.label}</span>
                  <span className="text-foreground text-right break-words min-w-0 max-w-[min(100%,20rem)] leading-snug whitespace-pre-line">
                    {row.value}
                  </span>
                </div>
              ))}
              {showContractDetails && newValueSecondary ? (
                <p className="text-[11px] font-mono text-muted-foreground text-right break-all leading-snug">
                  {/^contract\b/i.test(newValueSecondary.trim())
                    ? newValueSecondary
                    : `Contract: ${newValueSecondary}`}
                </p>
              ) : null}
            </div>
          ) : newValue ? (
            <div className="space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{newValueLabel}</span>
                <span
                  className={`text-right break-all min-w-0 whitespace-pre-line ${
                    newValueLabel === "New NAV" || newValueLabel === "New Price" ? "font-mono" : "text-foreground"
                  }`}
                >
                  {newValue}
                </span>
              </div>
              {showContractDetails && newValueSecondary ? (
                <p className="text-[11px] font-mono text-muted-foreground text-right break-all leading-snug">
                  {/^contract\b/i.test(newValueSecondary.trim())
                    ? newValueSecondary
                    : `Contract: ${newValueSecondary}`}
                </p>
              ) : null}
            </div>
          ) : null}
          {summaryRows?.length ? (
            <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2.5 space-y-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                What will change
              </div>
              <ul className="space-y-2.5 list-none pl-0">
                {summaryRows.map((row, i) => (
                  <li key={`${i}-${row.human.slice(0, 24)}`} className="space-y-1">
                    <div className="text-sm text-foreground leading-snug">{row.human}</div>
                    {showContractDetails && row.contractNote ? (
                      <p className="text-[10px] font-mono text-muted-foreground/85 leading-snug pl-0 border-l-2 border-border/80 pl-2">
                        Contract: {row.contractNote}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
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
              label="Sender"
              fullAddress={walletAddress.trim()}
              explorerChainId={explorerChainId}
            />
          ) : (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Sender</span>
              <span className="font-mono text-xs text-right break-all">{walletRowText}</span>
            </div>
          )}
          {isPreviewOnly ? (
            <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2">
              <span className="text-xs font-medium text-accent">Preview only</span>
              <p className="text-xs text-muted-foreground mt-1">
                This confirmation is a UI preview and will not submit an on-chain transaction.
              </p>
            </div>
          ) : null}
        </div>

        {status === "pending" && (
          <div className="space-y-2 text-accent text-sm p-3 bg-accent/10 rounded-lg">
            <div className="space-y-1.5">
              <div className="flex justify-between gap-2 text-[11px] font-medium text-accent/95 uppercase tracking-wide">
                <span>
                  {batchProgress != null && batchProgress.total > 1
                    ? "Signing progress"
                    : "Transaction progress"}
                </span>
                {batchProgress != null && batchProgress.total > 1 ? (
                  <span className="font-mono tabular-nums normal-case">
                    {Math.min(Math.max(batchProgress.current, 1), batchProgress.total)} / {batchProgress.total}
                  </span>
                ) : null}
              </div>
              <Progress
                className="h-2 bg-accent/20"
                value={
                  batchProgress != null && batchProgress.total > 1
                    ? Math.min(
                        100,
                        Math.round(
                          (100 * Math.min(Math.max(batchProgress.current, 1), batchProgress.total)) /
                            batchProgress.total,
                        ),
                      )
                    : 45
                }
              />
            </div>
            <div className="flex items-start gap-2">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin mt-0.5" />
              <span className="leading-snug min-w-0">{pendingMessage}</span>
            </div>
          </div>
        )}
        {status === "success" && (
          <div className="space-y-2 text-yield-positive text-sm p-3 bg-yield-positive/10 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Success</span>
            </div>
            {validSuccessTxRows.length > 0 ? (
              <div className="space-y-1.5">
                {validSuccessTxRows.map((row, i) => {
                  const txHash = row.hash.trim();
                  const explorerUrl =
                    explorerChainId != null ? getExplorerTxUrl(explorerChainId, txHash) : null;
                  return (
                    <div key={`${txHash}-${i}`} className="flex justify-between gap-2 items-start">
                      <span className="text-muted-foreground shrink-0 pt-0.5">{row.label}</span>
                      <div className="flex items-start gap-1.5 min-w-0 justify-end max-w-[min(100%,18rem)]">
                        <span className="font-mono text-xs text-right break-all">{shortAddr(txHash)}</span>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
                          aria-label={`Copy ${row.label}`}
                          onClick={() => {
                            void navigator.clipboard.writeText(txHash);
                            toast.success("Copied tx hash");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {explorerUrl ? (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors inline-flex shrink-0"
                            aria-label="View transaction on block explorer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
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
            {!isConnected ? (
              <Button onClick={() => void handleConnectWallet()} disabled={isConnectPending}>
                {isConnectPending ? "Connecting…" : "Connect wallet"}
              </Button>
            ) : wrongChain ? (
              <Button
                onClick={() => switchChain({ chainId: explorerChainId! })}
                disabled={isSwitchingChain}
              >
                {isSwitchingChain ? "Switching…" : `Switch to chain ${explorerChainId}`}
              </Button>
            ) : (
              <Button onClick={handleConfirm}>Submit</Button>
            )}
          </DialogFooter>
        )}

        {status === "success" && (
          <DialogFooter>
            <Button
              onClick={() => {
                setStatus("idle");
                setErrorText(null);
                onOpenChange(false);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
