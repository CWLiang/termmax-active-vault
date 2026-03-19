import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { ConfirmActionModal } from "@/components/curator-console/ConfirmActionModal";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const navHistory = [
  { date: "2026-03-19 09:32", nav: 1.1162, change: "+0.028%", by: "0x1a2b…" },
  { date: "2026-03-18 08:15", nav: 1.1159, change: "+0.031%", by: "0x1a2b…" },
  { date: "2026-03-17 09:00", nav: 1.1155, change: "+0.022%", by: "0x1a2b…" },
  { date: "2026-03-16 08:45", nav: 1.1153, change: "+0.018%", by: "0x1a2b…" },
  { date: "2026-03-15 09:10", nav: 1.1151, change: "+0.025%", by: "0x1a2b…" },
];

const chartData = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  nav: 1.1 + i * 0.0006 + Math.random() * 0.001,
}));

const DEFAULTS = { healthyDiff: "500", minNav: "0.90", maxNav: "2.00" };

export default function NAVManagementPage() {
  const [newNav, setNewNav] = useState("1.116800");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [timeRange, setTimeRange] = useState("30d");

  // Feed settings with change tracking
  const [healthyDiff, setHealthyDiff] = useState(DEFAULTS.healthyDiff);
  const [minNav, setMinNav] = useState(DEFAULTS.minNav);
  const [maxNav, setMaxNav] = useState(DEFAULTS.maxNav);
  const [savedFeed, setSavedFeed] = useState({ ...DEFAULTS });

  // Queue for sequential feed setting txs
  const [feedQueue, setFeedQueue] = useState<Array<{ action: string; value: string }>>([]);
  const [feedQueueIndex, setFeedQueueIndex] = useState(0);

  const currentNav = 1.1162;
  const parsed = parseFloat(newNav) || 0;
  const changePct = ((parsed - currentNav) / currentNav) * 100;
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

    // Start processing the queue
    setFeedQueue(changes);
    setFeedQueueIndex(0);
    openConfirm(changes[0].action, changes[0].value);
  };

  const handleFeedConfirmClose = (open: boolean) => {
    if (!open) {
      // Move to next in queue
      const nextIdx = feedQueueIndex + 1;
      if (nextIdx < feedQueue.length) {
        setFeedQueueIndex(nextIdx);
        setTimeout(() => {
          openConfirm(feedQueue[nextIdx].action, feedQueue[nextIdx].value);
        }, 300);
      } else {
        // All done, update saved state
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

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">NAV Management</h1>
      </motion.div>

      {/* Combined Current NAV + Update NAV */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="font-display text-sm">NAV</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {/* Current NAV section */}
          <div className="space-y-2">
            <div className="text-3xl font-mono font-bold text-foreground">${currentNav.toFixed(4)} <span className="text-base text-muted-foreground font-normal">per share</span></div>
            <div className="text-xs text-muted-foreground font-mono">Last updated: 2026-03-19 09:32 UTC (14h ago)</div>
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-accent" />
              <span className="text-accent">Update recommended (&gt;12h)</span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground font-mono">
              <span>Staleness limit: 25h</span>
              <span>Deviation limit: ±5%</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Update NAV section */}
          <div className="space-y-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Update NAV</div>
            <div>
              <label className="text-xs text-muted-foreground">New NAV (USD, 6 decimal places)</label>
              <Input value={newNav} onChange={(e) => setNewNav(e.target.value)} className="font-mono mt-1" />
            </div>
            <div className={`text-sm font-mono ${inRange ? "text-yield-positive" : "text-destructive"}`}>
              Change: {changePct >= 0 ? "+" : ""}{changePct.toFixed(3)}% — {inRange ? "Within allowed range (±5%)" : "Outside allowed range (±5%)"}
            </div>
            <Button className="w-full" onClick={() => openConfirm("setRoundDataSafe", newNav)}>Submit NAV Update</Button>
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
            {["7d", "30d", "90d"].map((r) => (
              <Button key={r} variant={timeRange === r ? "default" : "ghost"} size="sm" className="text-xs h-7 px-2 font-mono" onClick={() => setTimeRange(r)}>
                {r}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "hsl(215, 15%, 55%)" }} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 15%, 16%)", fontSize: 12 }} />
                <Area type="monotone" dataKey="nav" stroke="hsl(187, 100%, 50%)" fill="url(#navGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
                {navHistory.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 font-mono">{row.date}</td>
                    <td className="py-2 font-mono text-right">${row.nav.toFixed(4)}</td>
                    <td className="py-2 font-mono text-right text-yield-positive">{row.change}</td>
                    <td className="py-2 font-mono text-right text-muted-foreground">{row.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <Button
                variant="outline"
                disabled={!feedChanged}
                onClick={handleSaveFeedSettings}
              >
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
