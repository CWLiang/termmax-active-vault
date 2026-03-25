import { toast } from "sonner";
import { getExplorerTxUrl } from "@/lib/explorer";

/** On-chain success toasts: bottom-right placement is set on `<Toaster />`; duration here. */
export const CHAIN_TX_TOAST_DURATION_MS = 3000;

export function toastChainTxSuccess(title: string, chainId: number, txHash: string) {
  const url = getExplorerTxUrl(chainId, txHash);
  toast.success(title, {
    duration: CHAIN_TX_TOAST_DURATION_MS,
    description: (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[11px] leading-snug break-all text-primary hover:underline block mt-1"
      >
        {txHash}
      </a>
    ),
  });
}
