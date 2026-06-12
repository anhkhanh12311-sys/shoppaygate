import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const KpiCard = ({
  label, value, icon: Icon, hint, accent = "from-primary/15 to-primary/5",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  accent?: string;
  className?: string;
}) => (
  <div className={cn(
    "rounded-2xl border bg-card/40 backdrop-blur-xl p-4 relative overflow-hidden",
    "hover:border-primary/40 transition-colors",
    className,
  )}>
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", accent)} />
    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight truncate">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      {Icon && (
        <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4.5 w-4.5" />
        </div>
      )}
    </div>
  </div>
);
