import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Clock, CheckCircle2, BarChart3,
  ArrowUpRight, ArrowDownRight, Percent, Link2, Zap, Wallet,
  ArrowDownLeft, Trophy, Medal, Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

// Trích xuất nhãn ngắn gọn, dễ đọc từ nội dung chuyển khoản thô
const parseTxLabel = (raw: string | null, fallback: string | null) => {
  const source = (raw || fallback || "").trim();
  if (!source) return { title: "Giao dịch", code: "" };

  // Lấy phần đầu có ý nghĩa: bỏ các chuỗi số/ngày/giờ và mã ngân hàng dài
  const tokens = source.split(/\s+/);
  // Mã link thanh toán thường có dạng PG... hoặc PGxxxxx
  const codeToken = tokens.find((t) => /^PG/i.test(t.replace(/[-_]/g, "")));
  // Token chữ đầu tiên (tên/loại giao dịch) - bỏ token chỉ toàn số
  const nameToken = tokens.find((t) => /[a-zA-ZÀ-ỹ]/.test(t) && !/^PG/i.test(t));

  let title = nameToken || codeToken || tokens[0] || "Giao dịch";
  // Viết hoa đẹp hơn nếu là chữ thường liền
  title = title.length > 18 ? `${title.slice(0, 18)}…` : title;

  const code = codeToken && codeToken !== nameToken
    ? (codeToken.length > 16 ? `${codeToken.slice(0, 16)}…` : codeToken)
    : "";

  return { title, code };
};

const rankStyles = [
  { icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Medal, color: "text-slate-400", bg: "bg-slate-400/10" },
  { icon: Award, color: "text-orange-500", bg: "bg-orange-500/10" },
];

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
        <Card className="border border-border/60 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              Top link thanh toán
            </CardTitle>
            <CardDescription className="text-xs">Xếp hạng theo doanh thu cao nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {advancedStats.topLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {advancedStats.topLinks.map((link, i) => {
                  const rank = rankStyles[i];
                  return (
                    <div
                      key={link.code}
                      className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50"
                    >
                      {rank ? (
                        <div className={`h-9 w-9 rounded-xl ${rank.bg} flex items-center justify-center flex-shrink-0`}>
                          <rank.icon className={`h-4 w-4 ${rank.color}`} />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{link.code}</p>
                        <p className="text-xs text-muted-foreground">{link.count} giao dịch</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary">{formatCompact(link.total)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">VND</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 rounded-2xl overflow-hidden">
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
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <ArrowDownLeft className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Chưa có giao dịch</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {advancedStats.recentTx.map((tx) => {
                  const { title, code } = parseTxLabel(tx.transfer_content, tx.bank_reference);
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{title}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {tx.paid_at ? format(new Date(tx.paid_at), "dd/MM • HH:mm", { locale: vi }) : "—"}
                            {code ? ` · ${code}` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-600">+{formatCompact(tx.amount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">VND</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
