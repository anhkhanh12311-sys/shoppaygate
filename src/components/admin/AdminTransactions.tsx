import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Search, CheckCircle2, Clock, XCircle, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import DataPagination from "@/components/ui/data-pagination";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const PAGE_SIZE = 25;

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const fetchPage = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("transactions")
      .select("*, merchants!inner(business_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter) query = query.eq("status", statusFilter);
    if (search) query = query.or(`transfer_content.ilike.%${search}%,bank_reference.ilike.%${search}%`);

    const { data, count } = await query;
    setTransactions(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setPage(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-success/20 text-success"><CheckCircle2 className="h-3 w-3 mr-1" />Thành công</Badge>;
      case "pending": return <Badge className="bg-warning/20 text-warning"><Clock className="h-3 w-3 mr-1" />Đang chờ</Badge>;
      case "failed": return <Badge className="bg-destructive/20 text-destructive"><XCircle className="h-3 w-3 mr-1" />Thất bại</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasFilters = statusFilter || search;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tất cả giao dịch</h1>
        <p className="text-muted-foreground">Xem và tìm kiếm giao dịch toàn hệ thống</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Giao dịch ({totalCount})</CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Xóa lọc
              </Button>
            )}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo nội dung CK, mã ngân hàng..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} size="sm">Tìm</Button>
            <Select value={statusFilter || "all"} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="completed">Thành công</SelectItem>
                <SelectItem value="pending">Đang chờ</SelectItem>
                <SelectItem value="failed">Thất bại</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead className="hidden md:table-cell">Nội dung</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(tx.paid_at || tx.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{tx.merchants?.business_name}</p>
                          <p className="text-xs text-muted-foreground">{tx.merchants?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-success">+{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate font-mono text-xs">{tx.transfer_content || "-"}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DataPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTransactions;
