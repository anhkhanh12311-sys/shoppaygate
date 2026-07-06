import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Play, Trophy, AlertTriangle, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BankScore {
  id: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  priority: number;
  fee_weight: number;
  avg_settlement_seconds: number;
  health_status: "healthy" | "degraded" | "down";
  auto_route_enabled: boolean;
  daily_limit: number | null;
  today_received: number;
  score: number | null;
  eligibility: "eligible" | "auto_route_off" | "health_down" | "daily_limit_exceeded";
  is_winner: boolean;
}

interface SimResult {
  amount: number;
  winner_id: string | null;
  banks: BankScore[];
  error?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const eligibilityLabel: Record<BankScore["eligibility"], { text: string; color: string }> = {
  eligible: { text: "Đủ điều kiện", color: "bg-emerald-500/15 text-emerald-500" },
  auto_route_off: { text: "Tắt auto-route", color: "bg-muted text-muted-foreground" },
  health_down: { text: "Down", color: "bg-destructive/15 text-destructive" },
  daily_limit_exceeded: { text: "Vượt hạn mức ngày", color: "bg-amber-500/15 text-amber-500" },
};

const healthColor = (h: string) =>
  h === "healthy" ? "text-emerald-500" : h === "degraded" ? "text-amber-500" : "text-destructive";

const RoutingPlayground = () => {
  const [amount, setAmount] = useState<string>("500000");
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const run = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      toast({ title: "Số tiền không hợp lệ", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("simulate_bank_routing", {
      p_amount: amt,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Lỗi mô phỏng", description: error.message, variant: "destructive" });
      return;
    }
    setResult(data as SimResult);
  };

  const presets = [100000, 500000, 2000000, 10000000, 50000000];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          Routing Playground
        </h1>
        <p className="text-muted-foreground text-sm">
          Test giả lập: nhập số tiền → hệ thống chấm điểm và chọn ngân hàng tối ưu theo priority, phí, độ trễ, dư địa hạn mức.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Giả lập chọn ngân hàng</CardTitle>
          <CardDescription>Nhập số tiền cần thu để xem bank nào thắng và lý do.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Số tiền (VND)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500000"
              />
            </div>
            <Button onClick={run} disabled={loading} className="rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Chạy mô phỏng
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setAmount(String(p))}
              >
                {fmt(p)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {result?.error && (
        <Card className="border-destructive/40">
          <CardContent className="py-6 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {result.error === "no_merchant" ? "Không tìm thấy merchant." : result.error}
          </CardContent>
        </Card>
      )}

      {result && !result.error && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Kết quả cho {fmt(result.amount)}
              </CardTitle>
              <CardDescription>
                {result.winner_id
                  ? `Bank thắng: ${result.banks.find((b) => b.is_winner)?.bank_name ?? "?"} · ${
                      result.banks.find((b) => b.is_winner)?.bank_account_number ?? ""
                    }`
                  : "Không bank nào đủ điều kiện — hệ thống sẽ fallback về bank mặc định."}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Ngân hàng</TableHead>
                    <TableHead className="text-right">Priority</TableHead>
                    <TableHead className="text-right">Phí</TableHead>
                    <TableHead className="text-right">Settle (s)</TableHead>
                    <TableHead>Hạn mức ngày</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Điểm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.banks.map((b) => {
                    const label = eligibilityLabel[b.eligibility];
                    return (
                      <TableRow key={b.id} className={b.is_winner ? "bg-primary/5" : ""}>
                        <TableCell>{b.is_winner && <Trophy className="h-4 w-4 text-primary" />}</TableCell>
                        <TableCell>
                          <div className="font-medium">{b.bank_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {b.bank_account_number}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{b.priority}</TableCell>
                        <TableCell className="text-right">{b.fee_weight}</TableCell>
                        <TableCell className="text-right">{b.avg_settlement_seconds}</TableCell>
                        <TableCell className="text-xs">
                          {b.daily_limit
                            ? `${fmt(b.today_received)} / ${fmt(b.daily_limit)}`
                            : "Không giới hạn"}
                        </TableCell>
                        <TableCell className={`text-xs font-medium ${healthColor(b.health_status)}`}>
                          {b.health_status}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${label.color} border-0 text-[10px]`}>{label.text}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {b.score !== null ? b.score.toFixed(2) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {result.banks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Chưa có ngân hàng nào. Thêm ở tab "Ngân hàng".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Công thức chấm điểm (thấp = tốt): <code>priority×10 + fee_weight + settle/10 − headroom×5</code>.
                  Bank có điểm nhỏ nhất thắng. Bank <b>down</b> hoặc <b>vượt hạn mức</b> bị loại.
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default RoutingPlayground;
