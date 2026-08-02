import { ReactNode } from "react";
import { LucideIcon, RefreshCw, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataTableShellProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
  className?: string;
}

export const DataTableShell = ({
  title,
  description,
  icon: Icon,
  search,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  filters,
  actions,
  onRefresh,
  loading,
  isEmpty,
  emptyText = "Chưa có dữ liệu",
  children,
  className,
}: DataTableShellProps) => (
  <Card className={cn("rounded-2xl border-border/60 bg-card/70 backdrop-blur-sm", className)}>
    <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold tracking-tight">{title}</h3>
          {description && (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 rounded-xl pl-8 text-sm"
            />
          </div>
        )}
        {filters}
        {actions}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={onRefresh}
            title="Tải lại"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        )}
      </div>
    </div>

    <div className="p-2 sm:p-3">
      {loading ? (
        <div className="space-y-2 p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          {Icon && <Icon className="h-8 w-8 text-muted-foreground/50" />}
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        children
      )}
    </div>
  </Card>
);

export default DataTableShell;
