import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";
import { useVaultDetailQuery } from "@/hooks/queries/useVaultDetailQuery";
import { getExplorerAddressUrl } from "@/lib/explorer";
import { toastChainTxSuccess } from "@/lib/toastChainTx";
import { supportedWagmiChainIds } from "@/lib/wagmi";
import { mTokenAbi } from "@/abis/mToken";
import { useWalletChainGate } from "@/hooks/useWalletChainGate";
import { WalletChainGateOrActions } from "@/components/wallet/WalletChainGateOrActions";

/**
 * Demo wallets until API exposes curator addresses.
 * Use full `0x` addresses so DeBank profile links resolve.
 */
const DEMO_CURATOR_WALLETS = {
  deposit: {
    management: {
      address: "0x1111111111111111111111111111111111111111",
      balance: "$27,430,215.00",
    },
    fee: {
      address: "0x2222222222222222222222222222222222222222",
      balance: "$14,832.50",
    },
  },
  redemption: {
    management: {
      address: "0x3333333333333333333333333333333333333333",
      balance: "$27,430,215.00",
    },
    fee: {
      address: "0x4444444444444444444444444444444444444444",
      balance: "$14,832.50",
    },
  },
} as const;

function formatUSD(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatTxError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message;
    if (/user rejected|denied|cancel/i.test(m)) return "Transaction cancelled";
    return m.length > 140 ? `${m.slice(0, 140)}…` : m;
  }
  return "Transaction failed";
}

function VaultContractAddressRow({
  label,
  address,
  chainId,
  copyToast,
}: {
  label: string;
  address: string | undefined;
  chainId: number;
  copyToast: string;
}) {
  const trimmed = address?.trim() ?? "";
  const hasAddr = isAddress(trimmed);
  const explorerUrl = hasAddr ? getExplorerAddressUrl(chainId, trimmed) : "#";

  return (
    <div className="py-3 border-b border-border last:border-0 last:pb-0 first:pt-0">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-sm font-mono text-foreground break-all leading-snug" title={hasAddr ? trimmed : undefined}>
          {hasAddr ? trimmed : "—"}
        </span>
        {hasAddr ? (
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            <button
              type="button"
              aria-label={`Copy ${label} address`}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              onClick={() => {
                void navigator.clipboard.writeText(trimmed);
                toast.success(copyToast);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`View ${label} on block explorer`}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CuratorWalletRow({
  label,
  address,
  balance,
  copyToast,
}: {
  label: string;
  address: string;
  balance: string;
  copyToast: string;
}) {
  const trimmed = address.trim();
  const hasAddr = isAddress(trimmed);
  const debankUrl = hasAddr ? `https://debank.com/profile/${trimmed}` : null;

  return (
    <div className="py-3 border-b border-border last:border-0 last:pb-0 first:pt-0">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-start gap-2 flex-wrap min-w-0">
          <span
            className="text-sm font-mono text-foreground break-all leading-snug"
            title={hasAddr ? trimmed : undefined}
          >
            {hasAddr ? trimmed : "—"}
          </span>
          {hasAddr ? (
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              <button
                type="button"
                aria-label={`Copy ${label} address`}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                onClick={() => {
                  void navigator.clipboard.writeText(trimmed);
                  toast.success(copyToast);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <span className="font-mono text-sm text-foreground">{balance}</span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">(demo)</span>
          </div>
          {debankUrl ? (
            <a
              href={debankUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline whitespace-nowrap"
            >
              View on DeBank ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VaultSidePanel({
  title,
  contractLabel,
  contractAddress,
  chainId,
  vaultDetailLoading,
  vaultDetailError,
  management,
  fee,
}: {
  title: string;
  contractLabel: string;
  contractAddress: string | undefined;
  chainId: number;
  vaultDetailLoading: boolean;
  vaultDetailError: boolean;
  management: { address: string; balance: string };
  fee: { address: string; balance: string };
}) {
  const copyToast =
    contractLabel === "Deposit vault" ? "Deposit vault address copied" : "Redemption vault address copied";

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {vaultDetailLoading ? (
          <p className="text-xs text-muted-foreground">Loading contract address…</p>
        ) : vaultDetailError ? (
          <p className="text-xs text-destructive mb-3">Could not load vault detail for this address.</p>
        ) : null}
        {!(vaultDetailLoading || vaultDetailError) && Number.isFinite(chainId) ? (
          <VaultContractAddressRow
            label={contractLabel}
            address={contractAddress}
            chainId={chainId}
            copyToast={copyToast}
          />
        ) : null}
        <CuratorWalletRow
          label="Management wallet"
          address={management.address}
          balance={management.balance}
          copyToast="Management wallet address copied"
        />
        <CuratorWalletRow
          label="Fee wallet"
          address={fee.address}
          balance={fee.balance}
          copyToast="Fee wallet address copied"
        />
      </CardContent>
    </Card>
  );
}

export default function VaultOverviewPage() {
  const { vault, mTokenAddress, chainId, valid } = useCuratorVaultSummary();
  const publicClient = usePublicClient({ chainId });
  const [txBusy, setTxBusy] = useState(false);
  const gate = useWalletChainGate(valid ? chainId : undefined, valid);

  const chainSupported = typeof chainId === "number" && supportedWagmiChainIds.has(chainId);
  const mToken = mTokenAddress as Address;

  const {
    data: paused,
    isLoading: pausedLoading,
    isError: pausedReadError,
    refetch: refetchPaused,
  } = useReadContract({
    address: mToken,
    abi: mTokenAbi,
    functionName: "paused",
    chainId,
    query: {
      enabled: Boolean(valid && mTokenAddress && chainSupported),
    },
  });

  const { mutateAsync: writeMToken, isPending: writePending } = useWriteContract();

  const {
    data: vaultDetail,
    isLoading: vaultDetailLoading,
    isError: vaultDetailError,
  } = useVaultDetailQuery(valid ? chainId : undefined, valid ? mTokenAddress : undefined);

  const runPauseToggle = useCallback(
    async (action: "pause" | "unpause") => {
      if (!chainSupported || !mTokenAddress) {
        toast.error("This vault chain is not configured in the app wallet (wagmi).");
        return;
      }
      if (!gate.canTransact) {
        toast.error("Connect wallet and switch to the vault network.");
        return;
      }
      setTxBusy(true);
      try {
        const hash = await writeMToken({
          address: mToken,
          abi: mTokenAbi,
          functionName: action,
          chainId,
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        if (typeof chainId === "number") {
          toastChainTxSuccess(
            action === "pause" ? "mToken paused" : "mToken unpaused",
            chainId,
            hash,
          );
        }
        await refetchPaused();
      } catch (e) {
        toast.error(formatTxError(e));
      } finally {
        setTxBusy(false);
      }
    },
    [chainId, chainSupported, gate.canTransact, mToken, mTokenAddress, publicClient, refetchPaused, writeMToken],
  );

  const tvl = vault?.tvl ?? 0;
  const cap = vault?.capacity ?? 0;
  const utilizationPct = cap > 0 ? Math.min(100, (tvl / cap) * 100) : 0;
  const explorer = chainId && mTokenAddress ? getExplorerAddressUrl(chainId, mTokenAddress) : "#";

  const title = vault?.name ?? "Vault overview";
  const subtitle = vault
    ? `${vault.curator} · ${vault.trackRecordDays}d track record · ${vault.underlyingSymbol}`
    : "Vault not found in API list — check chain / address";

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span>{shortAddr(mTokenAddress)}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(mTokenAddress);
                toast.success("Copied");
              }}
            >
              <Copy className="h-3 w-3 hover:text-foreground" />
            </button>
            <a href={explorer} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3 hover:text-foreground" />
            </a>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </motion.div>

      {/* Stat cards - 3 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">TVL</div>
              <div className="text-xl font-mono font-bold text-foreground mt-1">{vault ? formatUSD(tvl) : "—"}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">NAV / share</div>
              <div className="text-xl font-mono font-bold text-foreground mt-1">
                {vault ? `${vault.navPerShare.toFixed(4)} ${vault.underlyingSymbol}` : "—"}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">TVL / Capacity (USD)</div>
              <div className="text-xl font-mono font-bold text-foreground mt-1">
                {vault ? (
                  <>
                    {formatUSD(tvl)} <span className="text-sm text-muted-foreground font-normal">/ {formatUSD(cap)}</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
              {vault && cap > 0 ? (
                <>
                  <Progress value={utilizationPct} className="h-1.5 mt-2" />
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{utilizationPct.toFixed(0)}% utilized</div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Deposit vs redemption: each panel = vault contract + management + fee wallets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VaultSidePanel
          title="Deposit vault"
          contractLabel="Deposit vault"
          contractAddress={vaultDetail?.depositVaultAddress}
          chainId={chainId}
          vaultDetailLoading={vaultDetailLoading}
          vaultDetailError={vaultDetailError}
          management={DEMO_CURATOR_WALLETS.deposit.management}
          fee={DEMO_CURATOR_WALLETS.deposit.fee}
        />
        <VaultSidePanel
          title="Redemption vault"
          contractLabel="Redemption vault"
          contractAddress={vaultDetail?.redemptionVaultAddress}
          chainId={chainId}
          vaultDetailLoading={vaultDetailLoading}
          vaultDetailError={vaultDetailError}
          management={DEMO_CURATOR_WALLETS.redemption.management}
          fee={DEMO_CURATOR_WALLETS.redemption.fee}
        />
      </div>

      {/* Token status — mToken pause / unpause (on-chain) */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Token Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 pb-4 border-b border-border">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground mb-1">mToken contract</div>
              <div className="flex items-start gap-2 flex-wrap">
                <span
                  className="text-sm font-mono text-foreground break-all leading-snug"
                  title={mTokenAddress || undefined}
                >
                  {mTokenAddress || "—"}
                </span>
                {mTokenAddress ? (
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <button
                      type="button"
                      aria-label="Copy mToken address"
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      onClick={() => {
                        void navigator.clipboard.writeText(mTokenAddress);
                        toast.success("mToken address copied");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={explorer}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View mToken on block explorer"
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors inline-flex"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-mono text-foreground">
              {vault?.underlyingSymbol ?? "mToken"}:{" "}
              {pausedLoading ? (
                <span className="text-muted-foreground">…</span>
              ) : pausedReadError || !chainSupported ? (
                <span className="text-muted-foreground">—</span>
              ) : paused ? (
                <span className="text-destructive">Paused</span>
              ) : (
                <span className="text-yield-positive">Active</span>
              )}
              {pausedReadError ? (
                <span className="block text-[10px] text-muted-foreground font-sans mt-0.5">
                  Could not read paused() — check RPC / ABI
                </span>
              ) : null}
              {!chainSupported && valid ? (
                <span className="block text-[10px] text-muted-foreground font-sans mt-0.5">
                  Chain {chainId} not in wallet config — add it in wagmi to use pause controls.
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <WalletChainGateOrActions gate={gate} silenceUnsupportedMessage>
                {pausedLoading ? (
                  <span className="text-xs text-muted-foreground">Loading on-chain status…</span>
                ) : pausedReadError ? (
                  <span className="text-xs text-muted-foreground">Fix RPC / contract to transact</span>
                ) : paused ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="text-xs"
                    disabled={writePending || txBusy}
                    onClick={() => void runPauseToggle("unpause")}
                  >
                    {writePending || txBusy ? "Submit…" : `Unpause ${vault?.underlyingSymbol ?? "mToken"}`}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    disabled={writePending || txBusy}
                    onClick={() => void runPauseToggle("pause")}
                  >
                    {writePending || txBusy ? "Submit…" : `Pause ${vault?.underlyingSymbol ?? "mToken"}`}
                  </Button>
                )}
              </WalletChainGateOrActions>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
