import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/formatAddress";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

type ConnectWalletControlProps = {
  /** Button style for the primary "Connect Wallet" action */
  connectVariant?: ButtonVariant;
  connectClassName?: string;
};

export function ConnectWalletControl({
  connectVariant = "outline-primary",
  connectClassName,
}: ConnectWalletControlProps) {
  const { address, isConnected, connector, status } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
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
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {connector?.name ? (
          <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 max-w-[120px] truncate">
            {connector.name}
          </span>
        ) : null}
        <span className="text-xs font-mono text-muted-foreground">{shortenAddress(address)}</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive"
          type="button"
          onClick={() => disconnect()}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  const connecting = isPending || status === "connecting";

  return (
    <Button
      variant={connectVariant}
      size="sm"
      type="button"
      className={connectClassName ?? "font-mono text-xs"}
      disabled={connecting}
      onClick={handleConnect}
    >
      <Wallet className="h-3.5 w-3.5" />
      {connecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}
