import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Link2, QrCode, Trash2, ExternalLink, Copy, Check, Search,
  X, MoreHorizontal, Clock, ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    toast({ title: "Đã sao chép ✓" });
  };

  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await deleteLink(deleteId);
      if (error) toast({ variant: "destructive", title: "Lỗi", description: "Không thể xóa" });
      else toast({ title: "Đã xóa ✓" });
      setDeleteId(null);
    }
  };

  const handleSearch = () => updateFilters({ ...filters, search: searchInput || undefined });
  const handleStatusFilter = (status: string) => updateFilters({ ...filters, status: status === "all" ? undefined : status });
  const clearFilters = () => { setSearchInput(""); updateFilters({}); };
  const hasActiveFilters = filters.status || filters.search;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-success/15 text-success border-success/30" variant="outline">Hoạt động</Badge>;
      case "expired": return <Badge variant="secondary">Hết hạn</Badge>;
      case "completed": return <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">Đã TT</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {isStatic ? <QrCode className="h-5 w-5 text-primary" /> : <Link2 className="h-5 w-5 text-primary" />}
              {isStatic ? "QR Codes" : "Links"} ({totalCount})
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                <X className="h-3 w-3" /> Xóa lọc
              </Button>
            )}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã, mô tả..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 h-9"
              />
            </div>
            <Button onClick={handleSearch} size="sm" variant="outline" className="h-9">Tìm</Button>
            <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="completed">Đã TT</SelectItem>
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
            <div className="text-center py-12 text-muted-foreground">
              {isStatic ? <QrCode className="h-14 w-14 mx-auto mb-4 text-muted-foreground/20" /> : <Link2 className="h-14 w-14 mx-auto mb-4 text-muted-foreground/20" />}
              <p className="font-medium">{hasActiveFilters ? "Không tìm thấy kết quả" : "Chưa có dữ liệu"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link, idx) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors group"
                >
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    link.status === "completed" ? "bg-primary/10 text-primary" :
                    link.status === "expired" ? "bg-muted text-muted-foreground" :
                    "bg-success/10 text-success"
                  }`}>
                    {isStatic ? <QrCode className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold truncate">{link.code}</span>
                      {getStatusBadge(link.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-foreground">{formatCurrency(link.amount)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{format(new Date(link.created_at), "dd/MM/yy HH:mm", { locale: vi })}</span>
                      {link.description && (
                        <>
                          <span className="hidden md:inline">•</span>
                          <span className="hidden md:inline truncate max-w-[200px]">{link.description}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(link.code, link.id)}>
                      {copiedId === link.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(getPaymentUrl(link.code), "_blank")}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(link.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <DataPagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
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
