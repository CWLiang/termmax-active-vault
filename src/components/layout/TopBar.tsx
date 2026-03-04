import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Wallet, Globe } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-foreground">Term</span>
          <span className="font-display font-bold text-primary">Max</span>
          <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">Active Vault</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          <span>Ethereum</span>
        </div>
        <Button variant="outline-primary" size="sm" className="font-mono text-xs">
          <Wallet className="h-3.5 w-3.5" />
          Connect Wallet
        </Button>
      </div>
    </header>
  );
}
