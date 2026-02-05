import { motion } from "framer-motion";
import { TrendingUp, Clock, CheckCircle2, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/hooks/useTransactions";
import { useMerchant } from "@/hooks/useMerchant";
 import RevenueChart from "./RevenueChart";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const DashboardOverview = () => {
  const { merchant } = useMerchant();
  const { stats, loading } = useTransactions();

  const statCards = [
    {
      title: "Tổng thu hôm nay",
      value: formatCurrency(stats.todayAmount),
      icon: TrendingUp,
      gradient: "from-primary to-secondary",
    },
    {
      title: "Tổng giao dịch thành công",
      value: stats.completed.toString(),
      icon: CheckCircle2,
      gradient: "from-success to-accent",
    },
    {
      title: "Giao dịch đang chờ",
      value: stats.pending.toString(),
      icon: Clock,
      gradient: "from-warning to-secondary",
    },
    {
      title: "Tổng doanh thu",
      value: formatCurrency(stats.totalAmount),
      icon: DollarSign,
      gradient: "from-accent to-primary",
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
        <p className="text-muted-foreground">
          Đây là tổng quan hoạt động thanh toán của bạn
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}
              />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div
                  className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}
                >
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Bank config status */}
      {!merchant?.bank_account_number && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Chưa cấu hình ngân hàng</h3>
                <p className="text-muted-foreground text-sm">
                  Vui lòng cấu hình thông tin ngân hàng để bắt đầu nhận thanh toán. Đi đến tab "Cài đặt ngân hàng" để thiết lập.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
 
       {/* Revenue Chart */}
       <RevenueChart />
    </div>
  );
};

export default DashboardOverview;
