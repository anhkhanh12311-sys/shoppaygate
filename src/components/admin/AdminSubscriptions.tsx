import { useEffect, useState } from "react";
import { Loader2, CreditCard, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const AdminSubscriptions = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: subs } = await supabase
        .from("merchant_subscriptions").select("*").order("updated_at", { ascending: false });
      const mids = (subs ?? []).map((s: any) => s.merchant_id);
      const pids = (subs ?? []).map((s: any) => s.plan_id);
      const [{ data: merchants }, { data: plans }] = await Promise.all([
        mids.length ? supabase.from("merchants").select("id, business_name, email").in("id", mids) : Promise.resolve({ data: [] }),
        pids.length ? supabase.from("subscription_plans").select("id, name, code").in("id", pids) : Promise.resolve({ data: [] }),
      ]);
      const mMap = Object.fromEntries((merchants ?? []).map((m: any) => [m.id, m]));
      const pMap = Object.fromEntries((plans ?? []).map((p: any) => [p.id, p]));
      setRows((subs ?? []).map((s: any) => ({
        ...s, merchant: mMap[s.merchant_id], plan: pMap[s.plan_id],
      })));
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r =>
    r.merchant?.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.merchant?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><CreditCard className="h-7 w-7" /> Đăng ký gói</h1>
          <p className="text-muted-foreground text-sm">Tất cả merchant đang sử dụng gói cước</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm merchant..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin inline" /></div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Chu kỳ</TableHead>
                    <TableHead>GD đã dùng</TableHead>
                    <TableHead>Hết hạn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.merchant?.business_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.merchant?.email}</div>
                      </TableCell>
                      <TableCell><Badge>{r.plan?.name ?? r.plan_id?.slice(0, 6)}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : r.status === "expired" ? "destructive" : "secondary"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.billing_cycle}</TableCell>
                      <TableCell>{fmt(r.tx_used)}</TableCell>
                      <TableCell>{r.expires_at ? new Date(r.expires_at).toLocaleDateString("vi-VN") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có đăng ký nào</TableCell></TableRow>
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

export default AdminSubscriptions;
