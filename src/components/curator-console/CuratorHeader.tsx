import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronDown, Clock } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const vaults = [
  { id: "rwa", name: "RWA Enhanced Yield" },
  { id: "tbill", name: "T-Bill Maximizer" },
];

export function CuratorHeader() {
  const [selectedVault, setSelectedVault] = useState(vaults[0]);
  const [connected] = useState(true);
  const [pendingTx] = useState(1);

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="font-display font-semibold text-sm gap-1.5">
            {selectedVault.name}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {vaults.map((v) => (
            <DropdownMenuItem key={v.id} onClick={() => setSelectedVault(v)}>
              {v.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-3">
        {pendingTx > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-accent font-mono bg-accent/10 px-2 py-1 rounded">
            <Clock className="h-3 w-3" />
            ⏳ {pendingTx} transaction pending
          </span>
        )}
        {connected ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">0x1a2b…ef12</span>
            <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Gnosis Safe</span>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive">
              Disconnect
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="font-mono text-xs">
            <Wallet className="h-3.5 w-3.5" />
            Connect Wallet
          </Button>
        )}
      </div>
    </header>
  );
}
