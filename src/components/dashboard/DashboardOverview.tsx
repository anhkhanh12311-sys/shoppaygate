import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Clock, CheckCircle2, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Percent, Link2, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/hooks/useTransactions";
import { useMerchant } from "@/hooks/useMerchant";
import { useMerchantBanks } from "@/hooks/useMerchantBanks";
import { usePaymentLinks } from "@/hooks/usePaymentLinks";
import RevenueChart from "./RevenueChart";
import { format, subDays, isAfter } from "date-fns";
import { vi } from "date-fns/locale";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const formatCompact = (amount: number) => {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)}K`;
  return amount.toString();
};

const DashboardOverview = () => {
  const { merchant } = useMerchant();
  const { transactions, stats, loading } = useTransactions();
  const { banks, loading: banksLoading } = useMerchantBanks();
  const { paymentLinks } = usePaymentLinks();

  // Advanced stats
  const advancedStats = useMemo(() => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayTx = transactions.filter(
      t => t.status === "completed" &&
      new Date(t.paid_at || t.created_at).toDateString() === yesterday.toDateString()
    );
    const yesterdayAmount = yesterdayTx.reduce((s, t) => s + t.amount, 0);

    const todayGrowth = yesterdayAmount > 0
      ? ((stats.todayAmount - yesterdayAmount) / yesterdayAmount) * 100
      : stats.todayAmount > 0 ? 100 : 0;

    // Conversion rate: completed links / total links
    const totalLinks = paymentLinks.filter(l => !l.is_static).length;
    const completedLinks = paymentLinks.filter(l => l.status === "completed" && !l.is_static).length;
    const conversionRate = totalLinks > 0 ? (completedLinks / totalLinks) * 100 : 0;

    // Top payment links by amount (completed)
    const completedTx = transactions.filter(t => t.status === "completed");
    const linkRevenue = new Map<string, { code: string; total: number; count: number }>();
    completedTx.forEach(tx => {
      const link = paymentLinks.find(l => l.id === tx.payment_link_id);
      if (link) {
        const existing = linkRevenue.get(link.id) || { code: link.code, total: 0, count: 0 };
        existing.total += tx.amount;
        existing.count += 1;
        linkRevenue.set(link.id, existing);
      }
    });
    const topLinks = Array.from(linkRevenue.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Recent completed transactions (last 5)
    const recentTx = completedTx.slice(0, 5);

    // 7-day total
    const week = subDays(new Date(), 7);
    const weekAmount = completedTx
      .filter(t => isAfter(new Date(t.paid_at || t.created_at), week))
      .reduce((s, t) => s + t.amount, 0);

    return { todayGrowth, conversionRate, topLinks, recentTx, weekAmount, totalLinks, completedLinks };
  }, [transactions, stats, paymentLinks]);

  const statCards = [
    {
      title: "Doanh thu hôm nay",
      value: formatCurrency(stats.todayAmount),
      icon: TrendingUp,
      gradient: "from-primary to-secondary",
      change: advancedStats.todayGrowth,
    },
    {
      title: "Giao dịch thành công",
      value: stats.completed.toString(),
      icon: CheckCircle2,
      gradient: "from-green-500 to-emerald-400",
    },
    {
      title: "Đang chờ",
      value: stats.pending.toString(),
      icon: Clock,
      gradient: "from-yellow-500 to-orange-400",
    },
    {
      title: "Tổng doanh thu",
      value: formatCurrency(stats.totalAmount),
      icon: DollarSign,
      gradient: "from-violet-500 to-purple-400",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Xin chào,{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            {merchant?.business_name}
          </span>
        </h1>
        <p className="text-muted-foreground">Tổng quan hoạt động thanh toán của bạn</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
          >
            <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <div className="h-8 w-24 bg-muted animate-pulse rounded" /> : stat.value}
                </div>
                {stat.change !== undefined && !loading && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${stat.change >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {stat.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{Math.abs(stat.change).toFixed(1)}% so với hôm qua</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Percent className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ chuyển đổi</p>
                <p className="text-2xl font-bold">{advancedStats.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {advancedStats.completedLinks}/{advancedStats.totalLinks} link
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu 7 ngày</p>
                <p className="text-2xl font-bold">{formatCompact(advancedStats.weekAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Link2 className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng link thanh toán</p>
                <p className="text-2xl font-bold">{paymentLinks.length}</p>
                <p className="text-xs text-muted-foreground">
                  {paymentLinks.filter(l => l.status === "active").length} đang hoạt động
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank config warning */}
      {!banksLoading && banks.length === 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Chưa cấu hình ngân hàng</h3>
                <p className="text-muted-foreground text-sm">
                  Vui lòng thêm tài khoản ngân hàng để bắt đầu nhận thanh toán.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Chart */}
      <RevenueChart />

      {/* Bottom grid: Top links + Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top payment links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" /> Top link thanh toán
            </CardTitle>
            <CardDescription>Theo doanh thu cao nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {advancedStats.topLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-3">
                {advancedStats.topLinks.map((link, i) => (
                  <div key={link.code} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium truncate">{link.code}</p>
                      <p className="text-xs text-muted-foreground">{link.count} giao dịch</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatCompact(link.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Giao dịch gần đây
            </CardTitle>
            <CardDescription>5 giao dịch thành công mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {advancedStats.recentTx.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Chưa có giao dịch</p>
            ) : (
              <div className="space-y-3">
                {advancedStats.recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-mono truncate">{tx.transfer_content || tx.bank_reference || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.paid_at ? format(new Date(tx.paid_at), "dd/MM HH:mm", { locale: vi }) : "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-500/30 ml-2 flex-shrink-0">
                      +{formatCompact(tx.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
