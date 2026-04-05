import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Clock, CheckCircle2, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Percent, Link2, Zap, Wallet,
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

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const DashboardOverview = () => {
  const { merchant } = useMerchant();
  const { transactions, stats, loading } = useTransactions();
  const { banks, loading: banksLoading } = useMerchantBanks();
  const { paymentLinks } = usePaymentLinks();

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

    const totalLinks = paymentLinks.filter(l => !l.is_static).length;
    const completedLinks = paymentLinks.filter(l => l.status === "completed" && !l.is_static).length;
    const conversionRate = totalLinks > 0 ? (completedLinks / totalLinks) * 100 : 0;

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
    const topLinks = Array.from(linkRevenue.values()).sort((a, b) => b.total - a.total).slice(0, 5);
    const recentTx = completedTx.slice(0, 5);
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
      gradient: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-500/10",
      change: advancedStats.todayGrowth,
    },
    {
      title: "Giao dịch thành công",
      value: stats.completed.toString(),
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-500/10",
    },
    {
      title: "Đang chờ xử lý",
      value: stats.pending.toString(),
      icon: Clock,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-500/10",
    },
    {
      title: "Tổng doanh thu",
      value: formatCurrency(stats.totalAmount),
      icon: Wallet,
      gradient: "from-blue-500 to-cyan-600",
      bgLight: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          Xin chào,{" "}
          <span className="text-gradient-primary">{merchant?.business_name}</span>
        </h1>
        <p className="text-muted-foreground text-sm">Tổng quan hoạt động thanh toán của bạn</p>
      </div>

      {/* Stat cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="relative overflow-hidden group hover-lift card-shine border border-border/60 rounded-2xl">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-300`} />
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  {stat.change !== undefined && !loading && (
                    <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
                      stat.change >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                    }`}>
                      {stat.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(stat.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">{stat.title}</p>
                <div className="text-xl md:text-2xl font-bold tracking-tight">
                  {loading ? <div className="h-7 w-20 bg-muted animate-pulse rounded-lg" /> : stat.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Secondary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/60 rounded-2xl hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Percent className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Tỷ lệ chuyển đổi</p>
                <p className="text-2xl font-bold">{advancedStats.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{advancedStats.completedLinks}/{advancedStats.totalLinks} link</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-2xl hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Doanh thu 7 ngày</p>
                <p className="text-2xl font-bold">{formatCompact(advancedStats.weekAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-2xl hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <Link2 className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Tổng link thanh toán</p>
                <p className="text-2xl font-bold">{paymentLinks.length}</p>
                <p className="text-xs text-muted-foreground">{paymentLinks.filter(l => l.status === "active").length} đang hoạt động</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank warning */}
      {!banksLoading && banks.length === 0 && (
        <Card className="border-warning/40 bg-warning/5 rounded-2xl">
          <CardContent className="py-5 px-6">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Chưa cấu hình ngân hàng</h3>
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

      {/* Bottom grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-border/60 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              Top link thanh toán
            </CardTitle>
            <CardDescription className="text-xs">Theo doanh thu cao nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {advancedStats.topLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-3">
                {advancedStats.topLinks.map((link, i) => (
                  <div key={link.code} className="flex items-center gap-3 group">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium truncate group-hover:text-primary transition-colors">{link.code}</p>
                      <p className="text-xs text-muted-foreground">{link.count} giao dịch</p>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary/20 font-bold">
                      {formatCompact(link.total)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              Giao dịch gần đây
            </CardTitle>
            <CardDescription className="text-xs">5 giao dịch thành công mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {advancedStats.recentTx.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có giao dịch</p>
            ) : (
              <div className="space-y-3">
                {advancedStats.recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between group">
                    <div className="min-w-0">
                      <p className="text-sm font-mono truncate group-hover:text-primary transition-colors">{tx.transfer_content || tx.bank_reference || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.paid_at ? format(new Date(tx.paid_at), "dd/MM HH:mm", { locale: vi }) : "—"}
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 ml-2 flex-shrink-0 font-bold">
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
