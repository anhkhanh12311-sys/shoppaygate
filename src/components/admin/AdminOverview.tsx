import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Users, Activity, Database, TrendingUp,
  Store, Link2, ArrowUpRight, Crown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const formatCompact = (amount: number) => {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)}K`;
  return amount.toString();
};

interface AdminStats {
  total_merchants: number;
  total_transactions: number;
  completed_transactions: number;
  pending_transactions: number;
  total_revenue: number;
  today_revenue: number;
  week_revenue: number;
  month_revenue: number;
  total_payment_links: number;
  active_payment_links: number;
  total_stores: number;
  new_merchants_today: number;
  new_merchants_week: number;
}

interface DailyRevenue {
  day: string;
  revenue: number;
  tx_count: number;
}

interface TopMerchant {
  merchant_id: string;
  business_name: string;
  email: string;
  total_revenue: number;
  tx_count: number;
}

const AdminOverview = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [statsRes, revenueRes, topRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("get_daily_revenue", { p_days: 30 }),
        supabase.rpc("get_top_merchants", { p_limit: 5 }),
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as AdminStats);
      if (revenueRes.data) setDailyRevenue(revenueRes.data as DailyRevenue[]);
      if (topRes.data) setTopMerchants(topRes.data as TopMerchant[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const successRate = stats.total_transactions > 0
    ? Math.round((stats.completed_transactions / stats.total_transactions) * 100) : 0;

  const statCards = [
    { title: "Tổng doanh thu", value: formatCurrency(stats.total_revenue), sub: `Tháng: ${formatCompact(stats.month_revenue)}`, icon: BarChart3, gradient: "from-primary to-secondary" },
    { title: "Doanh thu hôm nay", value: formatCurrency(stats.today_revenue), sub: `Tuần: ${formatCompact(stats.week_revenue)}`, icon: TrendingUp, gradient: "from-green-500 to-emerald-400" },
    { title: "Merchants", value: stats.total_merchants, sub: `+${stats.new_merchants_week} tuần này`, icon: Users, gradient: "from-blue-500 to-cyan-400" },
    { title: "Giao dịch", value: `${stats.completed_transactions}/${stats.total_transactions}`, sub: `Tỷ lệ: ${successRate}%`, icon: Activity, gradient: "from-purple-500 to-pink-400" },
  ];

  const chartData = dailyRevenue.map(d => ({
    date: format(new Date(d.day), "dd/MM", { locale: vi }),
    revenue: Number(d.revenue),
    count: Number(d.tx_count),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Quản trị hệ thống</h1>
        <p className="text-muted-foreground">Tổng quan toàn bộ hoạt động hệ thống</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Links thanh toán</p>
                <p className="text-2xl font-bold">{stats.total_payment_links}</p>
                <p className="text-xs text-muted-foreground">{stats.active_payment_links} đang hoạt động</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang chờ xử lý</p>
                <p className="text-2xl font-bold">{stats.pending_transactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cửa hàng hoạt động</p>
                <p className="text-2xl font-bold">{stats.total_stores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Doanh thu 30 ngày</CardTitle>
          <CardDescription>Biểu đồ doanh thu và số lượng giao dịch theo ngày</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={(v) => formatCompact(v)} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#adminRevGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top merchants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" /> Top Merchants
          </CardTitle>
          <CardDescription>Xếp hạng theo doanh thu cao nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {topMerchants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {topMerchants.map((m, i) => (
                <div key={m.merchant_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <span className={`text-lg font-bold w-8 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.business_name}</p>
                    <p className="text-xs text-muted-foreground">{m.email} • {Number(m.tx_count)} giao dịch</p>
                  </div>
                  <Badge variant="outline" className="text-primary border-primary/30 flex-shrink-0">
                    {formatCompact(Number(m.total_revenue))}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
