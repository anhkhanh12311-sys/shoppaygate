import { useEffect, useState } from "react";
import { Wallet, Copy, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { useSystemSetting, TopupBankSetting } from "@/hooks/useSystemSettings";
import { toast } from "sonner";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
const QUICK = [50000, 100000, 200000, 500000, 1000000, 2000000];

const TopupBalance = () => {
  const { merchant } = useMerchant();
  const { value: sysBank } = useSystemSetting<TopupBankSetting>("topup_bank");
  const [balance, setBalance] = useState<number>(0);
  const [topupCode, setTopupCode] = useState<string>("");
  const [amount, setAmount] = useState<number>(100000);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!merchant) return;
    setLoading(true);
    const { data: m } = await supabase.from("merchants")
      .select("balance, topup_code").eq("id", merchant.id).single();
    setBalance(Number(m?.balance ?? 0));
    setTopupCode(m?.topup_code ?? "");
    const { data: h } = await supabase.from("balance_topups")
      .select("*").eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false }).limit(20);
    setHistory(h ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [merchant]);

  // Realtime: balance changes
  useEffect(() => {
    if (!merchant) return;
    const ch = supabase.channel(`balance-${merchant.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "merchants",
        filter: `id=eq.${merchant.id}`,
      }, () => load())
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "balance_topups",
        filter: `merchant_id=eq.${merchant.id}`,
      }, () => { toast.success("💰 Nạp tiền thành công!"); load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [merchant]);

  const defaultBank = sysBank ?? null;

  const qrUrl = defaultBank
    ? `https://img.vietqr.io/image/${encodeURIComponent(defaultBank.bank_name)}-${defaultBank.bank_account_number}-print.png?amount=${amount}&addInfo=${encodeURIComponent(topupCode)}&accountName=${encodeURIComponent(defaultBank.bank_account_name)}`
    : null;

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Đã copy"); };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" /> Nạp tiền vào ví PayGate
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Chuyển khoản với nội dung mã nạp — số dư cộng tự động trong vài giây.
        </p>
      </div>

      {/* Balance card */}
      <Card className="gradient-primary text-primary-foreground border-0 shadow-xl">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm opacity-80">Số dư hiện tại</p>
            <p className="text-4xl font-bold">{fmt(balance)}đ</p>
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardContent>
      </Card>

      {!defaultBank ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Hệ thống chưa cấu hình tài khoản nhận nạp tiền. Vui lòng liên hệ admin.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quét QR để nạp</CardTitle>
              <CardDescription>QR đã ghi sẵn nội dung — chỉ cần quét và xác nhận</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Số tiền</label>
                <Input type="number" value={amount} onChange={e => setAmount(+e.target.value || 0)} />
                <div className="flex flex-wrap gap-1 mt-2">
                  {QUICK.map(v => (
                    <Button key={v} size="sm" variant="outline" onClick={() => setAmount(v)}>
                      {fmt(v)}
                    </Button>
                  ))}
                </div>
              </div>
              {amount > 0 && qrUrl && (
                <div className="bg-white p-3 rounded-xl flex items-center justify-center">
                  <img src={qrUrl} alt="QR nạp tiền" className="w-full max-w-[280px]" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hoặc chuyển khoản thủ công</CardTitle>
              <CardDescription>Đảm bảo nội dung chuyển khoản chứa mã <code>{topupCode}</code></CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Ngân hàng" value={defaultBank.bank_name} />
              <Row label="Số tài khoản" value={defaultBank.bank_account_number} onCopy={copy} />
              <Row label="Chủ tài khoản" value={defaultBank.bank_account_name} />
              <Row label="Số tiền" value={`${fmt(amount)} đ`} onCopy={() => copy(String(amount))} />
              <Row label="Nội dung CK" value={topupCode} onCopy={copy} highlight />
              <p className="text-xs text-amber-500 pt-2">
                ⚠ Bắt buộc ghi đúng mã <strong>{topupCode}</strong> trong nội dung — nếu sai, tiền sẽ không được cộng tự động.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử nạp tiền</CardTitle>
          <CardDescription>20 giao dịch gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chưa có giao dịch nạp nào</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("vi-VN")}</TableCell>
                    <TableCell className="font-bold text-success">+{fmt(Number(h.amount))}đ</TableCell>
                    <TableCell><Badge variant="outline">{h.source}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.note ?? h.transfer_content ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Row = ({ label, value, onCopy, highlight }: { label: string; value: string; onCopy?: (s: string) => void; highlight?: boolean }) => (
  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
    <span className="text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`font-mono ${highlight ? "text-primary font-bold" : "font-medium"}`}>{value}</span>
      {onCopy && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onCopy(value)}><Copy className="h-3 w-3" /></Button>}
    </div>
  </div>
);

export default TopupBalance;
