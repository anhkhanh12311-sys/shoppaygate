 import { useState, useMemo } from "react";
 import { motion } from "framer-motion";
 import { BarChart3, TrendingUp, Calendar } from "lucide-react";
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import {
   AreaChart,
   Area,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer,
   BarChart,
   Bar,
 } from "recharts";
 import { useTransactions } from "@/hooks/useTransactions";
 import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, endOfDay, endOfWeek, endOfMonth } from "date-fns";
 import { vi } from "date-fns/locale";
 
 const formatCurrency = (amount: number) => {
   if (amount >= 1000000) {
     return `${(amount / 1000000).toFixed(1)}M`;
   }
   if (amount >= 1000) {
     return `${(amount / 1000).toFixed(0)}K`;
   }
   return amount.toString();
 };
 
 const formatFullCurrency = (amount: number) => {
   return new Intl.NumberFormat("vi-VN", {
     style: "currency",
     currency: "VND",
   }).format(amount);
 };
 
 type TimeRange = "7days" | "4weeks" | "12months";
 
 const RevenueChart = () => {
   const { transactions, loading } = useTransactions();
   const [timeRange, setTimeRange] = useState<TimeRange>("7days");
 
   const chartData = useMemo(() => {
     const completedTransactions = transactions.filter(
       (t) => t.status === "completed"
     );
 
     const now = new Date();
 
     if (timeRange === "7days") {
       const days = eachDayOfInterval({
         start: subDays(now, 6),
         end: now,
       });
 
       return days.map((day) => {
         const dayStart = startOfDay(day);
         const dayEnd = endOfDay(day);
         const dayTransactions = completedTransactions.filter((t) => {
           const transactionDate = new Date(t.paid_at || t.created_at);
           return isWithinInterval(transactionDate, { start: dayStart, end: dayEnd });
         });
 
         return {
           label: format(day, "EEE", { locale: vi }),
           fullLabel: format(day, "dd/MM", { locale: vi }),
           amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0),
           count: dayTransactions.length,
         };
       });
     }
 
     if (timeRange === "4weeks") {
       const weeks = eachWeekOfInterval(
         {
           start: subWeeks(now, 3),
           end: now,
         },
         { weekStartsOn: 1 }
       );
 
       return weeks.map((week, index) => {
         const weekStart = startOfWeek(week, { weekStartsOn: 1 });
         const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
         const weekTransactions = completedTransactions.filter((t) => {
           const transactionDate = new Date(t.paid_at || t.created_at);
           return isWithinInterval(transactionDate, { start: weekStart, end: weekEnd });
         });
 
         return {
           label: `Tuần ${index + 1}`,
           fullLabel: `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`,
           amount: weekTransactions.reduce((sum, t) => sum + t.amount, 0),
           count: weekTransactions.length,
         };
       });
     }
 
     // 12 months
     const months = eachMonthOfInterval({
       start: subMonths(now, 11),
       end: now,
     });
 
     return months.map((month) => {
       const monthStart = startOfMonth(month);
       const monthEnd = endOfMonth(month);
       const monthTransactions = completedTransactions.filter((t) => {
         const transactionDate = new Date(t.paid_at || t.created_at);
         return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
       });
 
       return {
         label: format(month, "MMM", { locale: vi }),
         fullLabel: format(month, "MM/yyyy", { locale: vi }),
         amount: monthTransactions.reduce((sum, t) => sum + t.amount, 0),
         count: monthTransactions.length,
       };
     });
   }, [transactions, timeRange]);
 
   const totalRevenue = chartData.reduce((sum, d) => sum + d.amount, 0);
   const totalTransactions = chartData.reduce((sum, d) => sum + d.count, 0);
   const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
 
   const CustomTooltip = ({ active, payload, label }: any) => {
     if (active && payload && payload.length) {
       return (
         <div className="bg-card border rounded-lg shadow-lg p-3">
           <p className="font-medium text-sm">{payload[0]?.payload?.fullLabel || label}</p>
           <p className="text-primary font-bold">{formatFullCurrency(payload[0].value)}</p>
           <p className="text-muted-foreground text-xs">
             {payload[0]?.payload?.count} giao dịch
           </p>
         </div>
       );
     }
     return null;
   };
 
   if (loading) {
     return (
       <Card>
         <CardContent className="h-80 flex items-center justify-center">
           <div className="animate-pulse text-muted-foreground">
             Đang tải biểu đồ...
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.4, delay: 0.2 }}
     >
       <Card>
         <CardHeader className="pb-4">
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <BarChart3 className="h-5 w-5 text-primary" />
                 Thống kê doanh thu
               </CardTitle>
               <CardDescription>
                 Biểu đồ doanh thu theo thời gian
               </CardDescription>
             </div>
             <Tabs
               value={timeRange}
               onValueChange={(v) => setTimeRange(v as TimeRange)}
             >
               <TabsList className="grid grid-cols-3 h-9">
                 <TabsTrigger value="7days" className="text-xs px-3">
                   7 ngày
                 </TabsTrigger>
                 <TabsTrigger value="4weeks" className="text-xs px-3">
                   4 tuần
                 </TabsTrigger>
                 <TabsTrigger value="12months" className="text-xs px-3">
                   12 tháng
                 </TabsTrigger>
               </TabsList>
             </Tabs>
           </div>
         </CardHeader>
         <CardContent>
           {/* Summary stats */}
           <div className="grid grid-cols-3 gap-4 mb-6">
             <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
               <p className="text-xs text-muted-foreground mb-1">Tổng doanh thu</p>
               <p className="text-lg font-bold text-primary">
                 {formatFullCurrency(totalRevenue)}
               </p>
             </div>
             <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
               <p className="text-xs text-muted-foreground mb-1">Giao dịch</p>
               <p className="text-lg font-bold text-success">{totalTransactions}</p>
             </div>
             <div className="text-center p-3 rounded-lg bg-secondary/5 border border-secondary/20">
               <p className="text-xs text-muted-foreground mb-1">Trung bình</p>
               <p className="text-lg font-bold text-secondary">
                 {formatFullCurrency(avgTransaction)}
               </p>
             </div>
           </div>
 
           {/* Chart */}
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData}>
                 <defs>
                   <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                     <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                 <XAxis
                   dataKey="label"
                   tick={{ fontSize: 12 }}
                   tickLine={false}
                   axisLine={false}
                   className="fill-muted-foreground"
                 />
                 <YAxis
                   tickFormatter={formatCurrency}
                   tick={{ fontSize: 12 }}
                   tickLine={false}
                   axisLine={false}
                   className="fill-muted-foreground"
                   width={60}
                 />
                 <Tooltip content={<CustomTooltip />} />
                 <Area
                   type="monotone"
                   dataKey="amount"
                   stroke="hsl(var(--primary))"
                   strokeWidth={2}
                   fillOpacity={1}
                   fill="url(#colorRevenue)"
                 />
               </AreaChart>
             </ResponsiveContainer>
           </div>
 
           {transactions.length === 0 && (
             <div className="text-center py-8 text-muted-foreground">
               <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
               <p>Chưa có dữ liệu giao dịch</p>
               <p className="text-sm">Tạo link thanh toán để bắt đầu nhận tiền</p>
             </div>
           )}
         </CardContent>
       </Card>
     </motion.div>
   );
 };
 
 export default RevenueChart;