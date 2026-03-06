import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertTriangle, Search, CheckCircle2, XCircle, Filter, RefreshCw, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { motion } from "framer-motion";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

interface MismatchedTx {
  transaction_id: string;
  amount: number;
  transfer_content: string;
  bank_reference: string | null;
  expected_code: string;
  payment_link_id: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const SmartFilter = () => {
  const { merchant } = useMerchant();
  const [mismatched, setMismatched] = useState<MismatchedTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTx, setDetailTx] = useState<MismatchedTx | null>(null);

  const fetchMismatched = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_mismatched_transactions", {
      p_merchant_id: merchant.id,
      p_limit: 100,
    });
    if (!error && data) setMismatched(data as MismatchedTx[]);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { fetchMismatched(); }, [fetchMismatched]);

  const getSimilarity = (a: string, b: string) => {
    const la = a.toUpperCase().trim();
    const lb = b.toUpperCase().trim();
    if (la === lb) return 100;
    if (la.includes(lb) || lb.includes(la)) return 70;
    let match = 0;
    const shorter = la.length < lb.length ? la : lb;
    const longer = la.length < lb.length ? lb : la;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) match++;
    }
    return Math.round((match / longer.length) * 100);
  };

  const getSeverity = (content: string, expected: string) => {
    const sim = getSimilarity(content, expected);
    if (sim >= 70) return { level: "low", label: "Gần đúng", color: "bg-warning/20 text-warning" };
    if (sim >= 40) return { level: "medium", label: "Sai một phần", color: "bg-orange-500/20 text-orange-600" };
    return { level: "high", label: "Hoàn toàn sai", color: "bg-destructive/20 text-destructive" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
            <Filter className="h-7 w-7 text-primary" />
            Lọc siêu thông minh
          </h1>
          <p className="text-muted-foreground text-sm">
            Phát hiện giao dịch có nội dung chuyển khoản không khớp với mã thanh toán
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMismatched}>
          <RefreshCw className="h-4 w-4 mr-1" /> Quét lại
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sai nội dung</p>
                <p className="text-2xl font-bold">{mismatched.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng tiền ảnh hưởng</p>
                <p className="text-2xl font-bold">{formatCurrency(mismatched.reduce((s, t) => s + t.amount, 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đã xử lý</p>
                <p className="text-2xl font-bold">{mismatched.filter(t => t.status === "completed").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Giao dịch sai nội dung</CardTitle>
          <CardDescription>Hệ thống tự so sánh nội dung CK thực tế với mã thanh toán đúng</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : mismatched.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success/50" />
              <p className="font-medium">Tuyệt vời! Không có giao dịch sai nội dung</p>
              <p className="text-sm">Tất cả nội dung chuyển khoản đều khớp với mã thanh toán</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Nội dung CK thực tế</TableHead>
                    <TableHead className="hidden md:table-cell">Mã đúng</TableHead>
                    <TableHead>Mức độ</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mismatched.map((tx) => {
                    const severity = getSeverity(tx.transfer_content, tx.expected_code);
                    return (
                      <TableRow key={tx.transaction_id} className="hover:bg-muted/50">
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(tx.paid_at || tx.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                            {tx.transfer_content}
                          </code>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <code className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded">
                            {tx.expected_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge className={severity.color}>{severity.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setDetailTx(tx)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailTx} onOpenChange={() => setDetailTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết giao dịch sai nội dung</DialogTitle>
          </DialogHeader>
          {detailTx && (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Số tiền</span>
                  <span className="font-medium">{formatCurrency(detailTx.amount)}</span>
                </div>
                <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <p className="text-xs text-muted-foreground mb-1">Nội dung CK thực tế</p>
                  <code className="text-sm font-mono text-destructive">{detailTx.transfer_content}</code>
                </div>
                <div className="p-3 bg-success/5 rounded-lg border border-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Mã thanh toán đúng</p>
                  <code className="text-sm font-mono text-success">{detailTx.expected_code}</code>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Mã ngân hàng</span>
                  <span className="font-mono text-sm">{detailTx.bank_reference || "-"}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Thời gian</span>
                  <span className="text-sm">
                    {format(new Date(detailTx.paid_at || detailTx.created_at), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Mức độ</span>
                  <Badge className={getSeverity(detailTx.transfer_content, detailTx.expected_code).color}>
                    {getSeverity(detailTx.transfer_content, detailTx.expected_code).label}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartFilter;
