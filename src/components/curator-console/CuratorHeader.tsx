import { SidebarTrigger } from "@/components/ui/sidebar";
import { ConnectWalletControl } from "@/components/wallet/ConnectWalletControl";
import { useMatch } from "react-router-dom";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";

function truncateAddr(a: string) {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function CuratorHeader() {
  const vaultMatch = useMatch({ path: "/curator-console/vault/:chainId/:address", end: false });
  const { vault, mTokenAddress, valid } = useCuratorVaultSummary();

  const title = vaultMatch && valid
    ? vault?.name ?? `Vault ${truncateAddr(mTokenAddress)}`
    : "Curator Console";

  const subtitle =
    vaultMatch && valid && vault
      ? `${vault.curator} · ${vault.underlyingSymbol} · ${vault.chainId}`
      : vaultMatch && valid
        ? `Chain ${vaultMatch.params.chainId}`
        : "Select a strategy vault to manage";

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
        <div className="min-w-0 text-left">
          <div className="font-display font-semibold text-sm text-foreground truncate">{title}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">{subtitle}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <ConnectWalletControl connectVariant="outline" />
      </div>
    </header>
  );
}
