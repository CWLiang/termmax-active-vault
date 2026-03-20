import { useEffect, useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { ConfirmActionModal } from "@/components/curator-console/ConfirmActionModal";
import { useCuratorVaultSummary } from "@/hooks/useCuratorVaultRoute";
import { useVaultDetailQuery } from "@/hooks/queries/useVaultDetailQuery";
import { useNavHistoryQuery } from "@/hooks/queries/useNavHistoryQuery";
import { navSnapshotsToChartData, parseDecimal } from "@/domain/vaults/mappers";
import type { NavPeriod } from "@/services/api/vaultsApi";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const DEFAULTS = { healthyDiff: "500", minNav: "0.90", maxNav: "2.00" };

/** Default rows shown in NAV update history table (newest first). */
const NAV_HISTORY_TABLE_PREVIEW = 5;

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
  const gradId = useId().replace(/:/g, "");
  const [newNav, setNewNav] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const period: NavPeriod = timeRange === "7d" ? "7d" : timeRange === "90d" ? "90d" : "30d";

  const {
    data: vaultDetail,
    isLoading: vaultDetailLoading,
    isError: vaultDetailError,
  } = useVaultDetailQuery(valid ? chainId : undefined, valid ? mTokenAddress : undefined);

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

  const underlyingSymbol = vaultDetail?.underlyingSymbol ?? vault?.underlyingSymbol ?? "share";

  useEffect(() => {
    const nav =
      vaultDetail != null ? parseDecimal(vaultDetail.navPerShare) : (vault?.navPerShare ?? 0);
    if (nav > 0) setNewNav(nav.toFixed(6));
  }, [chainId, mTokenAddress, vaultDetail?.navPerShare, vault?.navPerShare]);

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

  const hoursSinceUpdate =
    lastUpdatedAt != null ? (Date.now() - lastUpdatedAt.getTime()) / 3_600_000 : null;
  const staleRecommended = hoursSinceUpdate != null && hoursSinceUpdate > 12;

  const chartData = useMemo(() => navSnapshotsToChartData(navSnapshots ?? []), [navSnapshots]);

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
      };
    });
  }, [navSnapshots]);

  const visibleNavHistoryRows = useMemo(
    () => historyTableRows.slice(0, NAV_HISTORY_TABLE_PREVIEW),
    [historyTableRows],
  );

  // Feed settings with change tracking
  const [healthyDiff, setHealthyDiff] = useState(DEFAULTS.healthyDiff);
  const [minNav, setMinNav] = useState(DEFAULTS.minNav);
  const [maxNav, setMaxNav] = useState(DEFAULTS.maxNav);
  const [savedFeed, setSavedFeed] = useState({ ...DEFAULTS });

  const [feedQueue, setFeedQueue] = useState<Array<{ action: string; value: string }>>([]);
  const [feedQueueIndex, setFeedQueueIndex] = useState(0);

  const parsed = parseFloat(newNav) || 0;
  const changePct = currentNav > 0 ? ((parsed - currentNav) / currentNav) * 100 : 0;
  const inRange = Math.abs(changePct) <= 5;

  const openConfirm = (action: string, value?: string) => {
    setConfirmAction(action);
    setConfirmValue(value || "");
    setConfirmOpen(true);
  };

  const handleSaveFeedSettings = () => {
    const changes: Array<{ action: string; value: string }> = [];
    if (healthyDiff !== savedFeed.healthyDiff) {
      changes.push({ action: "setHealthyDiff", value: `${healthyDiff} bps` });
    }
    if (minNav !== savedFeed.minNav) {
      changes.push({ action: "setMinExpectedNav", value: minNav });
    }
    if (maxNav !== savedFeed.maxNav) {
      changes.push({ action: "setMaxExpectedNav", value: maxNav });
    }
    if (changes.length === 0) return;

    setFeedQueue(changes);
    setFeedQueueIndex(0);
    openConfirm(changes[0].action, changes[0].value);
  };

  const handleFeedConfirmClose = (open: boolean) => {
    if (!open) {
      const nextIdx = feedQueueIndex + 1;
      if (nextIdx < feedQueue.length) {
        setFeedQueueIndex(nextIdx);
        setTimeout(() => {
          openConfirm(feedQueue[nextIdx].action, feedQueue[nextIdx].value);
        }, 300);
      } else {
        setSavedFeed({ healthyDiff, minNav, maxNav });
        setFeedQueue([]);
        setFeedQueueIndex(0);
        setConfirmOpen(false);
      }
    }
  };

  const feedChanged = healthyDiff !== savedFeed.healthyDiff || minNav !== savedFeed.minNav || maxNav !== savedFeed.maxNav;
  const changedCount = [
    healthyDiff !== savedFeed.healthyDiff,
    minNav !== savedFeed.minNav,
    maxNav !== savedFeed.maxNav,
  ].filter(Boolean).length;

  const navCardLoading = vaultDetailLoading && !vault;
  const showNavError = vaultDetailError && !vault;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">NAV Management</h1>
        {vault && <p className="text-sm text-muted-foreground mt-1 font-mono">{vault.name}</p>}
        {showNavError ? (
          <p className="text-xs text-destructive mt-1">Could not load vault detail — NAV may be from list only.</p>
        ) : null}
      </motion.div>

      {/* Combined Current NAV + Update NAV */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">NAV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            {navCardLoading ? (
              <div className="text-sm text-muted-foreground font-mono">Loading NAV…</div>
            ) : currentNav > 0 ? (
              <div className="text-3xl font-mono font-bold text-foreground">
                {currentNav.toFixed(4)}{" "}
                <span className="text-base text-muted-foreground font-normal">{underlyingSymbol} per share</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground font-mono">—</div>
            )}
            <div className="text-xs text-muted-foreground font-mono">
              {lastUpdatedAt ? (
                <>
                  Last updated: {formatUtcTable(latestSnapshot!.timestamp)} (
                  {formatDistanceToNow(lastUpdatedAt, { addSuffix: true })})
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
            <div className="flex gap-4 text-xs text-muted-foreground font-mono">
              <span>Staleness limit: 25h</span>
              <span>Deviation limit: ±5%</span>
              {vaultDetail != null && Number.isFinite(vaultDetail.navChange24h) ? (
                <span className={vaultDetail.navChange24h >= 0 ? "text-yield-positive" : "text-destructive"}>
                  API 24h: {vaultDetail.navChange24h >= 0 ? "+" : ""}
                  {vaultDetail.navChange24h.toFixed(3)}%
                </span>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Update NAV</div>
            <div>
              <label className="text-xs text-muted-foreground">New NAV (6 decimal places)</label>
              <Input value={newNav} onChange={(e) => setNewNav(e.target.value)} className="font-mono mt-1" />
            </div>
            <div className={`text-sm font-mono ${inRange ? "text-yield-positive" : "text-destructive"}`}>
              Change: {changePct >= 0 ? "+" : ""}
              {changePct.toFixed(3)}% —{" "}
              {currentNav > 0
                ? inRange
                  ? "Within allowed range (±5%)"
                  : "Outside allowed range (±5%)"
                : "Set current NAV from API first"}
            </div>
            <Button className="w-full" onClick={() => openConfirm("setRoundDataSafe", newNav)}>
              Submit NAV Update
            </Button>
            <div className="border-t border-border pt-4 space-y-2">
              <Button variant="destructive" className="w-full" onClick={() => openConfirm("setRoundData (force)", newNav)}>
                Force Submit NAV Update
              </Button>
              <p className="text-xs text-muted-foreground">Use only when change is outside allowed range</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NAV History chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-sm">NAV History</CardTitle>
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
          {navError ? (
            <p className="text-xs text-destructive py-6">Could not load NAV history from API.</p>
          ) : navLoading ? (
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
                    tickFormatter={(v: number) => v.toFixed(4)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(220, 18%, 10%)",
                      border: "1px solid hsl(220, 15%, 16%)",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value.toFixed(4)}`, "NAV / share"]}
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
                  <th className="text-right py-2 font-medium">NAV</th>
                  <th className="text-right py-2 font-medium">Change</th>
                  <th className="text-right py-2 font-medium">Updated By</th>
                </tr>
              </thead>
              <tbody>
                {navError ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-destructive">
                      Failed to load history.
                    </td>
                  </tr>
                ) : navLoading ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : historyTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      No rows for this range.
                    </td>
                  </tr>
                ) : (
                  visibleNavHistoryRows.map((row) => (
                    <tr key={row.key} className="border-b border-border/50">
                      <td className="py-2 font-mono">{row.date}</td>
                      <td className="py-2 font-mono text-right">{row.nav.toFixed(4)}</td>
                      <td
                        className={`py-2 font-mono text-right ${
                          row.changePct == null
                            ? "text-muted-foreground"
                            : row.changePct >= 0
                              ? "text-yield-positive"
                              : "text-destructive"
                        }`}
                      >
                        {row.changePct == null ? "—" : `${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(3)}%`}
                      </td>
                      <td className="py-2 font-mono text-right text-muted-foreground">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {historyTableRows.length > NAV_HISTORY_TABLE_PREVIEW ? (
              <p className="text-[10px] text-muted-foreground mt-2">
                Showing {NAV_HISTORY_TABLE_PREVIEW} most recent of {historyTableRows.length} in this range.
              </p>
            ) : null}
            <p className="text-[10px] text-muted-foreground mt-2">
              Snapshot API does not include updater address; on-chain indexer can replace &quot;Updated By&quot; later.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feed Settings */}
      <Collapsible>
        <Card className="bg-card border-border">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between cursor-pointer">
              <CardTitle className="font-display text-sm">Advanced: Feed Settings</CardTitle>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Healthy Diff (bps)</label>
                  <Input value={healthyDiff} onChange={(e) => setHealthyDiff(e.target.value)} className="font-mono mt-1" />
                  {healthyDiff !== savedFeed.healthyDiff && (
                    <span className="text-[10px] text-accent font-mono">changed → will call setHealthyDiff</span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min Expected NAV</label>
                  <Input value={minNav} onChange={(e) => setMinNav(e.target.value)} className="font-mono mt-1" />
                  {minNav !== savedFeed.minNav && (
                    <span className="text-[10px] text-accent font-mono">changed → will call setMinExpectedNav</span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Expected NAV</label>
                  <Input value={maxNav} onChange={(e) => setMaxNav(e.target.value)} className="font-mono mt-1" />
                  {maxNav !== savedFeed.maxNav && (
                    <span className="text-[10px] text-accent font-mono">changed → will call setMaxExpectedNav</span>
                  )}
                </div>
              </div>
              <Button variant="outline" disabled={!feedChanged} onClick={handleSaveFeedSettings}>
                Save Feed Settings {feedChanged && `(${changedCount} tx${changedCount > 1 ? "s" : ""})`}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <ConfirmActionModal
        open={confirmOpen}
        onOpenChange={feedQueue.length > 0 ? handleFeedConfirmClose : setConfirmOpen}
        action={confirmAction}
        newValue={confirmValue}
      />
    </div>
  );
}
