import { useCallback, useMemo } from "react";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";
import { toast } from "sonner";
import { wagmiConfig, supportedWagmiChainIds } from "@/lib/wagmi";

export type WalletChainGatePhase =
  | "invalid_route"
  | "unsupported_chain"
  | "disconnected"
  | "wrong_chain"
  | "ready";

export interface UseWalletChainGateResult {
  phase: WalletChainGatePhase;
  /** True when wallet is connected and on `targetChainId`. */
  canTransact: boolean;
  targetChainName: string;
  chainSupported: boolean;
  connectWallet: () => void;
  switchToTargetChain: () => void;
  isConnecting: boolean;
  isSwitching: boolean;
}

/**
 * Progressive gating for on-chain actions: connect wallet → switch to vault chain → transact.
 */
export function useWalletChainGate(
  targetChainId: number | undefined,
  routeValid: boolean,
): UseWalletChainGateResult {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const chainSupported = useMemo(
    () =>
      typeof targetChainId === "number" &&
      Number.isFinite(targetChainId) &&
      supportedWagmiChainIds.has(targetChainId),
    [targetChainId],
  );

  const targetChainName = useMemo(() => {
    if (targetChainId == null || !Number.isFinite(targetChainId)) return "";
    return (
      wagmiConfig.chains.find((c) => c.id === targetChainId)?.name ?? `Chain ${targetChainId}`
    );
  }, [targetChainId]);

  const connectWallet = useCallback(() => {
    const preferred = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (!preferred) {
      toast.error("No browser wallet found. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    connect(
      { connector: preferred },
      {
        onError: (err) => {
          toast.error(err.message ?? "Failed to connect wallet");
        },
      },
    );
  }, [connect, connectors]);

  const switchToTargetChain = useCallback(() => {
    if (targetChainId != null && Number.isFinite(targetChainId)) {
      switchChain({ chainId: targetChainId });
    }
  }, [switchChain, targetChainId]);

  const phase = useMemo((): WalletChainGatePhase => {
    if (!routeValid || targetChainId == null || !Number.isFinite(targetChainId)) {
      return "invalid_route";
    }
    if (!chainSupported) return "unsupported_chain";
    if (!isConnected) return "disconnected";
    if (walletChainId !== targetChainId) return "wrong_chain";
    return "ready";
  }, [routeValid, targetChainId, chainSupported, isConnected, walletChainId]);

  const canTransact = phase === "ready";

  return {
    phase,
    canTransact,
    targetChainName,
    chainSupported,
    connectWallet,
    switchToTargetChain,
    isConnecting,
    isSwitching,
  };
}
