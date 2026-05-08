import { useEffect, useState } from "react";
import { Loader2, Store, ExternalLink, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminStores = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: stores } = await supabase.from("merchant_stores").select("*").order("created_at", { ascending: false });
    const mids = (stores ?? []).map((s: any) => s.merchant_id);
    const { data: merchants } = mids.length
      ? await supabase.from("merchants").select("id, business_name, email").in("id", mids)
      : { data: [] };
    const mMap = Object.fromEntries((merchants ?? []).map((m: any) => [m.id, m]));
    setRows((stores ?? []).map((s: any) => ({ ...s, merchant: mMap[s.merchant_id] })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("merchant_stores").update({ is_active: !is_active }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!is_active ? "Đã bật shop" : "Đã ẩn shop");
    load();
  };

  const filtered = rows.filter(r =>
    r.store_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.slug?.toLowerCase().includes(search.toLowerCase()) ||
    r.merchant?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Store className="h-7 w-7" /> Quản lý cửa hàng</h1>
          <p className="text-muted-foreground text-sm">Tất cả storefront công khai</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm shop..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin inline" /></div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Chủ sở hữu</TableHead>
                    <TableHead>Theme</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.store_name}</TableCell>
                      <TableCell className="font-mono text-xs">/{s.slug}</TableCell>
                      <TableCell>
                        <div className="text-sm">{s.merchant?.business_name}</div>
                        <div className="text-xs text-muted-foreground">{s.merchant?.email}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{s.theme_style}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "default" : "secondary"}>
                          {s.is_active ? "Hoạt động" : "Ẩn"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/store/${s.slug}`} target="_blank"><ExternalLink className="h-3 w-3" /></Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggle(s.id, s.is_active)}>
                          {s.is_active ? "Ẩn" : "Bật"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có shop nào</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStores;
