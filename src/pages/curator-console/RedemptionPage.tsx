import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmActionModal } from "@/components/curator-console/ConfirmActionModal";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";
import { useVaultDetailQuery } from "@/hooks/queries/useVaultDetailQuery";
import { manageableVaultAbi } from "@/abis/manageableVault";
import { mTokenAbi } from "@/abis/mToken";
import { formatUnits, isAddress, parseUnits } from "viem";
import { getExplorerAddressUrl } from "@/lib/explorer";
import { toast } from "sonner";
import { toastChainTxSuccess } from "@/lib/toastChainTx";

const requests = [
  { id: 1042, address: "0xAB12…", amount: "50,000", date: "2026-03-19" },
  { id: 1041, address: "0xCD34…", amount: "45,000", date: "2026-03-18" },
  { id: 1040, address: "0xEF56…", amount: "30,000", date: "2026-03-18" },
];

const CURRENT_NAV = "1.1162";

function shortAddr(a?: string) {
  if (!a) return "—";
  return a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
}

function formatAmount(raw: bigint | undefined, decimals: number | undefined, maxFrac = 2) {
  if (raw == null) return "—";
  const d = decimals ?? 18;
  const n = Number(formatUnits(raw, d));
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function formatFeePercent(raw: bigint | undefined) {
  if (raw == null) return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  return `${(n / 100).toFixed(2)}%`;
}

function AddressWithActions({
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

export default function RedemptionPage() {
  const { address: walletAddress, isConnected } = useAccount();
  const { vault, chainId, mTokenAddress, valid } = useCuratorVaultSummary();
  const walletChainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const { mutateAsync: writeContractAsync } = useWriteContract();
  const { data: vaultDetail } = useVaultDetailQuery(valid ? chainId : undefined, valid ? mTokenAddress : undefined);
  const vaultAddress = vaultDetail?.redemptionVaultAddress;
  const mToken = isAddress(mTokenAddress) ? mTokenAddress : undefined;

  const { data: mTokenDecimals } = useReadContract({
    address: mToken as `0x${string}` | undefined,
    abi: mTokenAbi,
    functionName: "decimals",
    chainId,
    query: { enabled: Boolean(mToken) },
  });
  const { data: mTokenSupply } = useReadContract({
    address: mToken as `0x${string}` | undefined,
    abi: mTokenAbi,
    functionName: "totalSupply",
    chainId,
    query: { enabled: Boolean(mToken) },
  });
  const { data: mTokenSymbol } = useReadContract({
    address: mToken as `0x${string}` | undefined,
    abi: mTokenAbi,
    functionName: "symbol",
    chainId,
    query: { enabled: Boolean(mToken) },
  });

  const { data: tokensReceiver, refetch: refetchTokensReceiver } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: manageableVaultAbi,
    functionName: "tokensReceiver",
    chainId,
    query: { enabled: Boolean(vaultAddress) },
  });
  const { data: feeReceiver, refetch: refetchFeeReceiver } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: manageableVaultAbi,
    functionName: "feeReceiver",
    chainId,
    query: { enabled: Boolean(vaultAddress) },
  });
  const { data: instantDailyLimit, refetch: refetchInstantDailyLimit } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: manageableVaultAbi,
    functionName: "instantDailyLimit",
    chainId,
    query: { enabled: Boolean(vaultAddress) },
  });
  const { data: instantFee, refetch: refetchInstantFee } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: manageableVaultAbi,
    functionName: "instantFee",
    chainId,
    query: { enabled: Boolean(vaultAddress) },
  });
  const { data: requestRedeemer, refetch: refetchRequestRedeemer } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: manageableVaultAbi,
    functionName: "requestRedeemer",
    chainId,
    query: { enabled: Boolean(vaultAddress) },
  });
  useEffect(() => {
    if (instantFee != null) setInstantFeeInput((Number(instantFee) / 100).toFixed(2));
  }, [instantFee]);
  useEffect(() => {
    if (instantDailyLimit != null) {
      setInstantDailyLimitInput(
        formatUnits(instantDailyLimit, mTokenDecimals != null ? Number(mTokenDecimals) : 18),
      );
    }
  }, [instantDailyLimit, mTokenDecimals]);
  const walletRows = useMemo(
    () => [
      { label: "Management Wallet", addr: tokensReceiver ? String(tokensReceiver) : undefined },
      { label: "Fee Wallet", addr: feeReceiver ? String(feeReceiver) : undefined },
    ],
    [feeReceiver, tokensReceiver],
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [pendingVaultCall, setPendingVaultCall] = useState<{
    functionName:
      | "setTokensReceiver"
      | "setFeeReceiver"
      | "setRequestRedeemer"
      | "setInstantFee"
      | "setInstantDailyLimit"
      | "setVariationTolerance"
      | "addPaymentToken"
      | "withdrawToken";
    args: readonly unknown[];
    successTitle: string;
  } | null>(null);
  const [pendingInstantSteps, setPendingInstantSteps] = useState<Array<{
    functionName: "setInstantFee" | "setInstantDailyLimit";
    args: readonly unknown[];
    successTitle: string;
    summary: string;
  }>>([]);
  const [pendingProgressMessage, setPendingProgressMessage] = useState<string | undefined>(undefined);
  const [walletEditOpen, setWalletEditOpen] = useState(false);
  const [walletEditKind, setWalletEditKind] = useState<"management" | "fee" | "redeemer" | null>(null);
  const [walletEditValue, setWalletEditValue] = useState("");

  // New rate modal
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateModalAction, setRateModalAction] = useState("");
  const [rateModalLabel, setRateModalLabel] = useState("");
  const [newRate, setNewRate] = useState(CURRENT_NAV);

  // Vault settings
  const [showAddToken, setShowAddToken] = useState(false);
  const [instantFeeInput, setInstantFeeInput] = useState("0.10");
  const [instantDailyLimitInput, setInstantDailyLimitInput] = useState("500000");
  const [variationToleranceInput, setVariationToleranceInput] = useState("1.0");
  const [addTokenAddress, setAddTokenAddress] = useState("");
  const [addTokenDataFeed, setAddTokenDataFeed] = useState("");
  const [addTokenFeeInput, setAddTokenFeeInput] = useState("0.10");
  const [addTokenAllowanceInput, setAddTokenAllowanceInput] = useState("500000");
  const [addTokenStable, setAddTokenStable] = useState(false);
  const [withdrawTokenAddress, setWithdrawTokenAddress] = useState("");
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [withdrawToAddress, setWithdrawToAddress] = useState("");

  const toggleSelect = (id: number) => {
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  const selectAll = () => {
    if (selected.length === requests.length) setSelected([]);
    else setSelected(requests.map((r) => r.id));
  };

  const openConfirm = (action: string, value?: string) => {
    setConfirmAction(action);
    setConfirmValue(value || "");
    setConfirmOpen(true);
  };

  const openWalletEdit = (
    kind: "management" | "fee" | "redeemer",
    current?: string,
  ) => {
    setWalletEditKind(kind);
    setWalletEditValue(current ?? "");
    setWalletEditOpen(true);
  };

  const submitWalletEdit = () => {
    const t = walletEditValue.trim();
    if (!walletEditKind) return;
    if (!isAddress(t)) {
      toast.error("Enter a valid wallet address (0x...).");
      return;
    }
    setWalletEditOpen(false);
    const functionName =
      walletEditKind === "management"
        ? "setTokensReceiver"
        : walletEditKind === "fee"
          ? "setFeeReceiver"
          : "setRequestRedeemer";
    const label =
      walletEditKind === "management"
        ? "Change Management Wallet"
        : walletEditKind === "fee"
          ? "Change Fee Wallet"
          : "Change Redeemer Wallet";
    setPendingVaultCall({
      functionName,
      args: [t as `0x${string}`],
      successTitle: `${label} updated`,
    });
    openConfirm(label, t);
  };

  const openRateModal = (action: string, label: string) => {
    setNewRate(CURRENT_NAV);
    setRateModalAction(action);
    setRateModalLabel(label);
    setRateModalOpen(true);
  };

  const submitRateModal = () => {
    setRateModalOpen(false);
    openConfirm(rateModalAction, `Rate: $${newRate}`);
  };

  const selectedIds = selected.length > 0 ? `#${selected.join(", #")}` : "";
  const queueVaultCall = (
    action: string,
    newValue: string,
    functionName: NonNullable<typeof pendingVaultCall>["functionName"],
    args: readonly unknown[],
    successTitle: string,
  ) => {
    setPendingVaultCall({ functionName, args, successTitle });
    openConfirm(action, newValue);
  };

  const handleSaveInstantSettings = () => {
    const feePercent = Number(instantFeeInput);
    if (!Number.isFinite(feePercent) || feePercent < 0) {
      toast.error("Instant fee must be a valid non-negative percent.");
      return;
    }
    const feeRaw = BigInt(Math.round(feePercent * 100));
    let dailyLimit: bigint;
    try {
      dailyLimit = parseUnits(instantDailyLimitInput || "0", mTokenDecimals != null ? Number(mTokenDecimals) : 18);
    } catch {
      toast.error("Instant daily limit is invalid.");
      return;
    }
    if (dailyLimit < 0n) {
      toast.error("Instant daily limit must be non-negative.");
      return;
    }
    const steps: Array<{
      functionName: "setInstantFee" | "setInstantDailyLimit";
      args: readonly unknown[];
      successTitle: string;
      summary: string;
    }> = [];
    if (instantFee == null || feeRaw !== instantFee) {
      steps.push({
        functionName: "setInstantFee",
        args: [feeRaw],
        successTitle: "Instant fee updated",
        summary: `New Instant Fee: ${feePercent.toFixed(2)}%\ncontract call: setInstantFee(${feeRaw.toString()})`,
      });
    }
    if (instantDailyLimit == null || dailyLimit !== instantDailyLimit) {
      steps.push({
        functionName: "setInstantDailyLimit",
        args: [dailyLimit],
        successTitle: "Instant daily limit updated",
        summary: `New Instant Daily Limit: ${instantDailyLimitInput} ${mTokenSymbol ?? "mToken"}\ncontract call: setInstantDailyLimit(${dailyLimit.toString()})`,
      });
    }
    if (steps.length === 0) {
      toast.message("No instant setting changes to save.");
      return;
    }
    setPendingInstantSteps(steps);
    openConfirm("Update Instant Settings (batched on-chain)", `${steps.length} transaction${steps.length > 1 ? "s" : ""}`);
  };

  const handleSaveVariationTolerance = () => {
    const pct = Number(variationToleranceInput);
    if (!Number.isFinite(pct) || pct < 0) {
      toast.error("Variation tolerance must be a valid non-negative percent.");
      return;
    }
    const toleranceRaw = BigInt(Math.round(pct * 100));
    queueVaultCall(
      "Save Variation Tolerance",
      `${pct.toFixed(2)}%`,
      "setVariationTolerance",
      [toleranceRaw],
      "Variation tolerance updated",
    );
  };

  const handleAddPaymentToken = () => {
    if (!isAddress(addTokenAddress) || !isAddress(addTokenDataFeed)) {
      toast.error("Token and DataFeed must be valid addresses.");
      return;
    }
    const feePct = Number(addTokenFeeInput);
    if (!Number.isFinite(feePct) || feePct < 0) {
      toast.error("Fee must be a valid non-negative percent.");
      return;
    }
    let allowanceRaw: bigint;
    try {
      allowanceRaw = parseUnits(addTokenAllowanceInput || "0", 18);
    } catch {
      toast.error("Allowance is invalid.");
      return;
    }
    const feeRaw = BigInt(Math.round(feePct * 100));
    queueVaultCall(
      "Add Payment Token",
      shortAddr(addTokenAddress),
      "addPaymentToken",
      [addTokenAddress as `0x${string}`, addTokenDataFeed as `0x${string}`, feeRaw, allowanceRaw, addTokenStable],
      "Payment token added",
    );
  };

  const handleWithdrawToken = () => {
    if (!isAddress(withdrawTokenAddress) || !isAddress(withdrawToAddress)) {
      toast.error("Token and Withdraw To must be valid addresses.");
      return;
    }
    let amountRaw: bigint;
    try {
      amountRaw = parseUnits(withdrawAmountInput || "0", 18);
    } catch {
      toast.error("Withdraw amount is invalid.");
      return;
    }
    if (amountRaw <= 0n) {
      toast.error("Withdraw amount must be greater than 0.");
      return;
    }
    queueVaultCall(
      "Withdraw Token",
      `${shortAddr(withdrawTokenAddress)} → ${shortAddr(withdrawToAddress)}`,
      "withdrawToken",
      [withdrawTokenAddress as `0x${string}`, amountRaw, withdrawToAddress as `0x${string}`],
      "Token withdrawn",
    );
  };

  const runPendingVaultCall = async () => {
    if (!pendingVaultCall) return;
    if (!vaultAddress || !isAddress(vaultAddress)) {
      throw new Error("Redemption vault address unavailable.");
    }
    if (!isConnected || !walletAddress) {
      throw new Error("Connect wallet first.");
    }
    if (typeof chainId === "number" && walletChainId !== chainId) {
      throw new Error(`Switch wallet to chain ${chainId}.`);
    }
    const hash = await writeContractAsync({
      address: vaultAddress as `0x${string}`,
      abi: manageableVaultAbi,
      functionName: pendingVaultCall.functionName,
      args: pendingVaultCall.args,
      chainId,
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash });
    }
    await Promise.all([refetchTokensReceiver(), refetchFeeReceiver(), refetchRequestRedeemer()]);
    if (typeof chainId === "number") {
      toastChainTxSuccess(pendingVaultCall.successTitle, chainId, hash);
    } else {
      toast.success(pendingVaultCall.successTitle);
    }
    setPendingVaultCall(null);
    setPendingProgressMessage(undefined);
  };

  const runPendingInstantSteps = async () => {
    if (!pendingInstantSteps.length) return;
    if (!vaultAddress || !isAddress(vaultAddress)) {
      throw new Error("Redemption vault address unavailable.");
    }
    if (!isConnected || !walletAddress) {
      throw new Error("Connect wallet first.");
    }
    if (typeof chainId === "number" && walletChainId !== chainId) {
      throw new Error(`Switch wallet to chain ${chainId}.`);
    }
    for (let i = 0; i < pendingInstantSteps.length; i += 1) {
      const step = pendingInstantSteps[i];
      setPendingProgressMessage(
        `Signing transaction ${i + 1}/${pendingInstantSteps.length}: ${step.functionName}`,
      );
      const hash = await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi: manageableVaultAbi,
        functionName: step.functionName,
        args: step.args,
        chainId,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      if (typeof chainId === "number") {
        toastChainTxSuccess(step.successTitle, chainId, hash);
      } else {
        toast.success(step.successTitle);
      }
    }
    await Promise.all([refetchInstantFee(), refetchInstantDailyLimit()]);
    setPendingInstantSteps([]);
    setPendingProgressMessage(undefined);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Redemption Management</h1>
        {vault && <p className="text-sm text-muted-foreground mt-1 font-mono">{vault.name}</p>}
      </motion.div>

      {/* Overview */}
      <Card className="bg-card border-border">
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Pending Requests</span>
              <div className="font-mono font-bold text-foreground text-lg">3</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Supply</span>
              <div className="font-mono font-bold text-foreground text-lg">
                {formatAmount(mTokenSupply, mTokenDecimals != null ? Number(mTokenDecimals) : undefined)} {mTokenSymbol ?? "mToken"}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Instant Daily Limit</span>
              <div className="font-mono text-sm text-foreground">
                {formatAmount(instantDailyLimit, mTokenDecimals != null ? Number(mTokenDecimals) : undefined)} {mTokenSymbol ?? "mToken"}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Instant Fee</span>
              <div className="font-mono text-sm text-foreground">{formatFeePercent(instantFee)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-display text-sm">Pending Requests</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="text-xs" disabled={selected.length === 0}
              onClick={() => openConfirm(`Bulk Approve at Oracle NAV (${selectedIds})`, `Rate: $${CURRENT_NAV}`)}>
              Bulk Approve
            </Button>
            <Button size="sm" variant="outline" className="text-xs" disabled={selected.length === 0}
              onClick={() => openConfirm(`Bulk Approve at Saved Rate (${selectedIds})`)}>
              Bulk Approve at Saved Rate
            </Button>
            <Button size="sm" variant="outline" className="text-xs" disabled={selected.length === 0}
              onClick={() => openRateModal(`Bulk Approve at New Rate (${selectedIds})`, "Bulk Approve at New Rate")}>
              Bulk Approve at New Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 w-8">
                  <Checkbox checked={selected.length === requests.length && requests.length > 0} onCheckedChange={selectAll} />
                </th>
                <th className="text-left py-2 font-medium">#</th>
                <th className="text-left py-2 font-medium">Address</th>
                <th className="text-right py-2 font-medium">Amount (pUSDC)</th>
                <th className="text-right py-2 font-medium">Requested At</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <>{/* eslint-disable-next-line react/jsx-key */}
                  <tr key={r.id} className="border-b border-border/50 cursor-pointer hover:bg-secondary/30"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="py-2 font-mono">#{r.id}</td>
                    <td className="py-2 font-mono">{r.address}</td>
                    <td className="py-2 font-mono text-right">{r.amount}</td>
                    <td className="py-2 font-mono text-right text-muted-foreground">{r.date}</td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-actions`}>
                      <td colSpan={5} className="py-3 px-4 bg-secondary/20">
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className="text-xs"
                            onClick={() => openRateModal(`Safe Approve #${r.id} with New Rate`, `Safe Approve #${r.id}`)}>
                            Safe Approve with New Rate
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs"
                            onClick={() => openRateModal(`Approve #${r.id} with New Rate`, `Approve #${r.id}`)}>
                            Approve with New Rate
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs"
                            onClick={() => openConfirm(`Reject #${r.id}`)}>
                            Reject
                          </Button>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                          <div>• <strong>Safe Approve</strong>: new rate is subject to variation tolerance check</div>
                          <div>• <strong>Approve</strong>: new rate bypasses variation check</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Redemption Vault Settings ── */}
      <div className="pt-4">
        <h2 className="text-xl font-display font-bold text-foreground mb-4">Redemption Management</h2>
      </div>

      {/* Wallets */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Wallets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border gap-4 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground">Redemption Vault</div>
              <AddressWithActions addr={vaultAddress} chainId={chainId} />
            </div>
          </div>
          {walletRows.map((w, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground">{w.label}</div>
                <AddressWithActions addr={w.addr} chainId={chainId} />
              </div>
              <div className="flex items-center gap-3">
                {w.addr ? (
                  <a href={`https://debank.com/profile/${w.addr}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View on DeBank ↗</a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => openWalletEdit(w.label.includes("Management") ? "management" : "fee", w.addr)}
                >
                  Change Address
                </Button>
              </div>
            </div>
          ))}

          <div className="pt-2 mt-1">
            <div className="flex items-center justify-between py-2 gap-4 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground">Redeemer Wallet</div>
                <AddressWithActions addr={requestRedeemer ? String(requestRedeemer) : undefined} chainId={chainId} />
              </div>
              <div className="flex items-center gap-3">
                {requestRedeemer ? (
                  <a href={`https://debank.com/profile/${String(requestRedeemer)}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View on DeBank ↗</a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => openWalletEdit("redeemer", requestRedeemer ? String(requestRedeemer) : undefined)}
                >
                  Change Address
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instant Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Instant Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Instant Fee (%)</label>
              <Input value={instantFeeInput} onChange={(e) => setInstantFeeInput(e.target.value)} className="font-mono mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Instant Daily Limit ({mTokenSymbol ?? "mToken"})</label>
              <Input value={instantDailyLimitInput} onChange={(e) => setInstantDailyLimitInput(e.target.value)} className="font-mono mt-1" />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveInstantSettings}>Save Instant Settings</Button>
        </CardContent>
      </Card>

      {/* Variation Tolerance */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Variation Tolerance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Safe Approval Tolerance (%)</label>
            <Input value={variationToleranceInput} onChange={(e) => setVariationToleranceInput(e.target.value)} className="font-mono mt-1 max-w-xs" />
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveVariationTolerance}>Save</Button>
        </CardContent>
      </Card>

      {/* Payment Tokens */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-sm">Payment Tokens</CardTitle>
          <Button size="sm" variant="ghost" className="text-xs text-primary" onClick={() => setShowAddToken(!showAddToken)}>
            <Plus className="h-3 w-3 mr-1" />Add Payment Token
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 font-medium">Token</th>
                <th className="text-left py-2 font-medium">DataFeed</th>
                <th className="text-right py-2 font-medium">Fee</th>
                <th className="text-right py-2 font-medium">Allowance</th>
                <th className="text-center py-2 font-medium">Stable</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 font-mono">USDC</td>
                <td className="py-2 font-mono">0xFeed1…</td>
                <td className="py-2 font-mono text-right">0.10%</td>
                <td className="py-2 font-mono text-right">500,000</td>
                <td className="py-2 text-center text-yield-positive">Yes</td>
                <td className="py-2 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => openConfirm("Edit Fee")}>Edit Fee</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => openConfirm("Edit Allowance")}>Edit Allowance</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2 text-destructive" onClick={() => openConfirm("Remove USDC")}>Remove</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          {showAddToken && (
            <div className="mt-4 p-4 bg-secondary/30 rounded-lg space-y-3 border border-border">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Token Address</label><Input value={addTokenAddress} onChange={(e) => setAddTokenAddress(e.target.value)} className="font-mono mt-1" placeholder="0x..." /></div>
                <div><label className="text-xs text-muted-foreground">DataFeed</label><Input value={addTokenDataFeed} onChange={(e) => setAddTokenDataFeed(e.target.value)} className="font-mono mt-1" placeholder="0x..." /></div>
                <div><label className="text-xs text-muted-foreground">Fee (%)</label><Input value={addTokenFeeInput} onChange={(e) => setAddTokenFeeInput(e.target.value)} className="font-mono mt-1" placeholder="0.10" /></div>
                <div><label className="text-xs text-muted-foreground">Allowance</label><Input value={addTokenAllowanceInput} onChange={(e) => setAddTokenAllowanceInput(e.target.value)} className="font-mono mt-1" placeholder="500000" /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={addTokenStable} onCheckedChange={(v) => setAddTokenStable(Boolean(v))} />
                <span className="text-xs text-muted-foreground">Stable</span>
              </div>
              <Button size="sm" onClick={handleAddPaymentToken}>Add</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Token (normal style) */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="font-display text-sm">Withdraw Token</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Token</label>
              <Input value={withdrawTokenAddress} onChange={(e) => setWithdrawTokenAddress(e.target.value)} className="font-mono mt-1" placeholder="0x token..." />
            </div>
            <div><label className="text-xs text-muted-foreground">Amount</label><Input value={withdrawAmountInput} onChange={(e) => setWithdrawAmountInput(e.target.value)} className="font-mono mt-1" placeholder="0" /></div>
            <div><label className="text-xs text-muted-foreground">Withdraw To</label><Input value={withdrawToAddress} onChange={(e) => setWithdrawToAddress(e.target.value)} className="font-mono mt-1" placeholder="0x..." /></div>
          </div>
          <Button variant="outline" onClick={handleWithdrawToken}>Withdraw</Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-accent" />
            This will transfer assets directly out of the contract. Confirm before proceeding.
          </p>
        </CardContent>
      </Card>

      {/* New Rate Modal */}
      <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">{rateModalLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Redemption Rate (USD per share)</label>
              <Input value={newRate} onChange={(e) => setNewRate(e.target.value)} className="font-mono mt-1" />
            </div>
            <div className="text-xs text-muted-foreground font-mono">Current Oracle NAV: ${CURRENT_NAV}</div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRateModalOpen(false)}>Cancel</Button>
            <Button onClick={submitRateModal}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={walletEditOpen} onOpenChange={setWalletEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">
              {walletEditKind === "management"
                ? "Change Management Wallet"
                : walletEditKind === "fee"
                  ? "Change Fee Wallet"
                  : "Change Redeemer Wallet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">New wallet address</label>
            <Input
              value={walletEditValue}
              onChange={(e) => setWalletEditValue(e.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWalletEditOpen(false)}>Cancel</Button>
            <Button onClick={submitWalletEdit}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setPendingVaultCall(null);
            setPendingInstantSteps([]);
            setPendingProgressMessage(undefined);
          }
        }}
        action={confirmAction}
        newValue={confirmValue}
        summaryLines={pendingInstantSteps.length ? pendingInstantSteps.map((s) => s.summary) : undefined}
        contractAddress={vaultAddress}
        walletAddress={walletAddress}
        walletFallback={isConnected ? "Connected wallet unavailable" : "Not connected"}
        explorerChainId={chainId}
        onConfirm={
          pendingInstantSteps.length
            ? runPendingInstantSteps
            : pendingVaultCall
              ? runPendingVaultCall
              : undefined
        }
        pendingMessage={
          pendingProgressMessage ??
          "Submit in your wallet and wait for the transaction to be mined."
        }
      />
    </div>
  );
}
