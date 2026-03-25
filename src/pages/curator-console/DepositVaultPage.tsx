import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ConfirmActionModal,
  type ConfirmModalValueRow,
  type ConfirmSuccessTxRow,
} from "@/components/curator-console/ConfirmActionModal";
import { ManageableVaultAddressWithActions } from "@/components/curator-console/ManageableVaultAddressWithActions";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";
import { useVaultDetailQuery } from "@/hooks/queries/useVaultDetailQuery";
import { useDepositRequestsQuery } from "@/hooks/queries/useDepositRequestsQuery";
import { manageableVaultAbi } from "@/abis/manageableVault";
import { mTokenAbi } from "@/abis/mToken";
import { erc20Abi } from "@/abis/erc20";
import { depositVaultAbi } from "@/abis/depositVault";
import { dataFeedAbi } from "@/abis/dataFeed";
import { formatUnits, isAddress, parseUnits } from "viem";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastChainTxSuccess } from "@/lib/toastChainTx";
import {
  formatDisplayNumber,
  formatNumberInputWithGrouping,
  stripNumberGrouping,
} from "@/lib/formatNumbers";
import {
  PAYMENT_ALLOWANCE_DECIMALS,
  shortAddr,
  formatAmount,
  formatFeePercent,
  formatPaymentAllowanceDisplay,
  readContractsSuccessResult,
  parsePaymentTokenDecimalsRead,
  parseTokenConfigResult,
  parseInstantSettingsInputs,
} from "@/lib/curatorManageableVaultFormat";
import { AlertTriangle } from "lucide-react";

const CURRENT_NAV_FALLBACK = "1.1162";

type PendingManageableCall = {
  functionName:
    | "setTokensReceiver"
    | "setFeeReceiver"
    | "setInstantFee"
    | "setInstantDailyLimit"
    | "setVariationTolerance"
    | "safeBulkApproveRequestAtSavedRate"
    | "safeBulkApproveRequest"
    | "safeApproveRequest"
    | "approveRequest"
    | "rejectRequest"
    | "changeTokenFee"
    | "changeTokenAllowance"
    | "withdrawToken";
  args: readonly unknown[];
  successTitle: string;
};

function formatTxErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Transaction failed.";
  const m = err.message;
  if (/DV:\s*request not exist/i.test(m)) return "Request does not exist on-chain (DV: request not exist).";
  if (/DV:\s*request not pending/i.test(m)) return "Request is no longer pending (DV: request not pending).";
  if (/DV:\s*max supply cap exceeded/i.test(m)) return "Approve would exceed max supply cap (DV: max supply cap exceeded).";
  if (/MV:\s*exceed price diviation/i.test(m)) return "Safe approve exceeds variation tolerance (MV: exceed price diviation).";
  if (/onlyVaultAdmin|accesscontrol|missing role|not authorized/i.test(m)) return "Connected wallet is not vault admin.";
  if (/user rejected|denied|cancel/i.test(m)) return "Transaction cancelled.";
  return m.length > 220 ? `${m.slice(0, 220)}…` : m;
}

export default function DepositVaultPage() {
  const { address: walletAddress, isConnected } = useAccount();
  const { vault, chainId, mTokenAddress, valid } = useCuratorVaultSummary();
  const walletChainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const { mutateAsync: writeContractAsync } = useWriteContract();
  const { data: vaultDetail } = useVaultDetailQuery(
    valid ? chainId : undefined,
    valid ? mTokenAddress : undefined,
  );
  const {
    data: depositRequestsRes,
    isLoading: depositRequestsLoading,
    isError: depositRequestsError,
  } = useDepositRequestsQuery(valid ? chainId : undefined, valid ? mTokenAddress : undefined);
  const vaultAddress = vaultDetail?.depositVaultAddress;
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
  const {
    data: onChainVariationTolerance,
    refetch: refetchVariationTolerance,
    isLoading: variationToleranceLoading,
    isError: variationToleranceReadError,
  } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: manageableVaultAbi,
    functionName: "variationTolerance",
    chainId,
    query: { enabled: Boolean(vaultAddress) },
  });

  const depositVaultAddr =
    vaultAddress && isAddress(vaultAddress) ? (vaultAddress as `0x${string}`) : undefined;

  const {
    data: maxSupplyCapOnChain,
    refetch: refetchMaxSupplyCap,
    isLoading: maxSupplyCapLoading,
    isError: maxSupplyCapReadError,
  } = useReadContract({
    address: depositVaultAddr,
    abi: depositVaultAbi,
    functionName: "maxSupplyCap",
    chainId,
    query: { enabled: Boolean(depositVaultAddr) },
  });

  const {
    data: paymentTokenAddressesRaw,
    refetch: refetchPaymentTokens,
    isLoading: paymentTokensListLoading,
    isError: paymentTokensListError,
  } = useReadContract({
    address: depositVaultAddr,
    abi: manageableVaultAbi,
    functionName: "getPaymentTokens",
    chainId,
    query: { enabled: Boolean(depositVaultAddr) },
  });
  const paymentTokenAddresses = useMemo(() => {
    if (!paymentTokenAddressesRaw || !Array.isArray(paymentTokenAddressesRaw)) {
      return [] as readonly `0x${string}`[];
    }
    return paymentTokenAddressesRaw.filter(
      (a): a is `0x${string}` => typeof a === "string" && isAddress(a),
    );
  }, [paymentTokenAddressesRaw]);

  const tokensConfigContracts = useMemo(
    () =>
      !depositVaultAddr || paymentTokenAddresses.length === 0
        ? ([] as const)
        : paymentTokenAddresses.map((token) => ({
            address: depositVaultAddr,
            abi: manageableVaultAbi,
            functionName: "tokensConfig" as const,
            args: [token] as const,
            chainId,
          })),
    [depositVaultAddr, paymentTokenAddresses, chainId],
  );
  const tokenSymbolContracts = useMemo(
    () =>
      paymentTokenAddresses.length === 0
        ? ([] as const)
        : paymentTokenAddresses.map((token) => ({
            address: token,
            abi: mTokenAbi,
            functionName: "symbol" as const,
            chainId,
          })),
    [paymentTokenAddresses, chainId],
  );

  const {
    data: tokensConfigBatch,
    isFetching: tokensConfigFetching,
    refetch: refetchTokensConfigs,
  } = useReadContracts({
    contracts: tokensConfigContracts,
    query: { enabled: Boolean(depositVaultAddr) && tokensConfigContracts.length > 0 },
  });
  const { data: tokenSymbolsBatch, isFetching: tokenSymbolsFetching } = useReadContracts({
    contracts: tokenSymbolContracts,
    query: { enabled: tokenSymbolContracts.length > 0 },
  });

  const tokenDecimalsContracts = useMemo(
    () =>
      paymentTokenAddresses.length === 0
        ? ([] as const)
        : paymentTokenAddresses.map((token) => ({
            address: token,
            abi: mTokenAbi,
            functionName: "decimals" as const,
            chainId,
          })),
    [paymentTokenAddresses, chainId],
  );
  const { data: tokenDecimalsBatch, isFetching: tokenDecimalsFetching } = useReadContracts({
    contracts: tokenDecimalsContracts,
    query: { enabled: tokenDecimalsContracts.length > 0 },
  });

  const paymentTokenRows = useMemo(() => {
    return paymentTokenAddresses.map((token, i) => {
      const raw = readContractsSuccessResult<unknown>(tokensConfigBatch?.[i]);
      const cfg = parseTokenConfigResult(raw);
      const sym = readContractsSuccessResult<string>(tokenSymbolsBatch?.[i]);
      const decimals = parsePaymentTokenDecimalsRead(tokenDecimalsBatch?.[i]);
      return { token, symbol: sym ?? shortAddr(token), cfg, decimals };
    });
  }, [paymentTokenAddresses, tokensConfigBatch, tokenSymbolsBatch, tokenDecimalsBatch]);

  const oraclePriceContracts = useMemo(
    () =>
      paymentTokenRows.map((row) => {
        const oracle = row.cfg?.dataFeed;
        if (!oracle || !isAddress(oracle)) return null;
        return {
          address: oracle as `0x${string}`,
          abi: dataFeedAbi,
          functionName: "getDataInBase18" as const,
          chainId,
        };
      }),
    [paymentTokenRows, chainId],
  );
  const { data: oraclePriceBatch, isFetching: oraclePriceFetching } = useReadContracts({
    contracts: oraclePriceContracts.filter(Boolean) as readonly {
      address: `0x${string}`;
      abi: typeof dataFeedAbi;
      functionName: "getDataInBase18";
      chainId: number;
    }[],
    query: {
      enabled: oraclePriceContracts.some(Boolean),
    },
  });

  const paymentTokensTableLoading =
    paymentTokensListLoading ||
    (paymentTokenAddresses.length > 0 &&
      (tokensConfigFetching || tokenSymbolsFetching || tokenDecimalsFetching || oraclePriceFetching));

  const [instantFeeInput, setInstantFeeInput] = useState("0.10");
  const [instantDailyLimitInput, setInstantDailyLimitInput] = useState("500000");
  const [variationToleranceInput, setVariationToleranceInput] = useState("1.0");
  const [supplyCapInput, setSupplyCapInput] = useState("");

  useEffect(() => {
    if (instantFee != null) setInstantFeeInput((Number(instantFee) / 100).toFixed(2));
  }, [instantFee]);
  useEffect(() => {
    if (instantDailyLimit != null) {
      setInstantDailyLimitInput(
        formatNumberInputWithGrouping(
          formatUnits(instantDailyLimit, mTokenDecimals != null ? Number(mTokenDecimals) : 18),
        ),
      );
    }
  }, [instantDailyLimit, mTokenDecimals]);
  useEffect(() => {
    if (onChainVariationTolerance != null) {
      setVariationToleranceInput(
        formatDisplayNumber(Number(onChainVariationTolerance) / 100, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }),
      );
    }
  }, [onChainVariationTolerance]);
  useEffect(() => {
    if (maxSupplyCapOnChain != null) {
      setSupplyCapInput(
        formatNumberInputWithGrouping(
          formatUnits(maxSupplyCapOnChain, mTokenDecimals != null ? Number(mTokenDecimals) : 18),
        ),
      );
    }
  }, [maxSupplyCapOnChain, mTokenDecimals]);

  const walletRows = useMemo(
    () => [
      { label: "Management Wallet", addr: tokensReceiver ? String(tokensReceiver) : undefined },
      { label: "Fee Wallet", addr: feeReceiver ? String(feeReceiver) : undefined },
    ],
    [feeReceiver, tokensReceiver],
  );
  const pendingRequests = useMemo(() => {
    const rows = depositRequestsRes?.items ?? [];
    return rows.map((r) => {
      const parsedAmount = Number(r.amountToken);
      const amount =
        Number.isFinite(parsedAmount)
          ? formatDisplayNumber(parsedAmount, { maximumFractionDigits: 6 })
          : r.amountToken;
      const date = r.createdAt.includes("T") ? r.createdAt.slice(0, 10) : r.createdAt;
      return {
        id: r.requestId,
        address: shortAddr(r.sender),
        amount,
        date,
      };
    });
  }, [depositRequestsRes]);
  const pendingRequestCount = depositRequestsRes?.totalItems ?? 0;
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateModalAction, setRateModalAction] = useState("");
  const [rateModalLabel, setRateModalLabel] = useState("");
  const initialNav = vaultDetail?.navPerShare ? String(vaultDetail.navPerShare) : CURRENT_NAV_FALLBACK;
  const [newRate, setNewRate] = useState(initialNav);
  const [rateModalBaselineNav, setRateModalBaselineNav] = useState(initialNav);
  const [rateModalBulkMode, setRateModalBulkMode] = useState<"bulk-new-rate" | null>(null);
  const [rateModalSingleMode, setRateModalSingleMode] = useState<"single-safe" | "single-approve" | null>(
    null,
  );
  const [rateModalRequestId, setRateModalRequestId] = useState<string | null>(null);
  useEffect(() => {
    const fallback = vaultDetail?.navPerShare ? String(vaultDetail.navPerShare) : CURRENT_NAV_FALLBACK;
    setRateModalBaselineNav(fallback);
    setNewRate(fallback);
  }, [vaultDetail?.navPerShare]);
  useEffect(() => {
    const idSet = new Set(pendingRequests.map((r) => r.id));
    setSelected((prev) => prev.filter((id) => idSet.has(id)));
    setExpanded((prev) => (prev != null && idSet.has(prev) ? prev : null));
  }, [pendingRequests]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [confirmValueLabel, setConfirmValueLabel] = useState<string | undefined>(undefined);
  const [confirmValueRows, setConfirmValueRows] = useState<ConfirmModalValueRow[] | null>(null);
  const [confirmContractNote, setConfirmContractNote] = useState("");
  const [confirmActionContractNote, setConfirmActionContractNote] = useState("");
  const [pendingVaultCall, setPendingVaultCall] = useState<PendingManageableCall | null>(null);
  const [pendingDepositCapCall, setPendingDepositCapCall] = useState<{
    cap: bigint;
    successTitle: string;
    contractNote: string;
  } | null>(null);
  const [pendingInstantSteps, setPendingInstantSteps] = useState<
    Array<{
      functionName: "setInstantFee" | "setInstantDailyLimit";
      args: readonly unknown[];
      successTitle: string;
      human: string;
      contractNote: string;
    }>
  >([]);
  const [pendingProgressMessage, setPendingProgressMessage] = useState<string | undefined>(
    undefined,
  );
  const [instantBatchProgress, setInstantBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [confirmSuccessTxRows, setConfirmSuccessTxRows] = useState<ConfirmSuccessTxRow[]>([]);
  const [walletEditOpen, setWalletEditOpen] = useState(false);
  const [walletEditKind, setWalletEditKind] = useState<"management" | "fee" | null>(null);
  const [walletEditValue, setWalletEditValue] = useState("");
  const [walletEditBaseline, setWalletEditBaseline] = useState("");

  const [paymentTokenEditOpen, setPaymentTokenEditOpen] = useState(false);
  const [paymentTokenEditKind, setPaymentTokenEditKind] = useState<"fee" | "allowance" | null>(
    null,
  );
  const [paymentTokenEditToken, setPaymentTokenEditToken] = useState<`0x${string}` | "">("");
  const [paymentTokenEditSymbol, setPaymentTokenEditSymbol] = useState("");
  const [paymentTokenEditInput, setPaymentTokenEditInput] = useState("");
  const [paymentTokenEditOnChainFee, setPaymentTokenEditOnChainFee] = useState<bigint | null>(
    null,
  );
  const [paymentTokenEditOnChainAllowance, setPaymentTokenEditOnChainAllowance] = useState<
    bigint | null
  >(null);

  const withdrawTokenAddress = paymentTokenRows[0]?.token ?? "";
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [withdrawToAddress, setWithdrawToAddress] = useState("");

  const withdrawTokenDecimals = useMemo(() => {
    if (!isAddress(withdrawTokenAddress.trim())) return undefined;
    const t = withdrawTokenAddress.trim().toLowerCase();
    return paymentTokenRows.find((r) => r.token.toLowerCase() === t)?.decimals;
  }, [withdrawTokenAddress, paymentTokenRows]);

  const withdrawErc20Addr =
    withdrawTokenAddress.trim() && isAddress(withdrawTokenAddress.trim())
      ? (withdrawTokenAddress.trim() as `0x${string}`)
      : undefined;
  const withdrawBalanceVaultAddr = depositVaultAddr;
  const withdrawVaultBalanceEnabled = Boolean(
    withdrawErc20Addr && withdrawBalanceVaultAddr && withdrawTokenDecimals != null,
  );

  const {
    data: withdrawVaultTokenBalanceRaw,
    isLoading: withdrawVaultTokenBalanceLoading,
    isError: withdrawVaultTokenBalanceError,
    refetch: refetchWithdrawVaultTokenBalance,
  } = useReadContract({
    address: withdrawErc20Addr,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: withdrawBalanceVaultAddr ? [withdrawBalanceVaultAddr] : undefined,
    chainId,
    query: { enabled: withdrawVaultBalanceEnabled },
  });

  const withdrawVaultTokenBalance =
    typeof withdrawVaultTokenBalanceRaw === "bigint" ? withdrawVaultTokenBalanceRaw : undefined;

  const withdrawParsedAmountRaw = useMemo(() => {
    if (withdrawTokenDecimals == null) return null;
    try {
      return parseUnits(stripNumberGrouping(withdrawAmountInput) || "0", withdrawTokenDecimals);
    } catch {
      return null;
    }
  }, [withdrawAmountInput, withdrawTokenDecimals]);

  const withdrawVaultBalanceReady =
    withdrawVaultBalanceEnabled &&
    !withdrawVaultTokenBalanceLoading &&
    !withdrawVaultTokenBalanceError &&
    withdrawVaultTokenBalance !== undefined;

  const withdrawAmountExceedsVaultBalance = useMemo(() => {
    if (withdrawVaultTokenBalance === undefined) return false;
    if (withdrawParsedAmountRaw == null) return false;
    return withdrawParsedAmountRaw > withdrawVaultTokenBalance;
  }, [withdrawVaultTokenBalance, withdrawParsedAmountRaw]);

  const instantSettingsTxCount = useMemo(() => {
    const dec = mTokenDecimals != null ? Number(mTokenDecimals) : undefined;
    const parsed = parseInstantSettingsInputs(instantFeeInput, instantDailyLimitInput, dec);
    if (!parsed.ok) return null;
    let n = 0;
    if (instantFee == null || parsed.feeRaw !== instantFee) n += 1;
    if (instantDailyLimit == null || parsed.dailyLimit !== instantDailyLimit) n += 1;
    return n;
  }, [instantFeeInput, instantDailyLimitInput, mTokenDecimals, instantFee, instantDailyLimit]);

  const variationToleranceCanSave = useMemo(() => {
    if (!vaultAddress) return false;
    if (variationToleranceLoading || variationToleranceReadError) return false;
    if (onChainVariationTolerance === undefined) return false;
    const pct = Number(stripNumberGrouping(variationToleranceInput));
    if (!Number.isFinite(pct) || pct < 0) return false;
    const toleranceRaw = BigInt(Math.round(pct * 100));
    return toleranceRaw !== onChainVariationTolerance;
  }, [
    vaultAddress,
    variationToleranceLoading,
    variationToleranceReadError,
    onChainVariationTolerance,
    variationToleranceInput,
  ]);

  const supplyCapCanSave = useMemo(() => {
    if (!depositVaultAddr) return false;
    if (maxSupplyCapLoading || maxSupplyCapReadError) return false;
    if (maxSupplyCapOnChain === undefined) return false;
    const dec = mTokenDecimals != null ? Number(mTokenDecimals) : 18;
    let parsed: bigint;
    try {
      parsed = parseUnits(stripNumberGrouping(supplyCapInput) || "0", dec);
    } catch {
      return false;
    }
    return parsed !== maxSupplyCapOnChain;
  }, [
    depositVaultAddr,
    maxSupplyCapLoading,
    maxSupplyCapReadError,
    maxSupplyCapOnChain,
    supplyCapInput,
    mTokenDecimals,
  ]);

  const withdrawTokenCanSubmit = useMemo(() => {
    if (!withdrawErc20Addr || !isAddress(withdrawToAddress.trim())) return false;
    if (withdrawTokenDecimals == null) return false;
    if (withdrawParsedAmountRaw == null || withdrawParsedAmountRaw <= 0n) return false;
    if (!withdrawVaultBalanceReady) return false;
    if (withdrawVaultTokenBalance === undefined) return false;
    return withdrawParsedAmountRaw <= withdrawVaultTokenBalance;
  }, [
    withdrawErc20Addr,
    withdrawToAddress,
    withdrawTokenDecimals,
    withdrawParsedAmountRaw,
    withdrawVaultBalanceReady,
    withdrawVaultTokenBalance,
  ]);

  const walletEditCanContinue = useMemo(() => {
    const t = walletEditValue.trim();
    if (!isAddress(t)) return false;
    return t.toLowerCase() !== walletEditBaseline;
  }, [walletEditValue, walletEditBaseline]);

  const paymentTokenEditFeeCanContinue = useMemo(() => {
    if (paymentTokenEditKind !== "fee") return false;
    if (!isAddress(paymentTokenEditToken) || paymentTokenEditOnChainFee == null) return false;
    const pct = Number(stripNumberGrouping(paymentTokenEditInput));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return false;
    const feeRaw = BigInt(Math.round(pct * 100));
    if (feeRaw > 10000n) return false;
    return feeRaw !== paymentTokenEditOnChainFee;
  }, [
    paymentTokenEditKind,
    paymentTokenEditToken,
    paymentTokenEditInput,
    paymentTokenEditOnChainFee,
  ]);

  const paymentTokenEditAllowanceCanContinue = useMemo(() => {
    if (paymentTokenEditKind !== "allowance") return false;
    if (!isAddress(paymentTokenEditToken) || paymentTokenEditOnChainAllowance == null) return false;
    let raw: bigint;
    try {
      raw = parseUnits(stripNumberGrouping(paymentTokenEditInput) || "0", PAYMENT_ALLOWANCE_DECIMALS);
    } catch {
      return false;
    }
    if (raw <= 0n) return false;
    return raw !== paymentTokenEditOnChainAllowance;
  }, [
    paymentTokenEditKind,
    paymentTokenEditToken,
    paymentTokenEditInput,
    paymentTokenEditOnChainAllowance,
  ]);

  const paymentTokenEditCanContinue =
    paymentTokenEditKind === "fee"
      ? paymentTokenEditFeeCanContinue
      : paymentTokenEditKind === "allowance"
        ? paymentTokenEditAllowanceCanContinue
        : false;

  const rateModalCanSubmit = useMemo(() => {
    return newRate.trim() !== rateModalBaselineNav.trim();
  }, [newRate, rateModalBaselineNav]);

  const toggleSelect = (id: string) => {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const selectAll = () => {
    if (selected.length === pendingRequests.length) setSelected([]);
    else setSelected(pendingRequests.map((r) => r.id));
  };

  const openConfirm = (
    action: string,
    value?: string,
    contractNote?: string,
    pinContractNoteUnderAction?: boolean,
    valueRows?: ConfirmModalValueRow[] | null,
    valueLabel?: string,
  ) => {
    setConfirmSuccessTxRows([]);
    setConfirmAction(action);
    setConfirmValue(value || "");
    setConfirmValueLabel(valueLabel);
    setConfirmValueRows(valueRows != null && valueRows.length > 0 ? valueRows : null);
    if (pinContractNoteUnderAction && contractNote) {
      setConfirmActionContractNote(contractNote);
      setConfirmContractNote("");
    } else {
      setConfirmContractNote(contractNote ?? "");
      setConfirmActionContractNote("");
    }
    setConfirmOpen(true);
  };

  const openWalletEdit = (kind: "management" | "fee", current?: string) => {
    setWalletEditKind(kind);
    const c = (current ?? "").trim();
    setWalletEditBaseline(c.toLowerCase());
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
    const functionName = walletEditKind === "management" ? "setTokensReceiver" : "setFeeReceiver";
    const label =
      walletEditKind === "management" ? "Change Management Wallet" : "Change Fee Wallet";
    const newValueLabel =
      walletEditKind === "management" ? "New Management Wallet" : "New Fee Wallet";
    setPendingVaultCall({
      functionName,
      args: [t as `0x${string}`],
      successTitle: `${label} updated`,
    });
    openConfirm(label, t, `${functionName}(${t})`, true, null, newValueLabel);
  };

  const openEditPaymentTokenFee = (
    token: `0x${string}`,
    symbol: string,
    feeRaw: bigint,
  ) => {
    setPaymentTokenEditKind("fee");
    setPaymentTokenEditToken(token);
    setPaymentTokenEditSymbol(symbol);
    setPaymentTokenEditInput((Number(feeRaw) / 100).toFixed(2));
    setPaymentTokenEditOnChainFee(feeRaw);
    setPaymentTokenEditOnChainAllowance(null);
    setPaymentTokenEditOpen(true);
  };

  const openEditPaymentTokenAllowance = (
    token: `0x${string}`,
    symbol: string,
    allowanceRaw: bigint,
  ) => {
    setPaymentTokenEditKind("allowance");
    setPaymentTokenEditToken(token);
    setPaymentTokenEditSymbol(symbol);
    setPaymentTokenEditInput(
      formatNumberInputWithGrouping(formatUnits(allowanceRaw, PAYMENT_ALLOWANCE_DECIMALS)),
    );
    setPaymentTokenEditOnChainFee(null);
    setPaymentTokenEditOnChainAllowance(allowanceRaw);
    setPaymentTokenEditOpen(true);
  };

  const submitPaymentTokenEdit = () => {
    if (!paymentTokenEditKind || !isAddress(paymentTokenEditToken)) return;
    if (paymentTokenEditKind === "fee") {
      const pct = Number(stripNumberGrouping(paymentTokenEditInput));
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        toast.error("Fee must be between 0% and 100%.");
        return;
      }
      const feeRaw = BigInt(Math.round(pct * 100));
      if (feeRaw > 10000n) {
        toast.error("Fee cannot exceed 100%.");
        return;
      }
      setPaymentTokenEditOpen(false);
      setPaymentTokenEditKind(null);
      queueVaultCall(
        "Change Payment Token Fee",
        `${formatDisplayNumber(pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
        "changeTokenFee",
        [paymentTokenEditToken, feeRaw],
        "Payment token fee updated",
        `changeTokenFee(${paymentTokenEditToken}, ${feeRaw.toString()})`,
        true,
        null,
        "New Payment Token Fee",
      );
      return;
    }
    let allowanceRaw: bigint;
    try {
      allowanceRaw = parseUnits(stripNumberGrouping(paymentTokenEditInput) || "0", PAYMENT_ALLOWANCE_DECIMALS);
    } catch {
      toast.error("Allowance is invalid.");
      return;
    }
    if (allowanceRaw <= 0n) {
      toast.error("Allowance must be greater than zero (on-chain requirement).");
      return;
    }
    setPaymentTokenEditOpen(false);
    setPaymentTokenEditKind(null);
    const allowanceDisplay = (() => {
      const raw = formatUnits(allowanceRaw, PAYMENT_ALLOWANCE_DECIMALS);
      const sign = raw.startsWith("-") ? "-" : "";
      const unsigned = sign ? raw.slice(1) : raw;
      const [intPart, fracPart = ""] = unsigned.split(".");
      const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const trimmedFrac = fracPart.replace(/0+$/, "");
      return `${sign}${groupedInt}${trimmedFrac ? `.${trimmedFrac}` : ""}`;
    })();
    queueVaultCall(
      "Change Payment Token Allowance",
      allowanceDisplay,
      "changeTokenAllowance",
      [paymentTokenEditToken, allowanceRaw],
      "Payment token allowance updated",
      `changeTokenAllowance(${paymentTokenEditToken}, ${allowanceRaw.toString()})`,
      true,
      null,
      "New Allowance",
    );
  };

  const queueVaultCall = (
    action: string,
    newValue: string,
    functionName: PendingManageableCall["functionName"],
    args: readonly unknown[],
    successTitle: string,
    contractNote?: string,
    pinContractNoteUnderAction = true,
    valueRows?: ConfirmModalValueRow[] | null,
    valueLabel?: string,
  ) => {
    setPendingVaultCall({ functionName, args, successTitle });
    const hasRows = valueRows != null && valueRows.length > 0;
    openConfirm(
      action,
      hasRows ? "" : newValue,
      contractNote,
      pinContractNoteUnderAction,
      hasRows ? valueRows : null,
      valueLabel,
    );
  };

  const openRateModal = (action: string, label: string) => {
    const currentNav = vaultDetail?.navPerShare ? String(vaultDetail.navPerShare) : CURRENT_NAV_FALLBACK;
    setRateModalBaselineNav(currentNav);
    setNewRate(currentNav);
    setRateModalAction(action);
    setRateModalLabel(label);
    setRateModalOpen(true);
  };

  const submitRateModal = () => {
    setRateModalOpen(false);
    if (rateModalSingleMode) {
      if (!rateModalRequestId || !/^\d+$/.test(rateModalRequestId)) {
        toast.error("Invalid request id.");
        return;
      }
      const requestId = BigInt(rateModalRequestId);
      let newRateRaw: bigint;
      try {
        newRateRaw = parseUnits(stripNumberGrouping(newRate) || "0", 18);
      } catch {
        toast.error("New rate is invalid.");
        return;
      }
      if (newRateRaw <= 0n) {
        toast.error("New rate must be greater than 0.");
        return;
      }
      const isSafe = rateModalSingleMode === "single-safe";
      queueVaultCall(
        `${isSafe ? "Safe Approve" : "Approve"} #${rateModalRequestId} with Custom Price`,
        formatDisplayNumber(Number(stripNumberGrouping(newRate)), {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6,
        }),
        isSafe ? "safeApproveRequest" : "approveRequest",
        [requestId, newRateRaw],
        isSafe ? "Safe approve submitted" : "Approve submitted",
        `${isSafe ? "safeApproveRequest" : "approveRequest"}(${requestId.toString()}, ${newRateRaw.toString()})`,
        true,
        null,
        "Custom Price",
      );
      setRateModalSingleMode(null);
      setRateModalRequestId(null);
      return;
    }
    if (rateModalBulkMode === "bulk-new-rate") {
      if (selected.length === 0) {
        toast.error("Select at least one request.");
        return;
      }
      const requestIds: bigint[] = [];
      for (const id of selected) {
        if (!/^\d+$/.test(id)) {
          toast.error(`Invalid request id: ${id}`);
          return;
        }
        requestIds.push(BigInt(id));
      }
      let newRateRaw: bigint;
      try {
        newRateRaw = parseUnits(stripNumberGrouping(newRate) || "0", 18);
      } catch {
        toast.error("New rate is invalid.");
        return;
      }
      if (newRateRaw <= 0n) {
        toast.error("New rate must be greater than 0.");
        return;
      }
      queueVaultCall(
        `Bulk Approve at Custom Price (#${selected.join(", #")})`,
        `${selected.length} requests at rate ${formatDisplayNumber(Number(stripNumberGrouping(newRate)), {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6,
        })}`,
        "safeBulkApproveRequest",
        [requestIds, newRateRaw],
        "Bulk approve at new rate submitted",
        `safeBulkApproveRequest([${requestIds.map((v) => v.toString()).join(", ")}], ${newRateRaw.toString()})`,
        true,
        null,
        "Custom Price",
      );
      setRateModalBulkMode(null);
      return;
    }
    openConfirm(rateModalAction, `Rate: $${newRate}`);
  };

  const handleSaveInstantSettings = () => {
    const parsed = parseInstantSettingsInputs(
      instantFeeInput,
      instantDailyLimitInput,
      mTokenDecimals != null ? Number(mTokenDecimals) : undefined,
    );
    if (!parsed.ok) {
      if (parsed.reason === "fee") {
        toast.error("Instant fee must be a valid non-negative percent.");
      } else if (parsed.reason === "daily_invalid") {
        toast.error("Instant daily limit is invalid.");
      } else {
        toast.error("Instant daily limit must be non-negative.");
      }
      return;
    }
    const { feePercent, feeRaw, dailyLimit } = parsed;
    const steps: Array<{
      functionName: "setInstantFee" | "setInstantDailyLimit";
      args: readonly unknown[];
      successTitle: string;
      human: string;
      contractNote: string;
    }> = [];
    if (instantFee == null || feeRaw !== instantFee) {
      steps.push({
        functionName: "setInstantFee",
        args: [feeRaw],
        successTitle: "Instant fee updated",
        human: `Instant fee: ${formatDisplayNumber(feePercent, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
        contractNote: `setInstantFee(${feeRaw.toString()})`,
      });
    }
    if (instantDailyLimit == null || dailyLimit !== instantDailyLimit) {
      steps.push({
        functionName: "setInstantDailyLimit",
        args: [dailyLimit],
        successTitle: "Instant daily limit updated",
        human: `Instant daily limit: ${instantDailyLimitInput} ${mTokenSymbol ?? "mToken"}`,
        contractNote: `setInstantDailyLimit(${dailyLimit.toString()})`,
      });
    }
    if (steps.length === 0) {
      toast.message("No instant setting changes to save.");
      return;
    }
    setPendingInstantSteps(steps);
    openConfirm(
      "Update instant deposit settings",
      `${steps.length} transaction${steps.length > 1 ? "s" : ""}`,
    );
  };

  const handleSaveVariationTolerance = () => {
    const pct = Number(stripNumberGrouping(variationToleranceInput));
    if (!Number.isFinite(pct) || pct < 0) {
      toast.error("Variation tolerance must be a valid non-negative percent.");
      return;
    }
    const toleranceRaw = BigInt(Math.round(pct * 100));
    queueVaultCall(
      "Set Variation Tolerance",
      `${formatDisplayNumber(pct, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`,
      "setVariationTolerance",
      [toleranceRaw],
      "Variation tolerance updated",
      `setVariationTolerance(${toleranceRaw.toString()})`,
      false,
      null,
      "New Variation Tolerance",
    );
  };

  const handleSaveSupplyCap = () => {
    if (!depositVaultAddr) {
      toast.error("Deposit vault address unavailable.");
      return;
    }
    if (maxSupplyCapOnChain === undefined) {
      toast.error("Could not read current supply cap from chain.");
      return;
    }
    const dec = mTokenDecimals != null ? Number(mTokenDecimals) : 18;
    let cap: bigint;
    try {
      cap = parseUnits(stripNumberGrouping(supplyCapInput) || "0", dec);
    } catch {
      toast.error("Supply cap is invalid for this token’s decimals.");
      return;
    }
    if (cap === maxSupplyCapOnChain) {
      toast.message("No supply cap change to save.");
      return;
    }
    const note = `setMaxSupplyCap(${cap.toString()})`;
    setPendingDepositCapCall({
      cap,
      successTitle: "Max supply cap updated",
      contractNote: note,
    });
    openConfirm(
      "Set Supply Cap",
      `${(() => {
        const capDec = formatUnits(cap, dec);
        const sign = capDec.startsWith("-") ? "-" : "";
        const unsigned = sign ? capDec.slice(1) : capDec;
        const [intPart, fracPart = ""] = unsigned.split(".");
        const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const trimmedFrac = fracPart.replace(/0+$/, "");
        return `${sign}${groupedInt}${trimmedFrac ? `.${trimmedFrac}` : ""}`;
      })()} ${mTokenSymbol ?? "mToken"}`,
      note,
      false,
      null,
      "New Supply Cap",
    );
  };

  const handleWithdrawToken = () => {
    if (!withdrawErc20Addr || !isAddress(withdrawToAddress)) {
      toast.error("Payment token unavailable or recipient address is invalid.");
      return;
    }
    if (withdrawTokenDecimals == null) {
      toast.error("Token decimals not loaded yet; try again in a moment.");
      return;
    }
    let amountRaw: bigint;
    try {
      amountRaw = parseUnits(stripNumberGrouping(withdrawAmountInput) || "0", withdrawTokenDecimals);
    } catch {
      toast.error("Withdraw amount is invalid for this token’s decimals.");
      return;
    }
    if (amountRaw <= 0n) {
      toast.error("Withdraw amount must be greater than 0.");
      return;
    }
    if (withdrawVaultTokenBalance !== undefined && amountRaw > withdrawVaultTokenBalance) {
      toast.error("Amount exceeds this token’s balance in the deposit vault.");
      return;
    }
    const sym =
      paymentTokenRows.find((r) => r.token.toLowerCase() === withdrawErc20Addr.toLowerCase())
        ?.symbol ?? shortAddr(withdrawErc20Addr);
    const amountHuman = formatAmount(amountRaw, withdrawTokenDecimals, 6);
    queueVaultCall(
      "Withdraw Token",
      "",
      "withdrawToken",
      [withdrawErc20Addr, amountRaw, withdrawToAddress as `0x${string}`],
      "Token withdrawn",
      `withdrawToken(${withdrawErc20Addr}, ${amountRaw.toString()}, ${withdrawToAddress})`,
      true,
      [
        { label: "Amount", value: `${amountHuman} ${sym}` },
        { label: "Recipient", value: shortAddr(withdrawToAddress) },
      ],
    );
  };

  const runPendingVaultCall = async () => {
    if (!pendingVaultCall) return;
    if (!vaultAddress || !isAddress(vaultAddress)) {
      throw new Error("Deposit vault address unavailable.");
    }
    if (!isConnected || !walletAddress) {
      throw new Error("Connect wallet first.");
    }
    if (typeof chainId === "number" && walletChainId !== chainId) {
      throw new Error(`Switch wallet to chain ${chainId}.`);
    }
    let hash: `0x${string}`;
    try {
      hash = await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi: manageableVaultAbi,
        functionName: pendingVaultCall.functionName,
        args: pendingVaultCall.args,
        chainId,
      });
    } catch (err) {
      throw new Error(formatTxErrorMessage(err));
    }
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash });
    }
    const refetchPaymentList = Promise.resolve();
    const refetchPaymentConfigs =
      pendingVaultCall.functionName === "changeTokenFee" ||
      pendingVaultCall.functionName === "changeTokenAllowance"
        ? refetchTokensConfigs()
        : Promise.resolve();
    const refetchWithdrawBalance =
      pendingVaultCall.functionName === "withdrawToken" ? refetchWithdrawVaultTokenBalance() : Promise.resolve();
    await Promise.all([
      refetchTokensReceiver(),
      refetchFeeReceiver(),
      refetchVariationTolerance(),
      refetchPaymentList,
      refetchPaymentConfigs,
      refetchWithdrawBalance,
    ]);
    if (typeof chainId === "number") {
      toastChainTxSuccess(pendingVaultCall.successTitle, chainId, hash);
    } else {
      toast.success(pendingVaultCall.successTitle);
    }
    const successLabel: Record<PendingManageableCall["functionName"], string> = {
      setTokensReceiver: "Set Management Wallet Tx",
      setFeeReceiver: "Set Fee Wallet Tx",
      setInstantFee: "Set Instant Fee Tx",
      setInstantDailyLimit: "Set Instant Daily Limit Tx",
      setVariationTolerance: "Set Variation Tolerance Tx",
      safeBulkApproveRequestAtSavedRate: "Bulk Approve at Saved Rate Tx",
      safeBulkApproveRequest: "Bulk Approve Tx",
      safeApproveRequest: "Safe Approve with Custom Price Tx",
      approveRequest: "Approve with Custom Price Tx",
      rejectRequest: "Reject Request Tx",
      changeTokenFee: "Change Payment Token Fee Tx",
      changeTokenAllowance: "Change Payment Token Allowance Tx",
      withdrawToken: "Withdraw Token Tx",
    };
    setConfirmSuccessTxRows([{ label: successLabel[pendingVaultCall.functionName], hash }]);
    if (pendingVaultCall.functionName === "withdrawToken") {
      setWithdrawAmountInput("");
      setWithdrawToAddress("");
    }
    setPendingVaultCall(null);
    setPendingProgressMessage(undefined);
  };

  const runPendingDepositCapCall = async () => {
    if (!pendingDepositCapCall) return;
    if (!depositVaultAddr) {
      throw new Error("Deposit vault address unavailable.");
    }
    if (!isConnected || !walletAddress) {
      throw new Error("Connect wallet first.");
    }
    if (typeof chainId === "number" && walletChainId !== chainId) {
      throw new Error(`Switch wallet to chain ${chainId}.`);
    }
    const hash = await writeContractAsync({
      address: depositVaultAddr,
      abi: depositVaultAbi,
      functionName: "setMaxSupplyCap",
      args: [pendingDepositCapCall.cap],
      chainId,
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash });
    }
    await refetchMaxSupplyCap();
    if (typeof chainId === "number") {
      toastChainTxSuccess(pendingDepositCapCall.successTitle, chainId, hash);
    } else {
      toast.success(pendingDepositCapCall.successTitle);
    }
    setConfirmSuccessTxRows([{ label: "Set Max Supply Cap Tx", hash }]);
    setPendingDepositCapCall(null);
    setPendingProgressMessage(undefined);
  };

  const runPendingInstantSteps = async () => {
    if (!pendingInstantSteps.length) return;
    if (!vaultAddress || !isAddress(vaultAddress)) {
      throw new Error("Deposit vault address unavailable.");
    }
    if (!isConnected || !walletAddress) {
      throw new Error("Connect wallet first.");
    }
    if (typeof chainId === "number" && walletChainId !== chainId) {
      throw new Error(`Switch wallet to chain ${chainId}.`);
    }
    const total = pendingInstantSteps.length;
    const successRows: ConfirmSuccessTxRow[] = [];
    try {
      for (let i = 0; i < total; i += 1) {
        const step = pendingInstantSteps[i];
        const label =
          step.functionName === "setInstantFee" ? "Instant fee" : "Instant daily limit";
        if (total > 1) {
          setInstantBatchProgress({ current: i + 1, total });
          setPendingProgressMessage(
            `Step ${i + 1} of ${total}: ${label} — sign in your wallet, then wait for confirmation.`,
          );
        }
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
        const successLabel =
          step.functionName === "setInstantFee"
            ? "Set Instant Fee Tx"
            : "Set Instant Daily Limit Tx";
        successRows.push({ label: successLabel, hash });
        setConfirmSuccessTxRows([...successRows]);
      }
      await Promise.all([refetchInstantFee(), refetchInstantDailyLimit()]);
    } finally {
      setInstantBatchProgress(null);
      setPendingProgressMessage(undefined);
    }
  };

  const selectedIds = selected.length > 0 ? `#${selected.join(", #")}` : "";

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Deposit Management</h1>
      </motion.div>

      <Card className="bg-card border-border">
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Pending Requests</span>
              <div className="font-mono font-bold text-foreground text-lg">
                {depositRequestsLoading ? "…" : pendingRequestCount}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Supply</span>
              <div className="font-mono font-bold text-foreground text-lg">
                {formatAmount(mTokenSupply, mTokenDecimals != null ? Number(mTokenDecimals) : undefined)}{" "}
                {mTokenSymbol ?? "mToken"}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Instant Daily Limit</span>
              <div className="font-mono text-sm text-foreground">
                {formatAmount(instantDailyLimit, mTokenDecimals != null ? Number(mTokenDecimals) : undefined)}{" "}
                {mTokenSymbol ?? "mToken"}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Instant Fee</span>
              <div className="font-mono text-sm text-foreground">{formatFeePercent(instantFee)}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Max Supply Cap</span>
              <div className="font-mono text-sm text-foreground">
                {maxSupplyCapReadError ? (
                  <span className="text-destructive">—</span>
                ) : maxSupplyCapOnChain != null ? (
                  <>
                    {formatAmount(maxSupplyCapOnChain, mTokenDecimals != null ? Number(mTokenDecimals) : undefined)}{" "}
                    {mTokenSymbol ?? "mToken"}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-display text-sm">Pending Requests</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              className="text-xs"
              disabled={selected.length === 0}
              onClick={() => {
                const requestIds: bigint[] = [];
                for (const id of selected) {
                  if (!/^\d+$/.test(id)) {
                    toast.error(`Invalid request id: ${id}`);
                    return;
                  }
                  requestIds.push(BigInt(id));
                }
                queueVaultCall(
                  `Bulk Approve at Oracle NAV (${selectedIds})`,
                  `${selected.length} requests`,
                  "safeBulkApproveRequest",
                  [requestIds],
                  "Bulk approve submitted",
                  `safeBulkApproveRequest([${requestIds.map((v) => v.toString()).join(", ")}])`,
                  true,
                  null,
                  "Requests",
                );
              }}
            >
              Bulk Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={selected.length === 0}
              onClick={() => {
                const requestIds: bigint[] = [];
                for (const id of selected) {
                  if (!/^\d+$/.test(id)) {
                    toast.error(`Invalid request id: ${id}`);
                    return;
                  }
                  requestIds.push(BigInt(id));
                }
                queueVaultCall(
                  `Bulk Approve at Saved Rate (${selectedIds})`,
                  `${selected.length} requests`,
                  "safeBulkApproveRequestAtSavedRate",
                  [requestIds],
                  "Bulk approve at saved rate submitted",
                  `safeBulkApproveRequestAtSavedRate([${requestIds.map((v) => v.toString()).join(", ")}])`,
                  true,
                  null,
                  "Requests",
                );
              }}
            >
              Bulk Approve at Saved Rate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={selected.length === 0}
              onClick={() => {
                setRateModalBulkMode("bulk-new-rate");
                setRateModalSingleMode(null);
                setRateModalRequestId(null);
                openRateModal(`Bulk Approve at Custom Price (${selectedIds})`, "Bulk Approve at Custom Price");
              }}
            >
              Bulk Approve at Custom Price
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 w-8">
                  <Checkbox
                    checked={selected.length === pendingRequests.length && pendingRequests.length > 0}
                    onCheckedChange={selectAll}
                  />
                </th>
                <th className="text-left py-2 font-medium">#</th>
                <th className="text-left py-2 font-medium">Address</th>
                <th className="text-right py-2 font-medium">Amount ({mTokenSymbol ?? "mToken"})</th>
                <th className="text-right py-2 font-medium">Requested At</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((r) => (
                <>{/* eslint-disable-next-line react/jsx-key */}
                  <tr
                    key={r.id}
                    className="border-b border-border/50 cursor-pointer hover:bg-secondary/30"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="py-2 font-mono">#{r.id}</td>
                    <td className="py-2 font-mono">{r.address}</td>
                    <td className="py-2 font-mono text-right">{r.amount}</td>
                    <td className="py-2 font-mono text-right text-muted-foreground">{r.date}</td>
                  </tr>
                  {expanded === r.id ? (
                    <tr key={`${r.id}-actions`}>
                      <td colSpan={5} className="py-3 px-4 bg-secondary/20">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setRateModalSingleMode("single-safe");
                              setRateModalRequestId(r.id);
                              openRateModal(`Safe Approve #${r.id} with Custom Price`, `Safe Approve #${r.id}`);
                            }}
                          >
                            Safe Approve with Custom Price
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setRateModalSingleMode("single-approve");
                              setRateModalRequestId(r.id);
                              openRateModal(`Approve #${r.id} with Custom Price`, `Approve #${r.id}`);
                            }}
                          >
                            Approve with Custom Price
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => {
                              if (!/^\d+$/.test(r.id)) {
                                toast.error(`Invalid request id: ${r.id}`);
                                return;
                              }
                              const requestId = BigInt(r.id);
                              queueVaultCall(
                                `Reject #${r.id}`,
                                `Request #${r.id}`,
                                "rejectRequest",
                                [requestId],
                                "Request rejected",
                                `rejectRequest(${requestId.toString()})`,
                                true,
                                null,
                                "Request",
                              );
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                          <div>• <strong>Safe Approve</strong>: new rate is subject to variation tolerance check</div>
                          <div>• <strong>Approve</strong>: new rate bypasses variation check</div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </>
              ))}
              {!depositRequestsLoading && !depositRequestsError && pendingRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    No pending deposit requests.
                  </td>
                </tr>
              ) : null}
              {depositRequestsLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    Loading pending requests...
                  </td>
                </tr>
              ) : null}
              {depositRequestsError ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-destructive">
                    Failed to load pending requests.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Wallets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border gap-4 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground">Deposit Vault</div>
              <ManageableVaultAddressWithActions addr={vaultAddress} chainId={chainId} />
            </div>
          </div>
          {walletRows.map((w, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4 flex-wrap"
            >
              <div>
                <div className="text-xs text-muted-foreground">{w.label}</div>
                <ManageableVaultAddressWithActions addr={w.addr} chainId={chainId} />
              </div>
              <div className="flex items-center gap-3">
                {w.addr ? (
                  <a
                    href={`https://debank.com/profile/${w.addr}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View on DeBank ↗
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() =>
                    openWalletEdit(w.label.includes("Management") ? "management" : "fee", w.addr)
                  }
                >
                  Change Address
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-accent" />
            Changing management or fee wallets affects how the deposit vault routes tokens and fees.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Instant Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Instant Fee (%)</label>
              <Input
                value={instantFeeInput}
                onChange={(e) => setInstantFeeInput(formatNumberInputWithGrouping(e.target.value))}
                className="font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Instant Daily Limit ({mTokenSymbol ?? "mToken"})
              </label>
              <Input
                value={instantDailyLimitInput}
                onChange={(e) => setInstantDailyLimitInput(formatNumberInputWithGrouping(e.target.value))}
                className="font-mono mt-1"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveInstantSettings}
            disabled={
              !vaultAddress ||
              instantSettingsTxCount === null ||
              instantSettingsTxCount === 0
            }
          >
            Save Instant Settings
            {instantSettingsTxCount != null && instantSettingsTxCount > 0
              ? ` (${instantSettingsTxCount})`
              : null}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Variation Tolerance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Safe Approval Tolerance (%)</label>
            <Input
              value={variationToleranceInput}
              onChange={(e) => setVariationToleranceInput(formatNumberInputWithGrouping(e.target.value))}
              className="font-mono mt-1 max-w-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveVariationTolerance} disabled={!variationToleranceCanSave}>
            Save
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Supply Cap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Max Supply Cap ({mTokenSymbol ?? "mToken"})
            </label>
            <Input
              value={supplyCapInput}
              onChange={(e) => setSupplyCapInput(formatNumberInputWithGrouping(e.target.value))}
              className="font-mono mt-1 max-w-xs"
              disabled={!depositVaultAddr || maxSupplyCapLoading}
            />
            {maxSupplyCapReadError ? (
              <p className="text-xs text-destructive mt-1">Could not load max supply cap.</p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveSupplyCap} disabled={!supplyCapCanSave}>
            Save
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Underlying Token Management</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 font-medium">Token</th>
                <th className="text-left py-2 font-medium">Oracle</th>
                <th className="text-right py-2 font-medium">Price</th>
                <th className="text-right py-2 font-medium">Fee</th>
                <th className="text-right py-2 font-medium">Capacity</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!depositVaultAddr ? (
                <tr>
                  <td colSpan={6} className="py-4 text-muted-foreground text-center">
                    Select a vault with a deposit vault address to load payment tokens.
                  </td>
                </tr>
              ) : paymentTokensListError ? (
                <tr>
                  <td colSpan={6} className="py-4 text-destructive text-center">
                    Could not load payment tokens from the vault.
                  </td>
                </tr>
              ) : paymentTokensTableLoading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-muted-foreground text-center">
                    Loading payment tokens…
                  </td>
                </tr>
              ) : paymentTokenRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-muted-foreground text-center">
                    No payment tokens configured.
                  </td>
                </tr>
              ) : (
                paymentTokenRows.map(({ token, symbol, cfg }, i) => {
                  const oracle = cfg?.dataFeed;
                  const contractIdx = oraclePriceContracts.slice(0, i + 1).filter(Boolean).length - 1;
                  const rawOraclePrice = readContractsSuccessResult<unknown>(
                    contractIdx >= 0 ? oraclePriceBatch?.[contractIdx] : undefined,
                  );
                  const oraclePrice =
                    typeof rawOraclePrice === "bigint"
                      ? formatDisplayNumber(Number(formatUnits(rawOraclePrice, 18)), {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 6,
                        })
                      : "—";
                  return (
                  <tr key={token} className="border-b border-border/50">
                    <td className="py-2 font-mono" title={token}>
                      {symbol}
                    </td>
                    <td className="py-2">
                      {cfg ? (
                        <ManageableVaultAddressWithActions addr={cfg.dataFeed} chainId={chainId} />
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 font-mono text-right">{oraclePrice}</td>
                    <td className="py-2 font-mono text-right">{cfg ? formatFeePercent(cfg.fee) : "—"}</td>
                    <td
                      className="py-2 font-mono text-right max-w-[11rem] truncate align-middle"
                      title={cfg ? formatUnits(cfg.allowance, PAYMENT_ALLOWANCE_DECIMALS) : undefined}
                    >
                      {cfg ? formatPaymentAllowanceDisplay(cfg.allowance) : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6 px-2"
                          disabled={!cfg}
                          onClick={() => cfg && openEditPaymentTokenFee(token, symbol, cfg.fee)}
                        >
                          Edit Fee
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6 px-2"
                          disabled={!cfg}
                          onClick={() =>
                            cfg && openEditPaymentTokenAllowance(token, symbol, cfg.allowance)
                          }
                        >
                          Edit Capacity
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Withdraw Token from Deposit Vault</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Token</label>
              <div className="mt-1 rounded-md border border-border bg-muted/20 px-3 py-2 font-mono text-sm text-foreground">
                {paymentTokenRows[0]
                  ? `${paymentTokenRows[0].symbol} · ${shortAddr(paymentTokenRows[0].token)}`
                  : "—"}
              </div>
              {!depositVaultAddr ? (
                <p className="text-xs text-muted-foreground mt-1">Load a vault to list payment tokens.</p>
              ) : paymentTokensListError ? (
                <p className="text-xs text-destructive mt-1">Could not load payment tokens.</p>
              ) : !paymentTokensTableLoading && paymentTokenRows.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">No payment tokens configured.</p>
              ) : null}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <Input
                value={withdrawAmountInput}
                onChange={(e) => setWithdrawAmountInput(formatNumberInputWithGrouping(e.target.value))}
                className={cn(
                  "font-mono mt-1",
                  withdrawAmountExceedsVaultBalance && "border-destructive focus-visible:ring-destructive/40",
                )}
                placeholder="0"
              />
              <div className="flex flex-wrap justify-end items-baseline gap-x-2 gap-y-0.5 mt-1 text-right">
                {withdrawVaultBalanceEnabled && withdrawVaultTokenBalanceError ? (
                  <span className="text-xs text-destructive">Could not load vault balance.</span>
                ) : withdrawVaultBalanceEnabled && withdrawVaultTokenBalanceLoading ? (
                  <span className="text-xs text-muted-foreground">Loading vault balance…</span>
                ) : withdrawVaultBalanceReady && withdrawTokenDecimals != null ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      Max Withdrawable: {formatAmount(withdrawVaultTokenBalance, withdrawTokenDecimals, 8)}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                      disabled={withdrawVaultTokenBalance === 0n}
                      onClick={() => {
                        if (withdrawVaultTokenBalance === undefined || withdrawTokenDecimals == null) return;
                        setWithdrawAmountInput(
                          formatNumberInputWithGrouping(
                            formatUnits(withdrawVaultTokenBalance, withdrawTokenDecimals),
                          ),
                        );
                      }}
                    >
                      Max
                    </button>
                  </>
                ) : null}
              </div>
              {withdrawAmountExceedsVaultBalance ? (
                <p className="text-xs text-destructive mt-1 text-right">
                  Amount exceeds balance in the deposit vault.
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Recipient</label>
              <Input
                value={withdrawToAddress}
                onChange={(e) => setWithdrawToAddress(e.target.value)}
                className="font-mono mt-1"
                placeholder="0x..."
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleWithdrawToken} disabled={!withdrawTokenCanSubmit}>
            Withdraw
          </Button>
        </CardContent>
      </Card>

      <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">{rateModalLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Deposit Rate (USD per share)</label>
              <Input value={newRate} onChange={(e) => setNewRate(e.target.value)} className="font-mono mt-1" />
            </div>
            <div className="text-xs text-muted-foreground font-mono">Current Oracle NAV: ${rateModalBaselineNav}</div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRateModalOpen(false)}>Cancel</Button>
            <Button onClick={submitRateModal} disabled={!rateModalCanSubmit}>Submit</Button>
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
                  : "Change Wallet"}
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
            <Button variant="ghost" onClick={() => setWalletEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitWalletEdit} disabled={!walletEditCanContinue}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentTokenEditOpen}
        onOpenChange={(open) => {
          setPaymentTokenEditOpen(open);
          if (!open) {
            setPaymentTokenEditKind(null);
            setPaymentTokenEditToken("");
            setPaymentTokenEditSymbol("");
            setPaymentTokenEditInput("");
            setPaymentTokenEditOnChainFee(null);
            setPaymentTokenEditOnChainAllowance(null);
          }
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">
              {paymentTokenEditKind === "fee"
                ? "Edit payment token fee"
                : paymentTokenEditKind === "allowance"
                  ? "Edit payment token allowance"
                  : "Edit payment token"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground font-mono">
            {paymentTokenEditSymbol}
            {isAddress(paymentTokenEditToken) ? ` · ${paymentTokenEditToken}` : null}
          </p>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              {paymentTokenEditKind === "fee"
                ? "Fee (%)"
                : paymentTokenEditKind === "allowance"
                  ? "Allowance (18-decimal amount)"
                  : "Value"}
            </label>
            <Input
              value={paymentTokenEditInput}
              onChange={(e) => setPaymentTokenEditInput(formatNumberInputWithGrouping(e.target.value))}
              className="font-mono"
              placeholder={paymentTokenEditKind === "fee" ? "0.10" : "500000"}
            />
            {paymentTokenEditKind === "allowance" ? (
              <p className="text-xs text-muted-foreground">
                Must be &gt; 0. Uses token 18-decimal units.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaymentTokenEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPaymentTokenEdit} disabled={!paymentTokenEditCanContinue}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setPendingVaultCall(null);
            setPendingDepositCapCall(null);
            setPendingInstantSteps([]);
            setPendingProgressMessage(undefined);
            setInstantBatchProgress(null);
            setConfirmSuccessTxRows([]);
            setConfirmContractNote("");
            setConfirmActionContractNote("");
            setConfirmValueLabel(undefined);
            setConfirmValueRows(null);
            setRateModalBulkMode(null);
            setRateModalSingleMode(null);
            setRateModalRequestId(null);
          }
        }}
        action={confirmAction}
        actionContractNote={confirmActionContractNote || undefined}
        newValue={confirmValue}
        newValueSecondary={confirmContractNote || undefined}
        newValueLabel={
          confirmValueLabel ??
          (pendingInstantSteps.length
            ? "Batch"
            : confirmContractNote || confirmActionContractNote
              ? "Summary"
              : "New Value")
        }
        valueRows={confirmValueRows ?? undefined}
        summaryRows={
          pendingInstantSteps.length
            ? pendingInstantSteps.map((s) => ({
                human: s.human,
                contractNote: s.contractNote,
              }))
            : undefined
        }
        contractAddress={vaultAddress}
        walletAddress={walletAddress}
        walletFallback={isConnected ? "Connected wallet unavailable" : "Not connected"}
        explorerChainId={chainId}
        onConfirm={
          pendingInstantSteps.length
            ? runPendingInstantSteps
            : pendingDepositCapCall
              ? runPendingDepositCapCall
              : pendingVaultCall
                ? runPendingVaultCall
                : undefined
        }
        pendingMessage={
          pendingProgressMessage ?? "Submit in your wallet and wait for the transaction to be mined."
        }
        batchProgress={instantBatchProgress}
        successTxRows={confirmSuccessTxRows}
      />
    </div>
  );
}
