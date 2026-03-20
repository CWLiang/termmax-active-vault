import { Button } from "@/components/ui/button";
import type { UseWalletChainGateResult } from "@/hooks/useWalletChainGate";
import { Wallet } from "lucide-react";
import type { ReactNode } from "react";

type WalletChainGateOrActionsProps = {
  gate: UseWalletChainGateResult;
  /** Rendered only when `gate.phase === "ready"` (wallet on correct chain). */
  children: ReactNode;
  /** Optional wrapper for the gate button (Connect / Switch) or the `children` row. */
  className?: string;
  /** When vault chain is not in wagmi, hide the default hint (parent UI may already explain). */
  silenceUnsupportedMessage?: boolean;
};

/**
 * Shows Connect Wallet → Switch to {chain} → then renders `children` for on-chain actions.
 */
export function WalletChainGateOrActions({
  gate,
  children,
  className,
  silenceUnsupportedMessage,
}: WalletChainGateOrActionsProps) {
  const {
    phase,
    targetChainName,
    connectWallet,
    switchToTargetChain,
    isConnecting,
    isSwitching,
  } = gate;

  if (phase === "invalid_route") {
    return null;
  }

  if (phase === "unsupported_chain") {
    if (silenceUnsupportedMessage) return null;
    return (
      <p className="text-xs text-muted-foreground">
        This vault&apos;s chain is not configured in the app wallet — add it in{" "}
        <span className="font-mono">src/lib/wagmi.ts</span>.
      </p>
    );
  }

  if (phase === "disconnected") {
    return (
      <div className={className}>
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-8 w-full text-xs sm:w-auto"
          disabled={isConnecting}
          onClick={connectWallet}
        >
          <Wallet className="h-3.5 w-3.5 mr-1.5 shrink-0" />
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  if (phase === "wrong_chain") {
    return (
      <div className={className}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full text-xs sm:w-auto"
          disabled={isSwitching}
          onClick={switchToTargetChain}
        >
          {isSwitching ? "Switching…" : `Switch to ${targetChainName}`}
        </Button>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}
