import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Copy, ExternalLink } from "lucide-react";
import {
  ConfirmActionModal,
  type ConfirmSuccessTxRow,
  type ConfirmSummaryRow,
} from "@/components/curator-console/ConfirmActionModal";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";
import { useVaultDetailQuery } from "@/hooks/queries/useVaultDetailQuery";
import { useNavHistoryQuery } from "@/hooks/queries/useNavHistoryQuery";
import { navSnapshotsToChartData, parseDecimal } from "@/domain/vaults/mappers";
import type { NavPeriod } from "@/services/api/vaultsApi";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, isAddress, parseUnits, type Address, zeroAddress } from "viem";
import { toast } from "sonner";
import { normalizeVaultAddress } from "@/lib/evmAddress";
import { getExplorerAddressUrl, getExplorerTxUrl } from "@/lib/explorer";
import { readAggregatorLatestNav } from "@/lib/readAggregatorLatestNav";
import { supportedWagmiChainIds } from "@/lib/wagmi";
import { manageableVaultAbi } from "@/abis/manageableVault";
import { mTokenAbi } from "@/abis/mToken";
import { customAggregatorV3CompatibleFeedAbi } from "@/abis/customAggregatorV3CompatibleFeed";
import { aggregatorV3DecimalsAbi, dataFeedAbi } from "@/abis/dataFeed";
import { planMinMaxAnswerTxs } from "@/lib/dataFeedTxPlan";
import { toastChainTxSuccess } from "@/lib/toastChainTx";
import { useWalletChainGate } from "@/hooks/useWalletChainGate";
import { WalletChainGateOrActions } from "@/components/wallet/WalletChainGateOrActions";
import { showConfirmModalContractDetails } from "@/lib/confirm-modal-env";
import { formatBigIntIntegerForDisplay, formatDisplayNumber } from "@/lib/formatNumbers";

const EMPTY_FEED = { healthyDiffSeconds: "", minPriceHuman: "", maxPriceHuman: "" };

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/** Strip trailing zeros from a decimal string (e.g. "1.010000" → "1.01"). */
function trimDecimalZeros(s: string): string {
  const t = s.trim();
  if (!t.includes(".")) return t;
  return t.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/** Format a number with at most `maxFrac` fraction digits (Western grouping). */
function formatNavPrice(n: number, maxFrac = 6): string {
  if (!Number.isFinite(n)) return String(n);
  return formatDisplayNumber(n, { minimumFractionDigits: 0, maximumFractionDigits: maxFrac });
}

function parseManageableVaultAddr(raw: string | undefined): Address | undefined {
  const t = raw?.trim();
  if (!t || !isAddress(t)) return undefined;
  return normalizeVaultAddress(t) as Address;
}

type PlannedFeedStep =
  | { functionName: "setHealthyDiff"; value: bigint }
  | { functionName: "setMinExpectedAnswer"; value: bigint }
  | { functionName: "setMaxExpectedAnswer"; value: bigint };

const FEED_STEP_SIGNING_LABELS: Record<PlannedFeedStep["functionName"], string> = {
  setHealthyDiff: "Staleness limit",
  setMinExpectedAnswer: "Min. NAV price",
  setMaxExpectedAnswer: "Max. NAV price",
};

function plannedFeedStepToSummaryRow(s: PlannedFeedStep, aggregatorDecimals: number): ConfirmSummaryRow {
  if (s.functionName === "setHealthyDiff") {
    const sec = s.value;
    const secNum = Number(sec);
    const hours = Number.isFinite(secNum) ? secNum / 3600 : null;
    const secGrouped = formatBigIntIntegerForDisplay(sec);
    const human =
      hours != null && hours >= 1
        ? `Staleness Limit: ${secGrouped} seconds (~${formatDisplayNumber(Math.round(hours), { maximumFractionDigits: 0 })}h)`
        : `Staleness Limit: ${secGrouped} seconds`;
    return { human, contractNote: `setHealthyDiff(${sec.toString()})` };
  }
  const priceHuman = formatNavPrice(parseDecimal(formatUnits(s.value, aggregatorDecimals)), 8);
  if (s.functionName === "setMinExpectedAnswer") {
    return {
      human: `Min. NAV Price: ${priceHuman}`,
      contractNote: `setMinExpectedAnswer(${s.value.toString()})`,
    };
  }
  return {
    human: `Max. NAV Price: ${priceHuman}`,
    contractNote: `setMaxExpectedAnswer(${s.value.toString()})`,
  };
}

function OnChainAddressRow({
  label,
  description,
  address,
  placeholder,
  explorerChainId,
}: {
  label: string;
  description?: string;
  address: string | undefined;
  /** Shown when `address` is not a valid 0x (e.g. loading). */
  placeholder?: string;
  explorerChainId: number | null;
}) {
  const trimmed = address?.trim() ?? "";
  const ok = isAddress(trimmed);
  const explorerUrl =
    ok && explorerChainId != null ? getExplorerAddressUrl(explorerChainId, trimmed) : null;
  const display = ok ? trimmed : (placeholder ?? "—");

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      {description ? (
        <p className="text-[10px] text-muted-foreground/80 mt-0.5 leading-snug">{description}</p>
      ) : null}
      <div className="flex items-start gap-2 flex-wrap mt-1.5">
        <span
          className={`text-sm font-mono break-all leading-snug min-w-0 flex-1 ${
            ok ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {display}
        </span>
        {ok ? (
          <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              aria-label={`Copy ${label}`}
              onClick={() => {
                void navigator.clipboard.writeText(trimmed);
                toast.success("Copied address");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors inline-flex"
                aria-label={`View ${label} on block explorer`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Default rows shown in NAV update history table (newest first). */
const NAV_HISTORY_TABLE_PREVIEW = 5;

type ChainNavSnapshot = {
  nav: number;
  updatedAtMs: number;
  roundId: number;
  answerRaw: string;
  /** Set when this snapshot was confirmed from a wallet tx in this session. */
  txHash?: string;
};

type NavHistoryRow = {
  key: string;
  date: string;
  nav: number;
  changePct: number | null;
  txHash?: string;
};

function formatUtcTable(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.toISOString().replace("T", " ").slice(0, 19)} UTC`;
  } catch {
    return iso;
  }
}

export default function NAVManagementPage() {
  const { vault, mTokenAddress, chainId, valid } = useCuratorVaultSummary();
  const { address: walletAddress, isConnected } = useAccount();
  const walletChainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const { mutateAsync: writeContractAsync } = useWriteContract();
  const gate = useWalletChainGate(valid ? chainId : undefined, valid);

  const gradId = useId().replace(/:/g, "");
  const [newNav, setNewNav] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"nav" | "feed">("nav");
  const [confirmAction, setConfirmAction] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  /** NAV confirm only: dev footnote under Action (function + args). */
  const [confirmActionContractNote, setConfirmActionContractNote] = useState<string | undefined>(undefined);
  const [feedSummaryRows, setFeedSummaryRows] = useState<ConfirmSummaryRow[]>([]);
  const [plannedFeedSteps, setPlannedFeedSteps] = useState<PlannedFeedStep[]>([]);
  const [navSubmitKind, setNavSubmitKind] = useState<"safe" | "force" | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const [chainNavSnapshot, setChainNavSnapshot] = useState<ChainNavSnapshot | null>(null);
  const [onChainNavLoading, setOnChainNavLoading] = useState(false);
  const [localNavTxLog, setLocalNavTxLog] = useState<NavHistoryRow[]>([]);
  /** Multi-step DataFeed confirm: current/total for modal progress UI. */
  const [feedBatchProgress, setFeedBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [confirmSuccessTxRows, setConfirmSuccessTxRows] = useState<ConfirmSuccessTxRow[]>([]);

  const chainSupported = typeof chainId === "number" && supportedWagmiChainIds.has(chainId);
  const showContractDevHints = showConfirmModalContractDetails();

  const period: NavPeriod = timeRange === "7d" ? "7d" : timeRange === "90d" ? "90d" : "30d";

  const {
    data: vaultDetail,
    isLoading: vaultDetailLoading,
    isError: vaultDetailError,
  } = useVaultDetailQuery(valid ? chainId : undefined, valid ? mTokenAddress : undefined);

  const depositVaultAddress = useMemo(
    () => parseManageableVaultAddr(vaultDetail?.depositVaultAddress),
    [vaultDetail?.depositVaultAddress],
  );
  const redemptionVaultAddress = useMemo(
    () => parseManageableVaultAddr(vaultDetail?.redemptionVaultAddress),
    [vaultDetail?.redemptionVaultAddress],
  );

  const depositFeedRead = useReadContract({
    address: depositVaultAddress,
    abi: manageableVaultAbi,
    functionName: "mTokenDataFeed",
    chainId,
    query: {
      enabled: Boolean(depositVaultAddress && chainSupported),
    },
  });

  const redeemFeedRead = useReadContract({
    address: redemptionVaultAddress,
    abi: manageableVaultAbi,
    functionName: "mTokenDataFeed",
    chainId,
    query: {
      enabled: Boolean(redemptionVaultAddress && chainSupported),
    },
  });

  const { dataFeedAddress } = useMemo(() => {
    const d = depositFeedRead.data;
    const r = redeemFeedRead.data;
    if (d && d !== zeroAddress) {
      return { dataFeedAddress: d as Address };
    }
    if (r && r !== zeroAddress) {
      return { dataFeedAddress: r as Address };
    }
    return { dataFeedAddress: undefined };
  }, [depositFeedRead.data, redeemFeedRead.data]);

  const canLookupFeedFromVaults =
    Boolean(depositVaultAddress || redemptionVaultAddress) && chainSupported;

  const depositFeedReadSettled =
    !depositVaultAddress || !chainSupported || !depositFeedRead.isLoading;
  const redeemFeedReadSettled =
    !redemptionVaultAddress || !chainSupported || !redeemFeedRead.isLoading;
  const dataFeedAddrReadsSettled = depositFeedReadSettled && redeemFeedReadSettled;

  const dataFeedAddrLoading =
    vaultDetailLoading ||
    (Boolean(depositVaultAddress && chainSupported) && depositFeedRead.isLoading) ||
    (Boolean(redemptionVaultAddress && chainSupported) && redeemFeedRead.isLoading);

  const depositFeedReadFailed = Boolean(
    depositVaultAddress && chainSupported && depositFeedRead.isError,
  );
  const redeemFeedReadFailed = Boolean(
    redemptionVaultAddress && chainSupported && redeemFeedRead.isError,
  );

  /** No non-zero feed after trying deposit / redemption vault reads (or RPC reverted). */
  const dataFeedAddrError =
    !vaultDetailLoading &&
    canLookupFeedFromVaults &&
    dataFeedAddrReadsSettled &&
    !dataFeedAddress &&
    (depositFeedReadFailed || redeemFeedReadFailed);

  const refetchDataFeedAddr = useCallback(async () => {
    const ops: Promise<unknown>[] = [];
    if (depositVaultAddress && chainSupported) ops.push(depositFeedRead.refetch());
    if (redemptionVaultAddress && chainSupported) ops.push(redeemFeedRead.refetch());
    await Promise.all(ops);
  }, [
    chainSupported,
    depositFeedRead.refetch,
    depositVaultAddress,
    redeemFeedRead.refetch,
    redemptionVaultAddress,
  ]);

  const {
    data: onChainHealthyDiff,
    refetch: refetchHealthyDiff,
  } = useReadContract({
    address: dataFeedAddress,
    abi: dataFeedAbi,
    functionName: "healthyDiff",
    chainId,
    query: { enabled: Boolean(dataFeedAddress && chainSupported) },
  });

  const {
    data: onChainMinAnswer,
    refetch: refetchMinAnswer,
  } = useReadContract({
    address: dataFeedAddress,
    abi: dataFeedAbi,
    functionName: "minExpectedAnswer",
    chainId,
    query: { enabled: Boolean(dataFeedAddress && chainSupported) },
  });

  const {
    data: onChainMaxAnswer,
    refetch: refetchMaxAnswer,
  } = useReadContract({
    address: dataFeedAddress,
    abi: dataFeedAbi,
    functionName: "maxExpectedAnswer",
    chainId,
    query: { enabled: Boolean(dataFeedAddress && chainSupported) },
  });

  const {
    data: aggregatorAddress,
    isLoading: aggregatorAddressLoading,
  } = useReadContract({
    address: dataFeedAddress,
    abi: dataFeedAbi,
    functionName: "aggregator",
    chainId,
    query: { enabled: Boolean(dataFeedAddress && chainSupported) },
  });

  const agg =
    aggregatorAddress && aggregatorAddress !== zeroAddress ? (aggregatorAddress as Address) : undefined;

  const { data: aggregatorDecimals } = useReadContract({
    address: agg,
    abi: aggregatorV3DecimalsAbi,
    functionName: "decimals",
    chainId,
    query: { enabled: Boolean(agg && chainSupported) },
  });

  /** CustomAggregatorV3CompatibleFeed — max |Δprice| % allowed for setRoundDataSafe (scaled × 10^8). */
  const {
    data: maxAnswerDeviation,
    isLoading: maxAnswerDeviationLoading,
    isError: maxAnswerDeviationReadError,
  } = useReadContract({
    address: agg,
    abi: customAggregatorV3CompatibleFeedAbi,
    functionName: "maxAnswerDeviation",
    chainId,
    query: { enabled: Boolean(agg && chainSupported) },
  });

  const maxAnswerDeviationPercentDisplay = useMemo(() => {
    if (maxAnswerDeviation == null) return null;
    try {
      const n = parseFloat(formatUnits(maxAnswerDeviation, 8));
      if (!Number.isFinite(n)) return null;
      return `${formatDisplayNumber(n, { minimumFractionDigits: 0, maximumFractionDigits: 6 })}%`;
    } catch {
      return null;
    }
  }, [maxAnswerDeviation]);

  const {
    data: navSnapshots,
    isLoading: navLoading,
    isError: navError,
  } = useNavHistoryQuery(valid ? chainId : undefined, valid ? mTokenAddress : undefined, period);

  const currentNav = useMemo(() => {
    if (vaultDetail) return parseDecimal(vaultDetail.navPerShare);
    if (vault) return vault.navPerShare;
    return 0;
  }, [vaultDetail, vault]);
  const mTokenAddr = useMemo(
    () => (isAddress(mTokenAddress) ? (normalizeVaultAddress(mTokenAddress) as Address) : undefined),
    [mTokenAddress],
  );
  const { data: mTokenSymbol } = useReadContract({
    address: mTokenAddr,
    abi: mTokenAbi,
    functionName: "symbol",
    chainId,
    query: { enabled: Boolean(mTokenAddr && chainSupported) },
  });

  const displayNav = chainNavSnapshot != null && chainNavSnapshot.nav > 0 ? chainNavSnapshot.nav : currentNav;

  useEffect(() => {
    setChainNavSnapshot(null);
    setLocalNavTxLog([]);
  }, [chainId, mTokenAddress]);

  useEffect(() => {
    if (!publicClient || !agg || aggregatorDecimals == null || typeof chainId !== "number") {
      return;
    }
    let cancelled = false;
    setOnChainNavLoading(true);
    void readAggregatorLatestNav(publicClient, {
      address: agg,
      chainId,
      decimals: aggregatorDecimals,
    })
      .then((snap) => {
        if (cancelled) return;
        if (!snap) {
          setChainNavSnapshot(null);
          return;
        }
        setChainNavSnapshot({
          nav: snap.nav,
          updatedAtMs: Number(snap.updatedAtSec) * 1000,
          roundId: Number(snap.roundId),
          answerRaw: snap.answerRaw.toString(),
        });
      })
      .catch(() => {
        if (!cancelled) setChainNavSnapshot(null);
      })
      .finally(() => {
        if (!cancelled) setOnChainNavLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient, agg, aggregatorDecimals, chainId]);

  useEffect(() => {
    if (chainNavSnapshot != null && chainNavSnapshot.nav > 0) {
      setNewNav(formatNavPrice(chainNavSnapshot.nav, 6));
      return;
    }
    const nav =
      vaultDetail != null ? parseDecimal(vaultDetail.navPerShare) : (vault?.navPerShare ?? 0);
    if (nav > 0) setNewNav(formatNavPrice(nav, 6));
  }, [
    chainNavSnapshot?.nav,
    chainNavSnapshot?.roundId,
    chainId,
    mTokenAddress,
    vaultDetail?.navPerShare,
    vault?.navPerShare,
  ]);

  const latestSnapshot = useMemo(() => {
    const s = navSnapshots;
    if (!s?.length) return null;
    return s[s.length - 1];
  }, [navSnapshots]);

  const lastUpdatedAt = useMemo(() => {
    if (!latestSnapshot?.timestamp) return null;
    const d = new Date(latestSnapshot.timestamp);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [latestSnapshot]);

  const displayLastUpdatedMs =
    chainNavSnapshot != null ? chainNavSnapshot.updatedAtMs : (lastUpdatedAt?.getTime() ?? null);

  const hoursSinceUpdate =
    displayLastUpdatedMs != null ? (Date.now() - displayLastUpdatedMs) / 3_600_000 : null;
  const staleRecommended = hoursSinceUpdate != null && hoursSinceUpdate > 12;

  const chartData = useMemo(() => {
    const base = navSnapshotsToChartData(navSnapshots ?? []);
    if (!chainNavSnapshot || chainNavSnapshot.nav <= 0) return base;
    const d = new Date(chainNavSnapshot.updatedAtMs);
    const day = `${d.getMonth() + 1}/${d.getDate()}`;
    const last = base[base.length - 1];
    if (last && last.day === day && Math.abs(last.nav - chainNavSnapshot.nav) < 1e-12) {
      return base.map((p, i) => (i === base.length - 1 ? { ...p, nav: chainNavSnapshot.nav } : p));
    }
    return [...base, { day, nav: chainNavSnapshot.nav }];
  }, [navSnapshots, chainNavSnapshot]);

  const historyTableRows = useMemo(() => {
    const raw = [...(navSnapshots ?? [])].reverse();
    return raw.map((s, i) => {
      const nav = parseDecimal(s.navPerShare);
      const older = raw[i + 1];
      const olderNav = older ? parseDecimal(older.navPerShare) : null;
      const changePct =
        olderNav != null && olderNav > 0 ? ((nav - olderNav) / olderNav) * 100 : null;
      return {
        key: `${s.timestamp}-${i}`,
        date: formatUtcTable(s.timestamp),
        nav,
        changePct,
      } satisfies NavHistoryRow;
    });
  }, [navSnapshots]);

  const mergedHistoryRows = useMemo(() => {
    return [...localNavTxLog, ...historyTableRows];
  }, [localNavTxLog, historyTableRows]);

  const visibleNavHistoryRows = useMemo(
    () => mergedHistoryRows.slice(0, NAV_HISTORY_TABLE_PREVIEW),
    [mergedHistoryRows],
  );

  // DataFeed.sol — healthyDiff (seconds), min/max expected answer (aggregator raw int)
  const [healthyDiffSeconds, setHealthyDiffSeconds] = useState(EMPTY_FEED.healthyDiffSeconds);
  const [minPriceHuman, setMinPriceHuman] = useState(EMPTY_FEED.minPriceHuman);
  const [maxPriceHuman, setMaxPriceHuman] = useState(EMPTY_FEED.maxPriceHuman);
  const [savedFeed, setSavedFeed] = useState(EMPTY_FEED);

  const lastFeedHydrationKey = useRef("");

  useEffect(() => {
    if (!dataFeedAddress || onChainHealthyDiff === undefined || onChainMinAnswer === undefined || onChainMaxAnswer === undefined) {
      return;
    }
    if (aggregatorDecimals == null) return;

    const key = `${chainId}:${dataFeedAddress}:${aggregatorDecimals}`;
    if (lastFeedHydrationKey.current === key) return;
    lastFeedHydrationKey.current = key;

    const h = onChainHealthyDiff.toString();
    const mnHuman = formatUnits(onChainMinAnswer, aggregatorDecimals);
    const mxHuman = formatUnits(onChainMaxAnswer, aggregatorDecimals);
    setHealthyDiffSeconds(h);
    setMinPriceHuman(mnHuman);
    setMaxPriceHuman(mxHuman);
    setSavedFeed({ healthyDiffSeconds: h, minPriceHuman: mnHuman, maxPriceHuman: mxHuman });
  }, [
    aggregatorDecimals,
    chainId,
    dataFeedAddress,
    onChainHealthyDiff,
    onChainMinAnswer,
    onChainMaxAnswer,
  ]);

  useEffect(() => {
    lastFeedHydrationKey.current = "";
  }, [depositVaultAddress, redemptionVaultAddress, chainId]);

  const refetchFeedReads = useCallback(async () => {
    await Promise.all([refetchDataFeedAddr(), refetchHealthyDiff(), refetchMinAnswer(), refetchMaxAnswer()]);
  }, [refetchDataFeedAddr, refetchHealthyDiff, refetchMinAnswer, refetchMaxAnswer]);

  const parsed = parseFloat(newNav) || 0;
  const changePct = displayNav > 0 ? ((parsed - displayNav) / displayNav) * 100 : 0;

  const navHumanParseOk = useMemo(() => {
    if (aggregatorDecimals == null || !newNav.trim()) return false;
    try {
      return parseUnits(newNav.trim(), aggregatorDecimals) > 0n;
    } catch {
      return false;
    }
  }, [aggregatorDecimals, newNav]);

  /** True when parsed NAV matches on-chain latest answer or displayed NAV (no submit needed). */
  const navSubmitValueUnchanged = useMemo(() => {
    if (aggregatorDecimals == null || !newNav.trim()) return true;
    let dataInt: bigint;
    try {
      dataInt = parseUnits(newNav.trim(), aggregatorDecimals);
    } catch {
      return true;
    }
    if (dataInt <= 0n) return true;
    if (chainNavSnapshot?.answerRaw != null) {
      try {
        return dataInt === BigInt(chainNavSnapshot.answerRaw);
      } catch {
        /* compare fallthrough */
      }
    }
    if (displayNav > 0) {
      const parsed = parseFloat(newNav.trim());
      if (!Number.isFinite(parsed)) return true;
      return Math.abs(parsed - displayNav) < 1e-12;
    }
    return false;
  }, [aggregatorDecimals, newNav, chainNavSnapshot?.answerRaw, displayNav]);

  const navChangeExceedsMaxDeviation = useMemo(() => {
    if (maxAnswerDeviation == null) return false;
    if (!Number.isFinite(changePct)) return false;
    try {
      const maxPct = parseFloat(formatUnits(maxAnswerDeviation, 8));
      if (!Number.isFinite(maxPct)) return false;
      return Math.abs(changePct) > maxPct;
    } catch {
      return false;
    }
  }, [maxAnswerDeviation, changePct]);

  const openNavConfirm = async (kind: "safe" | "force") => {
    if (!agg) {
      toast.error("Aggregator address not available — check DataFeed.");
      return;
    }
    if (aggregatorDecimals == null) {
      toast.error("Aggregator decimals not loaded yet.");
      return;
    }
    let dataInt: bigint;
    try {
      dataInt = parseUnits(newNav.trim(), aggregatorDecimals);
    } catch {
      toast.error("Enter a valid decimal NAV (matches aggregator precision).");
      return;
    }
    if (dataInt <= 0n) {
      toast.error("NAV must be positive.");
      return;
    }

    const navHuman = trimDecimalZeros(newNav.trim());

    const contractFn = kind === "safe" ? "setRoundDataSafe" : "setRoundData";
    setNavSubmitKind(kind);
    setConfirmKind("nav");
    setConfirmAction(
      kind === "safe"
        ? "Submit Price update (with variation checking)"
        : "Submit Price update (bypass variation checking)",
    );
    setConfirmValue(navHuman);
    setConfirmActionContractNote(
      `${contractFn}(${dataInt.toString()}) — int256 _data, ${aggregatorDecimals} decimals`,
    );
    setFeedSummaryRows([]);
    setPlannedFeedSteps([]);
    setConfirmSuccessTxRows([]);
    setConfirmOpen(true);
  };

  const runNavRoundUpdate = useCallback(async () => {
    if (navSubmitKind == null) {
      throw new Error("No NAV submit mode.");
    }
    if (!agg) {
      throw new Error("Missing aggregator address.");
    }
    if (!chainSupported) {
      throw new Error("This vault chain is not configured in the app wallet.");
    }
    if (!isConnected || (typeof chainId === "number" && walletChainId !== chainId)) {
      throw new Error("Connect wallet and switch to the vault network.");
    }
    if (aggregatorDecimals == null) {
      throw new Error("Aggregator decimals not loaded.");
    }
    if (!publicClient) {
      throw new Error("No RPC client.");
    }

    let dataInt: bigint;
    try {
      dataInt = parseUnits(newNav.trim(), aggregatorDecimals);
    } catch {
      throw new Error("Invalid NAV decimal string.");
    }
    if (dataInt <= 0n) {
      throw new Error("NAV must be positive.");
    }

    const functionName = navSubmitKind === "safe" ? "setRoundDataSafe" : "setRoundData";

    const hash = await writeContractAsync({
      address: agg,
      abi: customAggregatorV3CompatibleFeedAbi,
      functionName,
      args: [dataInt],
      chainId,
    });

    await publicClient.waitForTransactionReceipt({ hash });

    if (typeof chainId === "number") {
      toastChainTxSuccess(
        functionName === "setRoundDataSafe" ? "NAV updated (setRoundDataSafe)" : "NAV updated (setRoundData)",
        chainId,
        hash,
      );
    }
    setConfirmSuccessTxRows([
      {
        label: functionName === "setRoundDataSafe" ? "Set NAV (Safe) Tx" : "Set NAV Tx",
        hash,
      },
    ]);

    const baselineNav = chainNavSnapshot != null && chainNavSnapshot.nav > 0 ? chainNavSnapshot.nav : currentNav;
    const snap = await readAggregatorLatestNav(publicClient, {
      address: agg,
      chainId,
      decimals: aggregatorDecimals,
    });
    if (!snap) {
      throw new Error("Transaction confirmed but latestRoundData could not be read.");
    }

    setChainNavSnapshot({
      nav: snap.nav,
      updatedAtMs: Number(snap.updatedAtSec) * 1000,
      roundId: Number(snap.roundId),
      answerRaw: snap.answerRaw.toString(),
      txHash: hash,
    });
    setNewNav(formatNavPrice(snap.nav, 6));

    const logChangePct =
      baselineNav > 0 ? ((snap.nav - baselineNav) / baselineNav) * 100 : null;
    setLocalNavTxLog((prev) =>
      [
        {
          key: `tx-${hash}`,
          date: formatUtcTable(new Date(Number(snap.updatedAtSec) * 1000).toISOString()),
          nav: snap.nav,
          changePct: logChangePct,
          txHash: hash,
        },
        ...prev,
      ].slice(0, 24),
    );
  }, [
    agg,
    aggregatorDecimals,
    chainId,
    chainNavSnapshot,
    chainSupported,
    currentNav,
    isConnected,
    navSubmitKind,
    newNav,
    publicClient,
    walletChainId,
    writeContractAsync,
  ]);

  const runPlannedFeedSteps = useCallback(async () => {
    if (!dataFeedAddress || !plannedFeedSteps.length) {
      throw new Error("Missing DataFeed address or planned steps.");
    }
    if (!chainSupported) {
      throw new Error("This vault chain is not configured in the app wallet.");
    }
    if (!isConnected || (typeof chainId === "number" && walletChainId !== chainId)) {
      throw new Error("Connect wallet and switch to the vault network.");
    }

    const stepTitles: Record<PlannedFeedStep["functionName"], string> = {
      setHealthyDiff: "Staleness limit (healthyDiff) updated",
      setMinExpectedAnswer: "Min expected answer updated",
      setMaxExpectedAnswer: "Max expected answer updated",
    };

    const total = plannedFeedSteps.length;
    const successRows: ConfirmSuccessTxRow[] = [];
    try {
      for (let i = 0; i < total; i += 1) {
        const step = plannedFeedSteps[i];
        if (total > 1) {
          setFeedBatchProgress({ current: i + 1, total });
        }
        const hash = await writeContractAsync({
          address: dataFeedAddress,
          abi: dataFeedAbi,
          functionName: step.functionName,
          args: [step.value],
          chainId,
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        if (typeof chainId === "number") {
          toastChainTxSuccess(stepTitles[step.functionName], chainId, hash);
        }
        const successLabel: Record<PlannedFeedStep["functionName"], string> = {
          setHealthyDiff: "Set Staleness Limit Tx",
          setMinExpectedAnswer: "Set Min NAV Price Tx",
          setMaxExpectedAnswer: "Set Max NAV Price Tx",
        };
        successRows.push({ label: successLabel[step.functionName], hash });
        setConfirmSuccessTxRows([...successRows]);
      }

      await refetchFeedReads();
      const nextSaved = {
        healthyDiffSeconds,
        minPriceHuman,
        maxPriceHuman,
      };
      setSavedFeed(nextSaved);
    } finally {
      setFeedBatchProgress(null);
    }
  }, [
    chainId,
    chainSupported,
    dataFeedAddress,
    healthyDiffSeconds,
    isConnected,
    maxPriceHuman,
    minPriceHuman,
    plannedFeedSteps,
    publicClient,
    refetchFeedReads,
    walletChainId,
    writeContractAsync,
  ]);

  const handleSaveFeedSettings = () => {
    if (!dataFeedAddress) {
      toast.error("Could not resolve DataFeed via deposit/redemption vault mTokenDataFeed().");
      return;
    }
    if (onChainHealthyDiff === undefined || onChainMinAnswer === undefined || onChainMaxAnswer === undefined) {
      toast.error("On-chain feed values are still loading.");
      return;
    }
    if (aggregatorDecimals == null) {
      toast.error("Aggregator decimals not loaded yet — cannot convert prices.");
      return;
    }

    let h: bigint;
    let nMin: bigint;
    let nMax: bigint;
    try {
      h = BigInt(healthyDiffSeconds.trim());
      nMin = parseUnits(minPriceHuman.trim(), aggregatorDecimals);
      nMax = parseUnits(maxPriceHuman.trim(), aggregatorDecimals);
    } catch {
      toast.error("Enter a valid integer for staleness (seconds) and decimal prices for min/max.");
      return;
    }

    if (h <= 0n) {
      toast.error("healthyDiff must be > 0 (seconds).");
      return;
    }
    if (nMin <= 0n || nMax <= 0n || nMax <= nMin) {
      toast.error("Expected answers must be positive and max > min (DataFeed.sol).");
      return;
    }

    const steps: PlannedFeedStep[] = [];
    try {
      if (h !== onChainHealthyDiff) {
        steps.push({ functionName: "setHealthyDiff", value: h });
      }
      if (nMin !== onChainMinAnswer || nMax !== onChainMaxAnswer) {
        const boundTxs = planMinMaxAnswerTxs(onChainMinAnswer, onChainMaxAnswer, nMin, nMax);
        for (const t of boundTxs) {
          if (t.kind === "setMinExpectedAnswer") {
            steps.push({ functionName: "setMinExpectedAnswer", value: t.value });
          } else {
            steps.push({ functionName: "setMaxExpectedAnswer", value: t.value });
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid min/max update sequence.");
      return;
    }

    if (steps.length === 0) {
      toast.message("No changes to save.");
      return;
    }

    setPlannedFeedSteps(steps);
    setFeedSummaryRows(steps.map((step) => plannedFeedStepToSummaryRow(step, aggregatorDecimals)));
    setConfirmActionContractNote(undefined);
    setConfirmKind("feed");
    setConfirmAction("Update oracle feed settings");
    setConfirmValue(`${steps.length} transaction${steps.length > 1 ? "s" : ""}`);
    setConfirmSuccessTxRows([]);
    setConfirmOpen(true);
  };

  const handleConfirmOpenChange = (open: boolean) => {
    setConfirmOpen(open);
    if (!open) {
      setPlannedFeedSteps([]);
      setFeedSummaryRows([]);
      setNavSubmitKind(null);
      setConfirmActionContractNote(undefined);
      setFeedBatchProgress(null);
      setConfirmSuccessTxRows([]);
      setConfirmKind("nav");
    }
  };

  const feedConfirmPendingMessage = useMemo(() => {
    if (feedBatchProgress != null && feedBatchProgress.total > 1) {
      const step = plannedFeedSteps[feedBatchProgress.current - 1];
      const label = step ? FEED_STEP_SIGNING_LABELS[step.functionName] : "This step";
      return `Step ${feedBatchProgress.current} of ${feedBatchProgress.total}: ${label} — sign in your wallet, then wait for confirmation.`;
    }
    return "Submit each step in your wallet. Multiple transactions may be required.";
  }, [feedBatchProgress, plannedFeedSteps]);

  const feedChanged =
    healthyDiffSeconds !== savedFeed.healthyDiffSeconds ||
    minPriceHuman !== savedFeed.minPriceHuman ||
    maxPriceHuman !== savedFeed.maxPriceHuman;

  const changedCount = [
    healthyDiffSeconds !== savedFeed.healthyDiffSeconds,
    minPriceHuman !== savedFeed.minPriceHuman,
    maxPriceHuman !== savedFeed.maxPriceHuman,
  ].filter(Boolean).length;

  const minPriceRawPreview = useMemo(() => {
    if (aggregatorDecimals == null) return null;
    const t = minPriceHuman.trim();
    if (!t) return null;
    try {
      return parseUnits(t, aggregatorDecimals).toString();
    } catch {
      return "invalid";
    }
  }, [aggregatorDecimals, minPriceHuman]);

  const maxPriceRawPreview = useMemo(() => {
    if (aggregatorDecimals == null) return null;
    const t = maxPriceHuman.trim();
    if (!t) return null;
    try {
      return parseUnits(t, aggregatorDecimals).toString();
    } catch {
      return "invalid";
    }
  }, [aggregatorDecimals, maxPriceHuman]);

  const feedPricesParseOk =
    aggregatorDecimals != null &&
    minPriceHuman.trim() !== "" &&
    maxPriceHuman.trim() !== "" &&
    minPriceRawPreview !== "invalid" &&
    maxPriceRawPreview !== "invalid";

  const navCardLoading = vaultDetailLoading && !vault;
  const showNavError = vaultDetailError && !vault;

  const explorerChainId =
    valid && typeof chainId === "number" && Number.isFinite(chainId) ? chainId : null;

  const dataFeedRowPlaceholder =
    canLookupFeedFromVaults && dataFeedAddrLoading ? "Loading…" : undefined;

  const aggregatorRowPlaceholder = !dataFeedAddress
    ? undefined
    : aggregatorAddressLoading
      ? "Loading…"
      : !agg
        ? "Aggregator unset or zero address"
        : undefined;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Price Management</h1>
        {vault && <p className="text-sm text-muted-foreground mt-1 font-mono">{vault.name}</p>}
        {showNavError ? (
          <p className="text-xs text-destructive mt-1">Could not load vault detail — NAV may be from list only.</p>
        ) : null}
      </motion.div>

      {/* Combined Current Price + Update Price */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Price per pUSDC</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            {navCardLoading && displayNav <= 0 ? (
              <div className="text-sm text-muted-foreground font-mono">Loading NAV…</div>
            ) : onChainNavLoading && displayNav <= 0 && currentNav <= 0 ? (
              <div className="text-sm text-muted-foreground font-mono">Reading on-chain NAV…</div>
            ) : displayNav > 0 ? (
              <div className="text-3xl font-mono font-bold text-foreground">
                ${formatNavPrice(displayNav, 6)}
                {vaultDetail != null && Number.isFinite(vaultDetail.navChange24h) ? (
                  <span
                    className={`ml-2 inline-flex items-center rounded-md px-2 py-0.5 align-middle text-xs font-medium ${
                      vaultDetail.navChange24h >= 0
                        ? "bg-yield-positive/10 text-yield-positive"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {vaultDetail.navChange24h >= 0 ? "+" : ""}
                    {formatDisplayNumber(vaultDetail.navChange24h, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3,
                    })}
                    % (24h)
                  </span>
                ) : null}
                {chainNavSnapshot && chainNavSnapshot.txHash ? (
                  <span className="block text-[10px] font-normal text-muted-foreground mt-1 normal-case">
                    Updated in this session
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground font-mono">—</div>
            )}
            <div className="text-xs text-muted-foreground font-mono">
              {displayLastUpdatedMs != null ? (
                <>
                  Last updated: {formatUtcTable(new Date(displayLastUpdatedMs).toISOString())} (
                  {formatDistanceToNow(new Date(displayLastUpdatedMs), { addSuffix: true })})
                  {chainNavSnapshot ? "" : ""}
                </>
              ) : navLoading ? (
                "Loading history…"
              ) : (
                "Last updated: — (no snapshots in selected range)"
              )}
            </div>
            {staleRecommended ? (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                <span className="text-accent">Update recommended (&gt;12h since last snapshot in range)</span>
              </div>
            ) : null}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                ON-CHAIN PRICE SOURCE
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <OnChainAddressRow
                  label="DataFeed (mTokenDataFeed)"
                  address={dataFeedAddress}
                  placeholder={dataFeedRowPlaceholder}
                  explorerChainId={explorerChainId}
                />
                <OnChainAddressRow
                  label="Aggregator (price feed)"
                  address={agg ? String(agg) : undefined}
                  placeholder={aggregatorRowPlaceholder}
                  explorerChainId={explorerChainId}
                />
              </div>
              {explorerChainId == null ? (
                <p className="text-[10px] text-muted-foreground">
                  Open this page from a vault route with a valid chain id to get block explorer links (copy still works).
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Update Price
              </span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground cursor-help underline decoration-dotted decoration-border underline-offset-2 hover:text-foreground border-0 bg-transparent p-0 text-left font-sans shrink-0"
                    >
                      Max NAV deviation:{" "}
                      <span className="font-mono text-foreground tabular-nums">
                        {maxAnswerDeviationLoading
                          ? "…"
                          : maxAnswerDeviationReadError || maxAnswerDeviationPercentDisplay == null
                            ? "—"
                            : maxAnswerDeviationPercentDisplay}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">
                    {maxAnswerDeviationLoading ? (
                      <p className="m-0">Loading this limit from the price feed…</p>
                    ) : maxAnswerDeviationReadError || maxAnswerDeviationPercentDisplay == null ? (
                      <p className="m-0">
                        We couldn&apos;t read this limit. The address may not be a manual TermMax-style price feed, or
                        the network request failed. You can still try <strong>Submit update</strong> or{" "}
                        <strong>Force submit</strong>; if the feed doesn&apos;t support this check, behavior depends on
                        the contract.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="m-0">
                          With <strong>Submit update</strong>, the new NAV can only move this much compared to the last
                          NAV already stored on chain. If you go further, the transaction will be rejected.
                        </p>
                        <p className="m-0">
                          Use <strong>Force submit</strong> when you intentionally need a larger step. The feed may
                          still block values outside its own lowest and highest allowed prices.
                        </p>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                New Price (USD, {aggregatorDecimals ?? "…"} decimal places)
              </label>
              <Input value={newNav} onChange={(e) => setNewNav(e.target.value)} className="font-mono mt-1 h-9" />
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              Change: {changePct >= 0 ? "+" : ""}
              {formatDisplayNumber(changePct, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}%
            </div>
            <WalletChainGateOrActions gate={gate}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 w-full">
                <Button
                  size="sm"
                  className="sm:flex-1 h-8 text-xs"
                  disabled={
                    !agg ||
                    aggregatorDecimals == null ||
                    !navHumanParseOk ||
                    navSubmitValueUnchanged ||
                    navChangeExceedsMaxDeviation
                  }
                  onClick={() => void openNavConfirm("safe")}
                >
                  Submit update
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="sm:flex-1 h-8 text-xs"
                  disabled={
                    !agg ||
                    aggregatorDecimals == null ||
                    !navHumanParseOk ||
                    navSubmitValueUnchanged
                  }
                  onClick={() => void openNavConfirm("force")}
                  title="Force submit Price update"
                >
                  Force submit
                </Button>
              </div>
            </WalletChainGateOrActions>
            {navChangeExceedsMaxDeviation ? (
              <p className="text-[10px] text-destructive leading-snug">
                New Price exceeds Max Price deviation. Use Force submit if this larger move is intentional.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Price History chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-sm">Price History</CardTitle>
          <div className="flex gap-1">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <Button
                key={r}
                variant={timeRange === r ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2 font-mono"
                onClick={() => setTimeRange(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {navError && chartData.length > 0 ? (
            <p className="text-[10px] text-muted-foreground mb-2">API history failed; showing available on-chain NAV.</p>
          ) : null}
          {navError && chartData.length === 0 ? (
            <p className="text-xs text-destructive py-6">Could not load NAV history from API.</p>
          ) : navLoading && chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6">Loading NAV history…</p>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">No NAV history for this range.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }}
                    tickFormatter={(v: number) => formatNavPrice(v, 6)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(220, 18%, 10%)",
                      border: "1px solid hsl(220, 15%, 16%)",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`$${formatNavPrice(value, 6)}`, "Price"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="nav"
                    stroke="hsl(187, 100%, 50%)" 
                    fill={`url(#${gradId})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">Date/Time (UTC)</th>
                  <th className="text-right py-2 font-medium">Price</th>
                  <th className="text-right py-2 font-medium">Change</th>
                  <th className="text-right py-2 font-medium">Updated By</th>
                </tr>
              </thead>
              <tbody>
                {navError && mergedHistoryRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-destructive">
                      Failed to load history.
                    </td>
                  </tr>
                ) : navLoading && mergedHistoryRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : mergedHistoryRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      No rows for this range.
                    </td>
                  </tr>
                ) : (
                  visibleNavHistoryRows.map((row) => (
                    <tr key={row.key} className="border-b border-border/50">
                      <td className="py-2 font-mono">{row.date}</td>
                      <td className="py-2 font-mono text-right">{formatNavPrice(row.nav, 6)}</td>
                      <td
                        className={`py-2 font-mono text-right ${
                          row.changePct == null
                            ? "text-muted-foreground"
                            : row.changePct >= 0
                              ? "text-yield-positive"
                              : "text-destructive"
                        }`}
                      >
                        {row.changePct == null
                          ? "—"
                          : `${row.changePct >= 0 ? "+" : ""}${formatDisplayNumber(row.changePct, { minimumFractionDigits: 0, maximumFractionDigits: 3 })}%`}
                      </td>
                      <td className="py-2 font-mono text-right">
                        {row.txHash && explorerChainId != null ? (
                          <a
                            href={getExplorerTxUrl(explorerChainId, row.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-0.5 justify-end"
                          >
                            <span className="font-mono">{shortAddr(row.txHash)}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {mergedHistoryRows.length > NAV_HISTORY_TABLE_PREVIEW ? (
              <p className="text-[10px] text-muted-foreground mt-2">
                Showing {NAV_HISTORY_TABLE_PREVIEW} most recent of {mergedHistoryRows.length} (API + on-chain submits in
                this session).
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Price Feed Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Price Feed Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
              {canLookupFeedFromVaults && dataFeedAddrLoading ? (
                <p className="text-xs text-muted-foreground font-mono">
                  Loading DataFeed via mTokenDataFeed() from deposit / redemption vault…
                </p>
              ) : null}
              {dataFeedAddrError ? (
                <p className="text-xs text-destructive">
                  Could not read mTokenDataFeed() from deposit or redemption vault (RPC reverted or call failed).
                </p>
              ) : null}
              {vaultDetail && !vaultDetailLoading && !canLookupFeedFromVaults && chainSupported ? (
                <p className="text-xs text-destructive">
                  API vault detail has no valid depositVaultAddress / redemptionVaultAddress — cannot locate DataFeed.
                </p>
              ) : null}
              {canLookupFeedFromVaults &&
                dataFeedAddrReadsSettled &&
                !dataFeedAddress &&
                !vaultDetailLoading &&
                !dataFeedAddrError ? (
                <p className="text-xs text-destructive">
                  mTokenDataFeed() returned zero on both deposit and redemption vaults — not configured.
                </p>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">
                    healthyDiff (seconds)
                  </label>
                  <Input
                    value={healthyDiffSeconds}
                    onChange={(e) => setHealthyDiffSeconds(e.target.value)}
                    className="font-mono mt-1"
                    disabled={!dataFeedAddress}
                  />
                  {showContractDevHints && healthyDiffSeconds !== savedFeed.healthyDiffSeconds && (
                    <span className="text-[10px] text-accent font-mono">→ setHealthyDiff(uint256)</span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min expected price (human)</label>
                  <Input
                    value={minPriceHuman}
                    onChange={(e) => setMinPriceHuman(e.target.value)}
                    className="font-mono mt-1"
                    placeholder="e.g. 0.95"
                    disabled={!dataFeedAddress}
                  />
                  {aggregatorDecimals == null && dataFeedAddress ? (
                    <p className="text-[10px] text-muted-foreground mt-1">Loading aggregator decimals for price conversion…</p>
                  ) : minPriceRawPreview === "invalid" ? (
                    <p className="text-[10px] text-destructive mt-1">Invalid number for this decimal precision.</p>
                  ) : showContractDevHints && minPriceRawPreview != null ? (
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">
                      Contract call: <span className="text-foreground/90">{minPriceRawPreview}</span>{" "}
                      <span className="text-muted-foreground/80">(int256)</span>
                    </p>
                  ) : null}
                  {showContractDevHints &&
                  minPriceHuman !== savedFeed.minPriceHuman &&
                  minPriceRawPreview !== "invalid" ? (
                    <span className="text-[10px] text-accent font-mono block mt-0.5">→ setMinExpectedAnswer(int256)</span>
                  ) : null}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max expected price (human)</label>
                  <Input
                    value={maxPriceHuman}
                    onChange={(e) => setMaxPriceHuman(e.target.value)}
                    className="font-mono mt-1"
                    placeholder="e.g. 1.10"
                    disabled={!dataFeedAddress}
                  />
                  {aggregatorDecimals == null && dataFeedAddress ? null : maxPriceRawPreview === "invalid" ? (
                    <p className="text-[10px] text-destructive mt-1">Invalid number for this decimal precision.</p>
                  ) : showContractDevHints && maxPriceRawPreview != null ? (
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">
                      Contract call: <span className="text-foreground/90">{maxPriceRawPreview}</span>{" "}
                      <span className="text-muted-foreground/80">(int256)</span>
                    </p>
                  ) : null}
                  {showContractDevHints &&
                  maxPriceHuman !== savedFeed.maxPriceHuman &&
                  maxPriceRawPreview !== "invalid" ? (
                    <span className="text-[10px] text-accent font-mono block mt-0.5">→ setMaxExpectedAnswer(int256)</span>
                  ) : null}
                </div>
              </div>
              <WalletChainGateOrActions gate={gate}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!feedChanged || !dataFeedAddress || !feedPricesParseOk}
                  onClick={handleSaveFeedSettings}
                >
                  Save Feed Settings {feedChanged && `(${changedCount} field${changedCount > 1 ? "s" : ""})`}
                </Button>
              </WalletChainGateOrActions>
        </CardContent>
      </Card>

      <ConfirmActionModal
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        action={confirmAction}
        actionContractNote={confirmKind === "nav" ? confirmActionContractNote : undefined}
        newValue={confirmValue}
        newValueLabel={
          confirmKind === "nav" ? "New Price" : confirmKind === "feed" ? "Batch" : "New Value"
        }
        contractAddress={
          confirmKind === "feed" && dataFeedAddress
            ? dataFeedAddress
            : confirmKind === "nav" && agg
              ? String(agg)
              : undefined
        }
        walletAddress={walletAddress}
        walletFallback={
          !walletAddress && isConnected ? "Connected" : !isConnected ? "Not connected" : undefined
        }
        explorerChainId={explorerChainId}
        summaryRows={confirmKind === "feed" && feedSummaryRows.length ? feedSummaryRows : undefined}
        onConfirm={
          confirmKind === "feed"
            ? runPlannedFeedSteps
            : confirmKind === "nav" && navSubmitKind
              ? runNavRoundUpdate
              : undefined
        }
        pendingMessage={
          confirmKind === "feed"
            ? feedConfirmPendingMessage
            : confirmKind === "nav"
              ? "Submit in your wallet and wait for confirmation."
              : undefined
        }
        batchProgress={confirmKind === "feed" ? feedBatchProgress : null}
        successTxRows={confirmSuccessTxRows}
      />
    </div>
  );
}
