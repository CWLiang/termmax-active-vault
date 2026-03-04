import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "primary" | "accent";
  className?: string;
}

export function StatCard({ label, value, subValue, icon, trend, variant = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-muted-foreground/30",
        variant === "primary" && "border-primary/20 glow-primary",
        variant === "accent" && "border-accent/20 glow-accent",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-display font-bold",
            variant === "primary" && "text-primary",
            variant === "accent" && "text-accent",
            variant === "default" && "text-foreground"
          )}
        >
          {value}
        </span>
        {subValue && (
          <span
            className={cn(
              "text-sm font-mono",
              trend === "up" && "text-yield-positive",
              trend === "down" && "text-yield-negative",
              trend === "neutral" && "text-muted-foreground",
              !trend && "text-muted-foreground"
            )}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
