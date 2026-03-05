import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Link2, QrCode, Trash2, ExternalLink, Copy, Check, Search, Filter, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePaginatedPaymentLinks } from "@/hooks/usePaginatedPaymentLinks";
import DataPagination from "@/components/ui/data-pagination";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

interface PaymentLinksListProps {
  isStatic?: boolean;
}

const PaymentLinksList = ({ isStatic = false }: PaymentLinksListProps) => {
  const { links, loading, page, setPage, totalPages, totalCount, filters, updateFilters, deleteLink, pageSize } = usePaginatedPaymentLinks(isStatic);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const { toast } = useToast();

  const getPaymentUrl = (code: string) => `${window.location.origin}/pay/${code}`;

  const copyToClipboard = async (code: string, id: string) => {
    await navigator.clipboard.writeText(getPaymentUrl(code));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Đã sao chép", description: "Link đã được sao chép vào clipboard" });
  };

  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await deleteLink(deleteId);
      if (error) {
        toast({ variant: "destructive", title: "Lỗi", description: "Không thể xóa. Vui lòng thử lại." });
      } else {
        toast({ title: "Đã xóa", description: isStatic ? "QR Code đã được xóa" : "Link thanh toán đã được xóa" });
      }
      setDeleteId(null);
    }
  };

  const handleSearch = () => {
    updateFilters({ ...filters, search: searchInput || undefined });
  };

  const handleStatusFilter = (status: string) => {
    updateFilters({ ...filters, status: status === "all" ? undefined : status });
  };

  const clearFilters = () => {
    setSearchInput("");
    updateFilters({});
  };

  const hasActiveFilters = filters.status || filters.search;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/20 text-success hover:bg-success/30">Hoạt động</Badge>;
      case "expired":
        return <Badge variant="secondary">Hết hạn</Badge>;
      case "completed":
        return <Badge className="bg-primary/20 text-primary hover:bg-primary/30">Đã thanh toán</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>
              {isStatic ? "Danh sách QR Code" : "Danh sách link thanh toán"} ({totalCount})
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Xóa lọc
              </Button>
            )}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã, mô tả..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} size="sm">Tìm</Button>
            <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="completed">Đã thanh toán</SelectItem>
                <SelectItem value="expired">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {isStatic ? <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" /> : <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />}
              <p>{hasActiveFilters ? "Không tìm thấy kết quả" : isStatic ? "Bạn chưa tạo QR Code nào" : "Bạn chưa tạo link thanh toán nào"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead className="hidden md:table-cell">Mô tả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-mono text-sm">{link.code}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(link.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">{link.description || "-"}</TableCell>
                      <TableCell>{getStatusBadge(link.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(link.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(link.code, link.id)}>
                            {copiedId === link.id ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => window.open(getPaymentUrl(link.code), "_blank")}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(link.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DataPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {isStatic ? "QR Code" : "link thanh toán"} này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PaymentLinksList;
