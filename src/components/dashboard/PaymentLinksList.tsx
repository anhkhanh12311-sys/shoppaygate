import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Link2, QrCode, Trash2, ExternalLink, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePaymentLinks, type PaymentLink } from "@/hooks/usePaymentLinks";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

interface PaymentLinksListProps {
  links: PaymentLink[];
  loading: boolean;
  isStatic?: boolean;
}

const PaymentLinksList = ({ links, loading, isStatic = false }: PaymentLinksListProps) => {
  const { deletePaymentLink } = usePaymentLinks();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const getPaymentUrl = (code: string) => `${window.location.origin}/pay/${code}`;

  const copyToClipboard = async (code: string, id: string) => {
    await navigator.clipboard.writeText(getPaymentUrl(code));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Đã sao chép",
      description: "Link đã được sao chép vào clipboard",
    });
  };

  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await deletePaymentLink(deleteId);
      if (error) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không thể xóa link. Vui lòng thử lại.",
        });
      } else {
        toast({
          title: "Đã xóa",
          description: isStatic ? "QR Code đã được xóa" : "Link thanh toán đã được xóa",
        });
      }
      setDeleteId(null);
    }
  };

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

  if (links.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            <div className="mb-4">
              {isStatic ? (
                <QrCode className="h-12 w-12 mx-auto text-muted-foreground/50" />
              ) : (
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
              )}
            </div>
            <p>
              {isStatic
                ? "Bạn chưa tạo QR Code nào"
                : "Bạn chưa tạo link thanh toán nào"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {isStatic ? "Danh sách QR Code" : "Danh sách link thanh toán"} ({links.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                <AnimatePresence>
                  {links.map((link) => (
                    <motion.tr
                      key={link.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b"
                    >
                      <TableCell className="font-mono text-sm">{link.code}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(link.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {link.description || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(link.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(link.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(link.code, link.id)}
                          >
                            {copiedId === link.id ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(getPaymentUrl(link.code), "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(link.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {isStatic ? "QR Code" : "link thanh toán"} này?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PaymentLinksList;
