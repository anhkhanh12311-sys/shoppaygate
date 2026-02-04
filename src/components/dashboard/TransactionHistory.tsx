import { motion } from "framer-motion";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { History, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const TransactionHistory = () => {
  const { transactions, loading, stats } = useTransactions();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-success/20 text-success hover:bg-success/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Thành công
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-warning/20 text-warning hover:bg-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            Đang chờ
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            Thất bại
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Đã hủy
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Lịch sử giao dịch</h1>
        <p className="text-muted-foreground">
          Theo dõi tất cả giao dịch thanh toán của bạn
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giao dịch thành công</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang chờ xác nhận</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead className="hidden md:table-cell">Nội dung CK</TableHead>
                    <TableHead className="hidden md:table-cell">Mã ngân hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b"
                    >
                      <TableCell className="whitespace-nowrap">
                        {format(
                          new Date(transaction.paid_at || transaction.created_at),
                          "dd/MM/yyyy HH:mm",
                          { locale: vi }
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-success">
                        +{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate font-mono text-sm">
                        {transaction.transfer_content || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {transaction.bank_reference || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory;
