import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  icon?: React.ReactNode;
}

export function KpiCard({ title, value, unit, change, icon }: KpiCardProps) {
  return (
    <Card className="theme-widget-card theme-metric-card group overflow-hidden">
      <CardContent className="p-0">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-foreground">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
          </div>
          {icon && (
            <div className="theme-widget-icon flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-transform duration-500 group-hover:-translate-y-1">
              {icon}
            </div>
          )}
        </div>
        {change !== undefined && (
          <div className="mt-5 flex items-center gap-1.5 text-xs font-medium">
            {change > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 kpi-up" />
            ) : change < 0 ? (
              <TrendingDown className="h-3.5 w-3.5 kpi-down" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={cn(
              change > 0 && "kpi-up",
              change < 0 && "kpi-down",
              change === 0 && "text-muted-foreground"
            )}>
              {change > 0 ? "+" : ""}{change}%
            </span>
            <span className="text-muted-foreground">versus last period</span>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
}
