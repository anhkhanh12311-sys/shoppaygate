import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { History, CheckCircle2, Clock, XCircle, AlertCircle, Search, Filter, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePaginatedTransactions } from "@/hooks/usePaginatedTransactions";
import DataPagination from "@/components/ui/data-pagination";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const TransactionHistory = () => {
  const { transactions, loading, page, setPage, totalPages, totalCount, filters, updateFilters, stats, pageSize } = usePaginatedTransactions();
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleSearch = () => {
    updateFilters({ ...filters, search: searchInput || undefined });
  };

  const handleStatusFilter = (status: string) => {
    updateFilters({ ...filters, status: status === "all" ? undefined : status });
  };

  const handleDateFilter = () => {
    updateFilters({ ...filters, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
  };

  const clearFilters = () => {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    updateFilters({});
  };

  const hasActiveFilters = filters.status || filters.search || filters.dateFrom || filters.dateTo;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/20 text-success hover:bg-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Thành công</Badge>;
      case "pending":
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30"><Clock className="h-3 w-3 mr-1" />Đang chờ</Badge>;
      case "failed":
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30"><XCircle className="h-3 w-3 mr-1" />Thất bại</Badge>;
      case "cancelled":
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Lịch sử giao dịch</h1>
        <p className="text-muted-foreground">Theo dõi tất cả giao dịch thanh toán của bạn</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Thành công</p>
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
                <p className="text-sm text-muted-foreground">Đang chờ</p>
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
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Danh sách giao dịch ({totalCount})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-1" />
                Bộ lọc
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Xóa lọc
                </Button>
              )}
            </div>
          </div>
          
          {/* Search bar - always visible */}
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo nội dung CK, mã ngân hàng..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Tìm</Button>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex flex-wrap gap-3 mt-3">
              <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="completed">Thành công</SelectItem>
                  <SelectItem value="pending">Đang chờ</SelectItem>
                  <SelectItem value="failed">Thất bại</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" placeholder="Từ ngày" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" placeholder="Đến ngày" />
              <Button variant="secondary" size="sm" onClick={handleDateFilter}>Lọc ngày</Button>
            </motion.div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>{hasActiveFilters ? "Không tìm thấy giao dịch phù hợp" : "Chưa có giao dịch nào"}</p>
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
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(tx.paid_at || tx.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </TableCell>
                      <TableCell className="font-medium text-success">+{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate font-mono text-sm">
                        {tx.transfer_content || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">{tx.bank_reference || "-"}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DataPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory;
