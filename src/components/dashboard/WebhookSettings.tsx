import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Webhook, Loader2, Check, Copy, Eye, EyeOff, RefreshCw,
  ExternalLink, AlertTriangle, CheckCircle2, XCircle, Info, Shield, Link2, FileJson,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useMerchant } from "@/hooks/useMerchant";
import { useMerchantSecrets } from "@/hooks/useMerchantSecrets";

const schema = z.object({
  webhook_url: z.string().url("URL không hợp lệ").or(z.literal("")),
  webhook_enabled: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const generateApiKey = () => {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return "pgwh_" + Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

const generateSecret = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

const WebhookSettings = () => {
  const { merchant, updateMerchant, loading: merchantLoading } = useMerchant();
  const { secrets, updateSecrets } = useMerchantSecrets();
  const [isLoading, setIsLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      webhook_url: (merchant as any)?.webhook_url || "",
      webhook_enabled: (merchant as any)?.webhook_enabled || false,
    },
  });

  // Build the SePay webhook URL for this merchant
  const sepayWebhookUrl = useMemo(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId || !merchant) return "";
    return `https://${projectId}.supabase.co/functions/v1/sepay-webhook`;
  }, [merchant]);

  const webhookApiKey = secrets.webhook_api_key || "";

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const { error } = await updateMerchant({
      webhook_url: data.webhook_url || null,
      webhook_enabled: data.webhook_enabled,
    } as any);
    setIsLoading(false);
    toast(error
      ? { variant: "destructive", title: "Lỗi", description: "Không thể cập nhật cài đặt webhook" }
      : { title: "Thành công", description: "Đã lưu cài đặt webhook" }
    );
  };

  const generateNewApiKey = async () => {
    const newKey = generateApiKey();
    setIsLoading(true);
    const { error } = await updateSecrets({ webhook_api_key: newKey });
    setIsLoading(false);
    toast(error
      ? { variant: "destructive", title: "Lỗi", description: "Không thể tạo API key mới" }
      : { title: "Thành công", description: "Đã tạo Webhook API Key mới. Hãy cập nhật lại trong SePay." }
    );
  };

  const regenerateSecret = async () => {
    const newSecret = generateSecret();
    setIsLoading(true);
    const { error } = await updateSecrets({ webhook_secret: newSecret });
    setIsLoading(false);
    toast(error
      ? { variant: "destructive", title: "Lỗi", description: "Không thể tạo secret mới" }
      : { title: "Thành công", description: "Đã tạo webhook secret mới" }
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Đã sao chép", description: `${label} đã được sao chép` });
  };

  const testWebhook = async () => {
    const webhookUrl = form.getValues("webhook_url");
    if (!webhookUrl) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập URL webhook" });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PayGate-Signature": "test",
          "X-PayGate-Event": "test",
        },
        body: JSON.stringify({
          event: "test",
          data: { message: "Test webhook from PayGate", timestamp: new Date().toISOString() },
        }),
      });
      setTestResult(response.ok ? "success" : "error");
      toast(response.ok
        ? { title: "Webhook hoạt động!", description: "Đã gửi thành công" }
        : { variant: "destructive", title: "Webhook không phản hồi", description: `HTTP ${response.status}` }
      );
    } catch {
      setTestResult("error");
      toast({ variant: "destructive", title: "Không thể kết nối", description: "Kiểm tra lại URL webhook" });
    }
    setIsTesting(false);
  };

  if (merchantLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step-by-step SePay Configuration Guide */}
      <Card className="border-primary/20 rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base md:text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info className="h-4 w-4 text-primary" />
            </div>
            Hướng dẫn cấu hình trên SePay
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Làm theo 5 bước để SePay tự động gửi thông báo giao dịch về hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Step 1 */}
          <div className="relative rounded-xl border bg-card/40 p-3.5 sm:pl-12">
            <span className="hidden sm:flex absolute left-3.5 top-3.5 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center">1</span>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="sm:hidden h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              Truy cập trang Webhooks
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Đăng nhập{" "}
              <a href="https://my.sepay.vn/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline-offset-2 hover:underline inline-flex items-center gap-1">
                my.sepay.vn/webhooks <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → nhấn <strong>+ Thêm webhooks</strong>
            </p>
          </div>

          {/* Step 2: Webhook URL */}
          <div className="relative rounded-xl border bg-card/40 p-3.5 sm:pl-12">
            <span className="hidden sm:flex absolute left-3.5 top-3.5 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center">2</span>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="sm:hidden h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              Dán Webhook URL
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 mb-2.5 leading-relaxed">
              Dán URL bên dưới vào mục <strong>"Gọi đến URL"</strong>:
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1.5">
              <code className="flex-1 min-w-0 truncate text-[11px] sm:text-xs font-mono px-2 text-foreground">
                {sepayWebhookUrl || "—"}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => sepayWebhookUrl && copyToClipboard(sepayWebhookUrl, "Webhook URL")}
                disabled={!sepayWebhookUrl}
              >
                {copied === "Webhook URL" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Step 3: Events */}
          <div className="relative rounded-xl border bg-card/40 p-3.5 sm:pl-12">
            <span className="hidden sm:flex absolute left-3.5 top-3.5 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center">3</span>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2.5">
              <span className="sm:hidden h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              Chọn sự kiện & điều kiện
            </h3>
            <div className="grid gap-1.5 text-xs">
              {[
                ["Sự kiện", "Chọn \"Có tiền vào\""],
                ["Tài khoản ngân hàng", "Chọn tài khoản nhận webhook"],
                ["Webhook xác thực thanh toán", "Chọn \"Đúng\""],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground leading-snug"><strong className="text-foreground">{k}:</strong> {v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Auth Config */}
          <div className="relative rounded-xl border bg-card/40 p-3.5 sm:pl-12">
            <span className="hidden sm:flex absolute left-3.5 top-3.5 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center">4</span>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="sm:hidden h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">4</span>
              Cấu hình chứng thực
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 mb-2.5 leading-relaxed">
              Chọn kiểu <strong>"API Key"</strong> rồi dán key bên dưới:
            </p>

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" /> Webhook API Key
              </span>
              {webhookApiKey ? (
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px] h-5">Đã tạo</Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] h-5">Chưa tạo</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1.5">
              <input
                type={showApiKey ? "text" : "password"}
                value={webhookApiKey || "Chưa có key"}
                readOnly
                className="flex-1 min-w-0 bg-transparent text-[11px] sm:text-xs font-mono px-2 outline-none text-foreground"
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button" variant="secondary" size="icon" className="h-8 w-8 flex-shrink-0"
                onClick={() => webhookApiKey && copyToClipboard(webhookApiKey, "API Key")}
                disabled={!webhookApiKey}
              >
                {copied === "API Key" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button" variant="outline" size="sm"
              onClick={generateNewApiKey} disabled={isLoading}
              className="mt-2 w-full gap-1.5 h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {webhookApiKey ? "Tạo lại API Key" : "Tạo API Key"}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Content-Type chọn <code className="text-[10px] bg-muted px-1 py-0.5 rounded">application/json</code>.
            </p>
          </div>

          {/* Step 5 */}
          <div className="relative rounded-xl border bg-card/40 p-3.5 sm:pl-12">
            <span className="hidden sm:flex absolute left-3.5 top-3.5 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center">5</span>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="sm:hidden h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">5</span>
              Hoàn tất
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Nhấn <strong>"Thêm"</strong>, sau đó kiểm tra bằng chuyển khoản thử hoặc{" "}
              <a href="https://my.sepay.vn/transactions" target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline-offset-2 hover:underline inline-flex items-center gap-1">
                Giả lập giao dịch <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* SePay Payload Reference */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="payload-ref" className="border rounded-xl bg-muted/30 px-3.5">
              <AccordionTrigger className="text-xs font-medium py-3 hover:no-underline">
                <span className="flex items-center gap-2"><FileJson className="h-4 w-4 text-primary" /> Dữ liệu SePay gửi qua webhook</span>
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono rounded-lg bg-background/60 p-3">
{JSON.stringify({
  id: 92704,
  gateway: "Vietcombank",
  transactionDate: "2023-03-25 14:02:37",
  content: "chuyen tien mua iphone PG-ABC123",
  transferType: "in",
  transferAmount: 2277000,
  referenceCode: "MBVCB.3278907687",
}, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5">
              <p className="font-semibold text-foreground">Lưu ý quan trọng</p>
              <ul className="text-muted-foreground space-y-1 list-disc pl-4 leading-relaxed">
                <li>Nội dung CK phải chứa mã thanh toán (VD: <code className="text-[10px] bg-muted px-1 rounded">PG-ABC123</code>)</li>
                <li>SePay retry tối đa 7 lần nếu webhook thất bại</li>
                <li>Hệ thống tự động chống trùng lặp giao dịch</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Merchant's own webhook (for forwarding to their system) */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base md:text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            Webhook đến hệ thống của bạn
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Tùy chọn — nhận thông báo realtime, chuyển tiếp đến server của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="webhook_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Bật Webhook chuyển tiếp</FormLabel>
                      <FormDescription>Gửi thông báo khi có thanh toán đến URL của bạn</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="webhook_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL của bạn</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input placeholder="https://your-server.com/webhook" {...field} />
                        <Button
                          type="button" variant="outline" size="icon"
                          onClick={testWebhook}
                          disabled={isTesting || !field.value}
                        >
                          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" />
                            : testResult === "success" ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : testResult === "error" ? <XCircle className="h-4 w-4 text-destructive" />
                            : <ExternalLink className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>URL hỗ trợ POST, trả về HTTP 200</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Webhook Secret for merchant's own webhook */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Webhook Secret (HMAC-SHA256)</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={secrets.webhook_secret || "Chưa tạo"}
                      readOnly
                      className="pr-10 font-mono text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => secrets.webhook_secret && copyToClipboard(secrets.webhook_secret, "Secret")} disabled={!secrets.webhook_secret}>
                    {copied === "Secret" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={regenerateSecret} disabled={isLoading}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Xác thực requests từ PayGate bằng HMAC-SHA256</p>
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</> : <><Check className="mr-2 h-4 w-4" />Lưu cài đặt</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Integration docs for merchant's own webhook */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base md:text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileJson className="h-4 w-4 text-primary" />
            </div>
            Tài liệu tích hợp webhook
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Xử lý webhook từ PayGate trên server của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="payload">
              <AccordionTrigger>Payload mẫu (PayGate → Server bạn)</AccordionTrigger>
              <AccordionContent>
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{JSON.stringify({
  event: "payment.completed",
  data: {
    transaction_id: "uuid",
    payment_link_id: "uuid",
    payment_code: "PG-ABC123",
    amount: 100000,
    transfer_content: "PG-ABC123",
    bank_reference: "FT12345678",
    paid_at: "2024-01-01T10:00:00Z",
    merchant_id: "uuid",
  },
  timestamp: "2024-01-01T10:00:00Z",
}, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="verify">
              <AccordionTrigger>Xác thực Signature (Node.js)</AccordionTrigger>
              <AccordionContent>
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
}

app.post('/webhook', (req, res) => {
  const sig = req.headers['x-paygate-signature'];
  if (!verifySignature(req.body, sig, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  console.log('Payment received:', req.body);
  res.status(200).send('OK');
});`}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookSettings;
