import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  loading?: boolean;
  className?: string;
}

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-destructive",
  accent: "text-primary",
};

export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading,
  className,
}: StatCardProps) => (
  <Card
    className={cn(
      "relative overflow-hidden rounded-2xl border-border/60 bg-card/70 p-4 backdrop-blur-sm transition-colors hover:border-primary/40",
      className,
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
    </div>
    {loading ? (
      <Skeleton className="mt-3 h-7 w-24" />
    ) : (
      <p className={cn("mt-2 font-display text-2xl font-bold tracking-tight", toneMap[tone])}>
        {value}
      </p>
    )}
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </Card>
);

export default StatCard;
