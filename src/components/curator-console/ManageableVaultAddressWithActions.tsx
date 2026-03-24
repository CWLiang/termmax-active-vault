import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getExplorerAddressUrl } from "@/lib/explorer";
import { shortAddr } from "@/lib/curatorManageableVaultFormat";

export function ManageableVaultAddressWithActions({
  addr,
  chainId,
}: {
  addr?: string;
  chainId?: number;
}) {
  if (!addr) return <span className="font-mono text-sm text-foreground">—</span>;
  const explorer = Number.isFinite(chainId) ? getExplorerAddressUrl(chainId as number, addr) : undefined;
  return (
    <div className="font-mono text-sm text-foreground flex items-center gap-1.5">
      <span>{shortAddr(addr)}</span>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => {
          void navigator.clipboard.writeText(addr);
          toast.success("Address copied");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      {explorer ? (
        <a href={explorer} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
  );
}
