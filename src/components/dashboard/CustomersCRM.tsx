import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, UserPlus, Search, RefreshCw, Phone, Mail, Pencil, Trash2,
  Crown, Star, Sparkles, Ban, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCustomers, Customer, CustomerTag } from "@/hooks/useCustomers";
import { Skeleton } from "@/components/ui/skeleton";

const TAG_META: Record<CustomerTag, { label: string; icon: any; cls: string }> = {
  vip: { label: "VIP", icon: Crown, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  regular: { label: "Thân thiết", icon: Star, cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  new: { label: "Mới", icon: Sparkles, cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  blocked: { label: "Chặn", icon: Ban, cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const CustomersCRM = () => {
  const { customers, stats, loading, syncing, upsert, remove, syncFromTransactions } = useCustomers();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<CustomerTag | "all">("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (tagFilter !== "all" && c.tag !== tagFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (c.full_name || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    });
  }, [customers, search, tagFilter]);

  const openCreate = () => {
    setEditing({ tag: "new" });
    setEditOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    await upsert({
      id: editing.id,
      full_name: editing.full_name || "",
      phone: editing.phone || "",
      email: editing.email || "",
      tag: (editing.tag as CustomerTag) || "new",
      notes: editing.notes || "",
    });
    setEditOpen(false);
    setEditing(null);
  };

  const STATS = [
    { label: "Tổng khách", value: stats.total, icon: Users, color: "text-primary" },
    { label: "VIP", value: stats.vip, icon: Crown, color: "text-amber-500" },
    { label: "Mới tháng này", value: stats.new_month, icon: Sparkles, color: "text-emerald-500" },
    { label: "Tổng chi tiêu", value: `${fmt(stats.total_spent)}₫`, icon: TrendingUp, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Khách hàng</h1>
              <p className="text-muted-foreground text-sm">
                CRM nhẹ — gom tự động từ giao dịch & quản lý tag VIP
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={syncFromTransactions} disabled={syncing} className="rounded-xl">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Gom từ GD
            </Button>
            <Button size="sm" onClick={openCreate} className="rounded-xl">
              <UserPlus className="h-4 w-4" /> Thêm khách
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-xl font-bold tabular-nums">
                  {typeof s.value === "number" ? fmt(s.value) : s.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên, SĐT, email..."
                className="pl-9 h-10"
              />
            </div>
            <Select value={tagFilter} onValueChange={(v) => setTagFilter(v as any)}>
              <SelectTrigger className="md:w-48 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tag</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="regular">Thân thiết</SelectItem>
                <SelectItem value="new">Mới</SelectItem>
                <SelectItem value="blocked">Đã chặn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border/40">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Chưa có khách hàng nào. Nhấn <b>Gom từ GD</b> để tự nhập từ giao dịch.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((c) => {
                const meta = TAG_META[c.tag];
                const Icon = meta.icon;
                return (
                  <div key={c.id} className="p-3 md:p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-semibold text-primary shrink-0">
                      {(c.full_name || c.phone || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{c.full_name || "Khách lạ"}</p>
                        <Badge variant="outline" className={`text-[10px] h-5 ${meta.cls}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                        {c.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{c.email}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{fmt(c.total_spent)}₫</p>
                      <p className="text-[10px] text-muted-foreground">{c.tx_count} GD</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa khách hàng" : "Thêm khách hàng"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tên khách</Label>
              <Input value={editing?.full_name || ""} onChange={e => setEditing({ ...editing!, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Số điện thoại</Label>
                <Input value={editing?.phone || ""} onChange={e => setEditing({ ...editing!, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tag</Label>
                <Select value={editing?.tag || "new"} onValueChange={(v) => setEditing({ ...editing!, tag: v as CustomerTag })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Mới</SelectItem>
                    <SelectItem value="regular">Thân thiết</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="blocked">Chặn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={editing?.email || ""} onChange={e => setEditing({ ...editing!, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Textarea rows={3} value={editing?.notes || ""} onChange={e => setEditing({ ...editing!, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Huỷ</Button>
            <Button onClick={handleSave}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá khách này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động không thể hoàn tác. Lịch sử giao dịch vẫn được giữ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) remove(deleteId); setDeleteId(null); }} className="bg-destructive">
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomersCRM;
