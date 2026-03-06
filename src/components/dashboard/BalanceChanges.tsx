import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Activity, ArrowUpRight, ArrowDownRight, RefreshCw, Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { motion, AnimatePresence } from "framer-motion";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

interface BalanceEntry {
  id: string;
  amount: number;
  status: string;
  transfer_content: string | null;
  bank_reference: string | null;
  paid_at: string | null;
  created_at: string;
  type: "in" | "pending";
}

const BalanceChanges = () => {
  const { merchant } = useMerchant();
  const [entries, setEntries] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchRecent = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("id, amount, status, transfer_content, bank_reference, paid_at, created_at")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const mapped: BalanceEntry[] = data.map((t: any) => ({
        ...t,
        type: t.status === "completed" ? "in" : "pending",
      }));

      // Detect new entries
      const currentIds = new Set(mapped.map(e => e.id));
      const newIds = new Set<string>();
      currentIds.forEach(id => {
        if (!prevIdsRef.current.has(id)) newIds.add(id);
      });
      if (prevIdsRef.current.size > 0 && newIds.size > 0) {
        setNewEntryIds(newIds);
        setTimeout(() => setNewEntryIds(new Set()), 3000);
      }
      prevIdsRef.current = currentIds;
      setEntries(mapped);
    }
    setLoading(false);
  }, [merchant]);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  // Realtime subscription
  useEffect(() => {
    if (!merchant || !autoRefresh) return;
    const channel = supabase
      .channel("balance-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "transactions",
        filter: `merchant_id=eq.${merchant.id}`,
      }, () => fetchRecent())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [merchant, autoRefresh, fetchRecent]);

  const totalIn = entries.filter(e => e.status === "completed").reduce((s, e) => s + e.amount, 0);
  const totalPending = entries.filter(e => e.status === "pending").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            Biến động số dư
          </h1>
          <p className="text-muted-foreground text-sm">Theo dõi giao dịch tự động theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            {autoRefresh ? <Bell className="h-4 w-4 text-success" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            <span className="hidden sm:inline">Tự động</span>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          <Button variant="outline" size="sm" onClick={fetchRecent}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đã nhận</p>
                <p className="text-lg md:text-xl font-bold text-success">{formatCurrency(totalIn)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đang chờ</p>
                <p className="text-lg md:text-xl font-bold text-warning">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dòng giao dịch ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Chưa có biến động nào</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              <AnimatePresence>
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={newEntryIds.has(entry.id) ? { opacity: 0, x: -20, scale: 0.95 } : false}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      newEntryIds.has(entry.id) ? "bg-success/10 border-success/30" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        entry.status === "completed" ? "bg-success/20" : "bg-warning/20"
                      }`}>
                        {entry.status === "completed" ?
                          <ArrowUpRight className="h-4 w-4 text-success" /> :
                          <ArrowDownRight className="h-4 w-4 text-warning" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.transfer_content || entry.bank_reference || "Giao dịch"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.paid_at || entry.created_at), "dd/MM HH:mm:ss", { locale: vi })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`font-semibold text-sm ${entry.status === "completed" ? "text-success" : "text-warning"}`}>
                        +{formatCurrency(entry.amount)}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {entry.status === "completed" ? "Thành công" : "Chờ"}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceChanges;
