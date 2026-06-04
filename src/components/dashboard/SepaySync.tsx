import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Download, CheckCircle2, AlertCircle, Clock, Zap,
  TrendingUp, Loader2, Database, Timer, Radio,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMerchant } from "@/hooks/useMerchant";
import { useMerchantSecrets } from "@/hooks/useMerchantSecrets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

interface SyncResult {
  total_fetched: number;
  matched: number;
  duplicate: number;
  unmatched: number;
  matched_details?: Array<{ amount: number; code: string; paid_at: string }>;
}

const AUTO_INTERVALS = [
  { value: "0", label: "Tắt" },
  { value: "30", label: "30 giây" },
  { value: "60", label: "1 phút" },
  { value: "300", label: "5 phút" },
  { value: "900", label: "15 phút" },
];

const SepaySync = () => {
  const { merchant } = useMerchant();
  const { secrets } = useMerchantSecrets();
  const { toast } = useToast();
  const [sinceHours, setSinceHours] = useState("24");
  const [limit, setLimit] = useState("50");
  const [autoInterval, setAutoInterval] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);

  const hasApiKey = !!secrets.sepay_api_key;

  const runSync = useCallback(async () => {
    if (!hasApiKey) {
      toast({ variant: "destructive", title: "Chưa cấu hình SePay", description: "Vui lòng thêm API key SePay trong Cài đặt ngân hàng." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sepay-sync", {
        body: { since_hours: Number(sinceHours), limit: Number(limit) },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Đồng bộ thất bại");
      setResult(data as SyncResult);
      setLastRun(new Date());
      if (data.matched > 0) {
        toast({
          title: "✨ Đồng bộ xong",
          description: `Đã khớp ${data.matched}/${data.total_fetched} giao dịch mới`,
        });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi đồng bộ", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [hasApiKey, sinceHours, limit, toast]);

  // Auto-sync interval
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const sec = Number(autoInterval);
    if (sec > 0 && hasApiKey) {
      setCountdown(sec);
      intervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            runSync();
            return sec;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      setCountdown(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoInterval, hasApiKey, runSync]);


  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <Database className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Đồng bộ SePay</h1>
            <p className="text-muted-foreground text-sm">
              Kéo thủ công các giao dịch chưa được webhook xử lý từ tài khoản ngân hàng
            </p>
          </div>
        </div>
      </motion.div>

      {!hasApiKey && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">Chưa có SePay API Key</p>
              <p className="text-xs text-muted-foreground">
                Vào tab "Ngân hàng" → nhập SePay API Key để kích hoạt đồng bộ.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Chạy đồng bộ
          </CardTitle>
          <CardDescription>
            Hệ thống sẽ tự khớp giao dịch theo mã PG- hoặc theo số tiền + link đang active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Khoảng thời gian</Label>
              <Select value={sinceHours} onValueChange={setSinceHours}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 giờ qua</SelectItem>
                  <SelectItem value="6">6 giờ qua</SelectItem>
                  <SelectItem value="24">24 giờ qua</SelectItem>
                  <SelectItem value="72">3 ngày qua</SelectItem>
                  <SelectItem value="168">7 ngày qua</SelectItem>
                  <SelectItem value="720">30 ngày qua</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Số GD tối đa</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full gradient-primary text-primary-foreground h-12 text-base"
            disabled={loading || !hasApiKey}
            onClick={runSync}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang đồng bộ...</>
            ) : (
              <><RefreshCw className="mr-2 h-5 w-5" /> Đồng bộ ngay</>
            )}
          </Button>

          {lastRun && (
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> Lần chạy gần nhất: {lastRun.toLocaleTimeString("vi-VN")}
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Kết quả đồng bộ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Đã quét</p>
                  <p className="text-2xl font-bold">{result.total_fetched}</p>
                </div>
                <div className="rounded-xl border border-success/30 p-3 bg-success/5">
                  <p className="text-xs text-success">Khớp mới</p>
                  <p className="text-2xl font-bold text-success">{result.matched}</p>
                </div>
                <div className="rounded-xl border border-primary/30 p-3 bg-primary/5">
                  <p className="text-xs text-primary">Đã có sẵn</p>
                  <p className="text-2xl font-bold text-primary">{result.duplicate}</p>
                </div>
                <div className="rounded-xl border border-muted p-3">
                  <p className="text-xs text-muted-foreground">Không khớp</p>
                  <p className="text-2xl font-bold">{result.unmatched}</p>
                </div>
              </div>

              {result.matched_details && result.matched_details.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Chi tiết giao dịch khớp mới
                  </p>
                  <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
                    {result.matched_details.map((m, i) => (
                      <div key={i} className="p-3 flex items-center justify-between text-sm">
                        <div>
                          <code className="text-xs text-primary font-mono">{m.code}</code>
                          <p className="text-xs text-muted-foreground">
                            {new Date(m.paid_at).toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <Badge className="bg-success/15 text-success border-success/30">
                          +{formatCurrency(m.amount)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default SepaySync;
