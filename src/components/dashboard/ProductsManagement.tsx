import { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Package, Plus, Search, Pencil, Trash2, Image as ImageIcon, Upload,
  Star, EyeOff, Eye, TrendingUp, AlertTriangle, Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProducts, Product } from "@/hooks/useProducts";
import { toast } from "sonner";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const ProductsManagement = () => {
  const { products, loading, save, remove, toggleActive, uploadImage } = useProducts();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q);
  }), [products, search]);

  const totals = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => !p.unlimited_stock && p.stock <= 3 && p.is_active).length,
    sold: products.reduce((s, p) => s + p.sold_count, 0),
  }), [products]);

  const openCreate = () => { setEditing({ price: 0, stock: 0, is_active: true }); setEditOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setEditOpen(true); };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) setEditing(prev => ({ ...prev!, image_url: url }));
  };

  const handleSave = async () => {
    if (!editing?.name?.trim()) return toast.error("Vui lòng nhập tên sản phẩm");
    await save(editing);
    setEditOpen(false);
    setEditing(null);
  };

  const STATS = [
    { label: "Sản phẩm", value: totals.total, icon: Package, color: "text-primary" },
    { label: "Đang bán", value: totals.active, icon: Eye, color: "text-emerald-500" },
    { label: "Sắp hết", value: totals.lowStock, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Đã bán", value: totals.sold, icon: TrendingUp, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Sản phẩm</h1>
              <p className="text-muted-foreground text-sm">Quản lý catalog hiển thị trên cửa hàng</p>
            </div>
          </div>
          <Button size="sm" onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" /> Thêm sản phẩm
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <Card key={s.label} className="border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold tabular-nums">{fmt(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40">
        <CardContent className="p-3 md:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, danh mục, SKU..." className="pl-9 h-10" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Chưa có sản phẩm nào. Nhấn <b>Thêm sản phẩm</b> để bắt đầu.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((p) => (
                <div key={p.id} className="p-3 md:p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      {p.is_featured && <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-600 bg-amber-500/10"><Star className="h-2.5 w-2.5 mr-0.5" />Nổi bật</Badge>}
                      {!p.is_active && <Badge variant="outline" className="text-[10px] h-5">Tạm ẩn</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {p.category && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{p.category}</span>}
                      <span>{p.unlimited_stock ? "∞ kho" : `Còn ${p.stock}`}</span>
                      <span>Đã bán {p.sold_count}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {p.sale_price ? (
                      <>
                        <p className="text-sm font-bold tabular-nums text-primary">{fmt(p.sale_price)}₫</p>
                        <p className="text-[10px] text-muted-foreground line-through">{fmt(p.price)}₫</p>
                      </>
                    ) : (
                      <p className="text-sm font-bold tabular-nums">{fmt(p.price)}₫</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(p.id, !p.is_active)}>
                      {p.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Image */}
            <div className="space-y-1.5">
              <Label>Ảnh sản phẩm</Label>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                  {editing?.image_url
                    ? <img src={editing.image_url} alt="" className="h-full w-full object-cover" />
                    : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3.5 w-3.5" /> {uploading ? "Đang tải..." : "Tải ảnh"}
                  </Button>
                  {editing?.image_url && (
                    <Button type="button" variant="ghost" size="sm" className="ml-1 text-destructive"
                      onClick={() => setEditing({ ...editing!, image_url: null })}>
                      Xoá
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tên sản phẩm *</Label>
              <Input value={editing?.name || ""} onChange={e => setEditing({ ...editing!, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Giá gốc (₫)</Label>
                <Input type="number" value={editing?.price ?? 0} onChange={e => setEditing({ ...editing!, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Giá KM (₫)</Label>
                <Input type="number" value={editing?.sale_price ?? ""} placeholder="Để trống nếu không"
                  onChange={e => setEditing({ ...editing!, sale_price: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tồn kho</Label>
                <Input type="number" value={editing?.stock ?? 0}
                  disabled={editing?.unlimited_stock}
                  onChange={e => setEditing({ ...editing!, stock: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Danh mục</Label>
                <Input value={editing?.category || ""} placeholder="Đồ ăn / Áo / ..."
                  onChange={e => setEditing({ ...editing!, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea rows={3} value={editing?.description || ""}
                onChange={e => setEditing({ ...editing!, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Không giới hạn tồn kho</p>
                <p className="text-xs text-muted-foreground">Phù hợp dịch vụ/sản phẩm số</p>
              </div>
              <Switch checked={!!editing?.unlimited_stock}
                onCheckedChange={(v) => setEditing({ ...editing!, unlimited_stock: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Sản phẩm nổi bật</p>
                <p className="text-xs text-muted-foreground">Hiển thị đầu tiên trên cửa hàng</p>
              </div>
              <Switch checked={!!editing?.is_featured}
                onCheckedChange={(v) => setEditing({ ...editing!, is_featured: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Đang bán</p>
                <p className="text-xs text-muted-foreground">Tắt để ẩn tạm thời</p>
              </div>
              <Switch checked={editing?.is_active ?? true}
                onCheckedChange={(v) => setEditing({ ...editing!, is_active: v })} />
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
            <AlertDialogTitle>Xoá sản phẩm?</AlertDialogTitle>
            <AlertDialogDescription>Hành động không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) remove(deleteId); setDeleteId(null); }} className="bg-destructive">Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductsManagement;
