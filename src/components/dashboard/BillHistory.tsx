import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReceiptText, Calendar, TrendingUp, Sparkles, Eye, Send, MessageCircle, Mail, Link2, Printer } from "lucide-react";
import { useBillShares, type BillChannel } from "@/hooks/useBillShares";
import { useTransactions } from "@/hooks/useTransactions";
import { useReceiptSettings } from "@/hooks/useReceiptSettings";
import { ShareReceiptModal } from "@/components/receipt/ShareReceiptModal";
import { Skeleton } from "@/components/ui/skeleton";

const channelMeta: Record<BillChannel, { label: string; icon: any; color: string }> = {
  link: { label: "Link", icon: Link2, color: "bg-blue-100 text-blue-700" },
  zalo: { label: "Zalo", icon: MessageCircle, color: "bg-sky-100 text-sky-700" },
  sms: { label: "SMS", icon: Send, color: "bg-green-100 text-green-700" },
  email: { label: "Email", icon: Mail, color: "bg-purple-100 text-purple-700" },
  print: { label: "In", icon: Printer, color: "bg-gray-100 text-gray-700" },
};

const BillHistory = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState<BillChannel | "all">("all");
  const { shares, loading, stats } = useBillShares({
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
    channel,
  });
  const { transactions } = useTransactions();
  const { settings } = useReceiptSettings();
  const [shareTx, setShareTx] = useState<string | null>(null);

  const txMap = useMemo(() => {
    const m = new Map<string, typeof transactions[number]>();
    transactions.forEach((t) => m.set(t.id, t));
    return m;
  }, [transactions]);

  const activeTx = shareTx ? txMap.get(shareTx) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ReceiptText className="h-6 w-6 text-primary" /> Lịch sử bill đã gửi
        </h2>
        <p className="text-sm text-muted-foreground">Theo dõi mọi lần chia sẻ hoá đơn</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Hôm nay" value={stats.today} icon={Calendar} color="from-blue-500 to-cyan-500" />
        <StatCard label="Tuần này" value={stats.week} icon={TrendingUp} color="from-violet-500 to-purple-500" />
        <StatCard
          label="Kênh phổ biến"
          value={stats.topChannel ? channelMeta[stats.topChannel].label : "—"}
          icon={Sparkles}
          color="from-pink-500 to-rose-500"
        />
        <StatCard label="Tổng chia sẻ" value={stats.total} icon={ReceiptText} color="from-emerald-500 to-green-500" />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid sm:grid-cols-[1fr,1fr,200px] gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Từ ngày</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Đến ngày</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Kênh</label>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="zalo">Zalo</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="print">In</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : shares.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <ReceiptText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có bill nào được gửi</p>
          </div>
        ) : (
          <div className="divide-y">
            {shares.map((s) => {
              const meta = channelMeta[s.channel];
              const Icon = meta.icon;
              const tx = s.transaction_id ? txMap.get(s.transaction_id) : null;
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 hover:bg-muted/40 transition">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${meta.color} shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                      {tx && <span className="font-semibold text-sm">{new Intl.NumberFormat("vi-VN").format(tx.amount)}đ</span>}
                      {s.recipient && <span className="text-xs text-muted-foreground">→ {s.recipient}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}
                      {tx && <> · {tx.bank_reference || tx.id.slice(0, 8)}</>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {s.transaction_id && (
                      <Button size="icon" variant="ghost" onClick={() => window.open(`/bill/${s.transaction_id}`, "_blank")}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {tx && settings && (
                      <Button size="icon" variant="ghost" onClick={() => setShareTx(tx.id)}>
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {activeTx && settings && (
        <ShareReceiptModal
          open={!!shareTx}
          onOpenChange={(v) => !v && setShareTx(null)}
          settings={settings}
          transaction={{
            id: activeTx.id,
            amount: activeTx.amount,
            status: activeTx.status,
            paid_at: activeTx.paid_at,
            created_at: activeTx.created_at,
            bank_reference: activeTx.bank_reference,
            transfer_content: activeTx.transfer_content,
          }}
        />
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <Card className="p-4 relative overflow-hidden">
    <div className={`absolute -top-4 -right-4 h-16 w-16 rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl`} />
    <Icon className="h-5 w-5 text-muted-foreground" />
    <p className="text-2xl font-bold mt-2">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </Card>
);

export default BillHistory;
