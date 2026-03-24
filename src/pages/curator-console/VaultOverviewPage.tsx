import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, isAddress, type Address } from "viem";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";
import { useVaultDetailQuery } from "@/hooks/queries/useVaultDetailQuery";
import { getExplorerAddressUrl } from "@/lib/explorer";
import { toastChainTxSuccess } from "@/lib/toastChainTx";
import { supportedWagmiChainIds } from "@/lib/wagmi";
import { mTokenAbi } from "@/abis/mToken";
import { manageableVaultAbi } from "@/abis/manageableVault";
import { depositVaultAbi } from "@/abis/depositVault";
import { useWalletChainGate } from "@/hooks/useWalletChainGate";
import { WalletChainGateOrActions } from "@/components/wallet/WalletChainGateOrActions";
import { formatDisplayNumber, formatNumberKmb, formatUsdCompact } from "@/lib/formatNumbers";

function formatUSD(value: number) {
  return formatUsdCompact(value, "detail");
}

function formatTokenAmount(raw: bigint | undefined, decimals: number | undefined) {
  if (raw == null) return "—";
  const d = decimals ?? 18;
  const n = Number(formatUnits(raw, d));
  if (!Number.isFinite(n)) return "—";
  return formatNumberKmb(n, { maxFracBelow1000: 4, suffixMaxFrac: 2 });
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
  loading,
  readError,
  copyToast,
}: {
  label: string;
  address: string | undefined;
  loading: boolean;
  readError: boolean;
  copyToast: string;
}) {
  const trimmed = address?.trim() ?? "";
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
            {loading ? "Loading…" : hasAddr ? trimmed : "—"}
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
          {readError ? (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              Read failed
            </span>
          ) : null}
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
}: {
  title: string;
  contractLabel: string;
  contractAddress: string | undefined;
  chainId: number;
  vaultDetailLoading: boolean;
  vaultDetailError: boolean;
}) {
  const copyToast =
    contractLabel === "Deposit vault" ? "Deposit vault address copied" : "Redemption vault address copied";
  const vaultAddress = contractAddress as Address;
  const canReadReceivers = Number.isFinite(chainId) && isAddress(contractAddress ?? "");

  const {
    data: tokenReceiver,
    isLoading: tokenReceiverLoading,
    isError: tokenReceiverError,
  } = useReadContract({
    address: vaultAddress,
    abi: manageableVaultAbi,
    functionName: "tokensReceiver",
    chainId,
    query: { enabled: canReadReceivers },
  });

  const {
    data: feeReceiver,
    isLoading: feeReceiverLoading,
    isError: feeReceiverError,
  } = useReadContract({
    address: vaultAddress,
    abi: manageableVaultAbi,
    functionName: "feeReceiver",
    chainId,
    query: { enabled: canReadReceivers },
  });

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
          address={tokenReceiver}
          loading={tokenReceiverLoading}
          readError={tokenReceiverError}
          copyToast="Management wallet address copied"
        />
        <CuratorWalletRow
          label="Fee wallet"
          address={feeReceiver}
          loading={feeReceiverLoading}
          readError={feeReceiverError}
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
  const { data: mTokenSupply } = useReadContract({
    address: mToken,
    abi: mTokenAbi,
    functionName: "totalSupply",
    chainId,
    query: { enabled: Boolean(valid && mTokenAddress && chainSupported) },
  });
  const { data: mTokenDecimals } = useReadContract({
    address: mToken,
    abi: mTokenAbi,
    functionName: "decimals",
    chainId,
    query: { enabled: Boolean(valid && mTokenAddress && chainSupported) },
  });
  const { data: mTokenSymbol } = useReadContract({
    address: mToken,
    abi: mTokenAbi,
    functionName: "symbol",
    chainId,
    query: { enabled: Boolean(valid && mTokenAddress && chainSupported) },
  });

  const { mutateAsync: writeMToken, isPending: writePending } = useWriteContract();

  const {
    data: vaultDetail,
    isLoading: vaultDetailLoading,
    isError: vaultDetailError,
  } = useVaultDetailQuery(valid ? chainId : undefined, valid ? mTokenAddress : undefined);
  const depositVaultAddress = vaultDetail?.depositVaultAddress;
  const depositVault = depositVaultAddress as Address;
  const canReadDepositSupplyCap = Boolean(
    chainSupported && typeof chainId === "number" && isAddress(depositVaultAddress ?? ""),
  );
  const { data: maxSupplyCapV1 } = useReadContract({
    address: depositVault,
    abi: depositVaultAbi,
    functionName: "maxSupplyCap",
    chainId,
    query: { enabled: canReadDepositSupplyCap },
  });
  const { data: maxSupplyCapV2 } = useReadContract({
    address: depositVault,
    abi: depositVaultAbi,
    functionName: "maxSupply",
    chainId,
    query: { enabled: canReadDepositSupplyCap },
  });
  const maxSupplyCap = maxSupplyCapV1 ?? maxSupplyCapV2;

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
          const sym = mTokenSymbol ?? "mToken";
          toastChainTxSuccess(
            action === "pause" ? `${sym} paused` : `${sym} unpaused`,
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
    [
      chainId,
      chainSupported,
      gate.canTransact,
      mToken,
      mTokenAddress,
      mTokenSymbol,
      publicClient,
      refetchPaused,
      writeMToken,
    ],
  );

  const tvl = vault?.tvl ?? 0;
  const mDecimals = mTokenDecimals != null ? Number(mTokenDecimals) : undefined;
  const supplyUtilizationPct =
    mTokenSupply != null && maxSupplyCap != null && maxSupplyCap > 0n
      ? Math.min(100, Number((mTokenSupply * 10_000n) / maxSupplyCap) / 100)
      : 0;
  const explorer = chainId && mTokenAddress ? getExplorerAddressUrl(chainId, mTokenAddress) : "#";

  const title = vault?.name ?? "Vault overview";
  const subtitle = vault
    ? `${vault.curator} · ${vault.underlyingSymbol}`
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
              <div className="text-xs text-muted-foreground">NAV</div>
              <div className="text-xl font-mono font-bold text-foreground mt-1">{vault ? formatUSD(tvl) : "—"}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">
                Price
              </div>
              <div className="text-xl font-mono font-bold text-foreground mt-1">
                {vault
                  ? `$${formatDisplayNumber(vault.navPerShare, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}`
                  : "—"}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground">
                Total Supply / Capacity ({mTokenSymbol ?? "mToken"})
              </div>
              <div className="text-xl font-mono font-bold text-foreground mt-1">
                {mTokenSupply != null || maxSupplyCap != null ? (
                  <>
                    {formatTokenAmount(mTokenSupply, mDecimals)}{" "}
                    <span className="text-sm text-muted-foreground font-normal">
                      / {formatTokenAmount(maxSupplyCap, mDecimals)}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </div>
              {maxSupplyCap != null && maxSupplyCap > 0n ? (
                <>
                  <Progress value={supplyUtilizationPct} className="h-1.5 mt-2" />
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    {formatDisplayNumber(supplyUtilizationPct, { maximumFractionDigits: 0 })}% utilized
                  </div>
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
        />
        <VaultSidePanel
          title="Redemption vault"
          contractLabel="Redemption vault"
          contractAddress={vaultDetail?.redemptionVaultAddress}
          chainId={chainId}
          vaultDetailLoading={vaultDetailLoading}
          vaultDetailError={vaultDetailError}
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
              {mTokenSymbol ?? "mToken"}:{" "}
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
                    {writePending || txBusy ? "Submit…" : `Unpause ${mTokenSymbol ?? "mToken"}`}
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
                    {writePending || txBusy ? "Submit…" : `Pause ${mTokenSymbol ?? "mToken"}`}
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
