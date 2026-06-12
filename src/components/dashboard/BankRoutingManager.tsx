import { useState } from "react";
import { Network, Link2, ArrowUp, ArrowDown, Zap, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useBankRouting, RoutingBank } from "@/hooks/useBankRouting";
import { KpiCard } from "@/components/ui/kpi-card";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const BankRoutingManager = () => {
  const { banks, stats, loading, updateRouting, linkSepay } = useBankRouting();
  const [linkOpen, setLinkOpen] = useState<RoutingBank | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");

  const move = (b: RoutingBank, dir: "up" | "down") => {
    const next = dir === "up" ? Math.max(1, b.priority - 10) : b.priority + 10;
    updateRouting(b.id, { priority: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" /> Điều phối ngân hàng tự động
        </h1>
        <p className="text-sm text-muted-foreground">
          Hệ thống tự chọn ngân hàng tốt nhất theo hạn mức ngày và mức ưu tiên cho mỗi giao dịch
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tổng ngân hàng" value={stats.total_banks} icon={Building2} />
        <KpiCard label="Đang điều phối" value={stats.active_routing} icon={Zap} accent="from-emerald-500/15 to-transparent" />
        <KpiCard label="Liên kết SePay" value={stats.linked_sepay} icon={Link2} accent="from-blue-500/15 to-transparent" />
        <KpiCard label="Nhận hôm nay" value={fmt(stats.today_received) + "₫"} icon={ShieldCheck} accent="from-orange-500/15 to-transparent" />
      </div>

      {loading ? (
        <div className="grid gap-3">{[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : banks.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>Chưa có ngân hàng. Hãy thêm trong mục Ngân hàng trước.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {banks.map(b => {
            const usedPercent = b.daily_limit
              ? Math.min(100, (b.current_daily_received / b.daily_limit) * 100) : 0;
            return (
              <div key={b.id} className="rounded-2xl border bg-card/40 backdrop-blur-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{b.bank_name}</p>
                      {b.is_default && <Badge variant="secondary" className="text-[10px]">Mặc định</Badge>}
                      {b.sepay_api_key && <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">SePay liên kết</Badge>}
                      <Badge variant="outline" className="text-[10px]">Ưu tiên #{b.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{b.bank_account_number} · {b.bank_account_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => move(b, "up")}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => move(b, "down")}><ArrowDown className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Hạn mức nhận / ngày (₫)</Label>
                    <Input type="number" defaultValue={b.daily_limit ?? ""} placeholder="Để trống = không giới hạn"
                      onBlur={e => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        if (v !== b.daily_limit) updateRouting(b.id, { daily_limit: v });
                      }} />
                    {b.daily_limit && (
                      <div className="space-y-1">
                        <Progress value={usedPercent} className="h-1.5" />
                        <p className="text-[11px] text-muted-foreground">
                          Đã nhận {fmt(b.current_daily_received)}₫ / {fmt(b.daily_limit)}₫ ({usedPercent.toFixed(0)}%)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <p className="text-sm font-medium">Tự điều phối</p>
                        <p className="text-xs text-muted-foreground">Cho phép hệ thống tự chọn TK này</p>
                      </div>
                      <Switch checked={b.auto_route_enabled} onCheckedChange={c => updateRouting(b.id, { auto_route_enabled: c })} />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => { setLinkOpen(b); setApiKey(b.sepay_api_key || ""); setAccountId(b.sepay_account_id || ""); }}>
                      <Link2 className="h-4 w-4" />
                      {b.sepay_api_key ? "Cập nhật SePay" : "Liên kết SePay"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!linkOpen} onOpenChange={() => setLinkOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Liên kết SePay – {linkOpen?.bank_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>SePay API Key</Label>
              <Input type="password" placeholder="sk_..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Tạo tại my.sepay.vn → Cài đặt API</p>
            </div>
            <div>
              <Label>SePay Account ID</Label>
              <Input placeholder="ID tài khoản ngân hàng trong SePay" value={accountId} onChange={e => setAccountId(e.target.value)} />
            </div>
            <Button className="w-full" onClick={async () => { if (linkOpen) { await linkSepay(linkOpen.id, apiKey, accountId); setLinkOpen(null); } }}>
              Lưu liên kết
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankRoutingManager;
