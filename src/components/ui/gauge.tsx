import { cn } from "@/lib/utils";

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  thresholds?: { warning: number; danger: number };
  className?: string;
  showPercentage?: boolean;
}

export function Gauge({ value, max, label, thresholds, className, showPercentage = true }: GaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const getColor = () => {
    if (!thresholds) return "bg-primary";
    if (percentage >= thresholds.danger) return "bg-buffer-danger";
    if (percentage >= thresholds.warning) return "bg-buffer-warning";
    return "bg-buffer-safe";
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono">{label}</span>
        {showPercentage && <span className="text-foreground font-mono">{percentage.toFixed(1)}%</span>}
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
