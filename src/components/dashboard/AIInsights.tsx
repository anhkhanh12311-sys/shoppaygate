import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Sparkles, RefreshCw, TrendingUp, TrendingDown, Clock,
  Loader2, Activity, Target, Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

interface InsightSummary {
  business: string;
  window_days: number;
  total_transactions: number;
  total_revenue: number;
  avg_ticket: number;
  peak_hour: number;
  last_7_days: number[];
  trend: "tăng" | "giảm" | "ổn định";
}

const AIInsights = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [aiText, setAiText] = useState<string>("");
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {});
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Lỗi phân tích");
      setSummary(data.summary);
      setAiText(data.ai_insights || "");
      setLastRun(new Date());
    } catch (e: any) {
      toast({ variant: "destructive", title: "Không thể phân tích", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInsights(); /* eslint-disable-next-line */ }, []);

  const trendIcon =
    summary?.trend === "tăng" ? <TrendingUp className="h-5 w-5 text-success" /> :
    summary?.trend === "giảm" ? <TrendingDown className="h-5 w-5 text-destructive" /> :
    <Activity className="h-5 w-5 text-muted-foreground" />;

  const peak7 = summary?.last_7_days ? Math.max(...summary.last_7_days) : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              AI Insights <Sparkles className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-muted-foreground text-sm">
              Phân tích thông minh dữ liệu 90 ngày, gợi ý hành động bằng AI
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInsights} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Phân tích lại
        </Button>
      </motion.div>

      {loading && !summary && (
        <Card><CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">AI đang phân tích dữ liệu của bạn...</p>
        </CardContent></Card>
      )}

      {summary && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Doanh thu 90 ngày</span>
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xl font-bold">{formatCurrency(summary.total_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Giao dịch</span>
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xl font-bold">{summary.total_transactions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">TB / đơn</span>
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xl font-bold">{formatCurrency(summary.avg_ticket)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Giờ vàng</span>
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xl font-bold">{summary.peak_hour}:00</p>
              </CardContent>
            </Card>
          </div>

          {/* 7-day chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {trendIcon} Xu hướng 7 ngày qua
                <Badge variant="outline" className="ml-2 capitalize">{summary.trend}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {summary.last_7_days.map((v, i) => {
                  const h = peak7 > 0 ? (v / peak7) * 100 : 0;
                  const day = new Date(); day.setDate(day.getDate() - (6 - i));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex-1 flex items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(h, 4)}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className="w-full rounded-t-md gradient-primary"
                          title={formatCurrency(v)}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {day.getDate()}/{day.getMonth() + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Narrative */}
          <Card className="gradient-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Gợi ý từ AI
              </CardTitle>
              <CardDescription>
                Được tạo bởi Lovable AI · Cập nhật {lastRun?.toLocaleTimeString("vi-VN")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiText ? (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {aiText}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có gợi ý. Bấm "Phân tích lại".</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AIInsights;
