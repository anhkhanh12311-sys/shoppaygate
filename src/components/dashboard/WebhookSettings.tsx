import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Webhook, Loader2, Check, Copy, Eye, EyeOff, RefreshCw,
  ExternalLink, AlertTriangle, CheckCircle2, XCircle, Info, Shield, Link2,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cấu hình Webhook SePay</h1>
        <p className="text-muted-foreground">
          Kết nối SePay để tự động nhận thông báo giao dịch ngân hàng
        </p>
      </div>

      {/* Step-by-step SePay Configuration Guide */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Hướng dẫn cấu hình trên SePay
          </CardTitle>
          <CardDescription>
            Làm theo các bước dưới đây để SePay tự động gửi thông báo giao dịch đến hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center p-0">1</Badge>
              <h3 className="font-semibold">Truy cập trang Webhooks trên SePay</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Đăng nhập vào{" "}
              <a href="https://my.sepay.vn/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                my.sepay.vn/webhooks <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → Nhấn <strong>+ Thêm webhooks</strong>
            </p>
          </div>

          {/* Step 2: Webhook URL */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center p-0">2</Badge>
              <h3 className="font-semibold">Dán Webhook URL vào SePay</h3>
            </div>
            <div className="ml-9 space-y-2">
              <p className="text-sm text-muted-foreground">
                Sao chép URL bên dưới và dán vào mục <strong>"Gọi đến URL"</strong> trên SePay:
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={sepayWebhookUrl}
                  className="font-mono text-sm bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => sepayWebhookUrl && copyToClipboard(sepayWebhookUrl, "Webhook URL")}
                  disabled={!sepayWebhookUrl}
                >
                  {copied === "Webhook URL" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Step 3: Events */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center p-0">3</Badge>
              <h3 className="font-semibold">Chọn sự kiện & điều kiện</h3>
            </div>
            <div className="ml-9 space-y-2 text-sm text-muted-foreground">
              <div className="grid gap-2">
                <div className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Sự kiện:</strong> Chọn "Có tiền vào" (hệ thống chỉ xử lý giao dịch tiền vào)</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Tài khoản ngân hàng:</strong> Chọn tài khoản bạn muốn nhận webhook</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Là webhooks xác thực thanh toán:</strong> Chọn "Đúng"</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Auth Config */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center p-0">4</Badge>
              <h3 className="font-semibold">Cấu hình chứng thực</h3>
            </div>
            <div className="ml-9 space-y-3">
              <p className="text-sm text-muted-foreground">
                Chọn kiểu chứng thực <strong>"API Key"</strong> trên SePay, sau đó dán API Key bên dưới:
              </p>

              {/* Webhook API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Webhook API Key
                  {webhookApiKey ? (
                    <Badge variant="outline" className="text-green-600 border-green-500/30 text-xs">Đã tạo</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Chưa tạo</Badge>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={webhookApiKey || "Nhấn 'Tạo API Key' để bắt đầu"}
                      readOnly
                      className="pr-10 font-mono text-sm bg-muted"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => webhookApiKey && copyToClipboard(webhookApiKey, "API Key")}
                    disabled={!webhookApiKey}
                  >
                    {copied === "API Key" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateNewApiKey}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">{webhookApiKey ? "Tạo lại" : "Tạo API Key"}</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dán API Key này vào mục "API Key" trong cấu hình chứng thực SePay. Content-Type chọn <code>application/json</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center p-0">5</Badge>
              <h3 className="font-semibold">Nhấn "Thêm" để hoàn tất</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Sau khi thêm, bạn có thể kiểm tra bằng cách chuyển khoản thử hoặc sử dụng tính năng{" "}
              <a href="https://my.sepay.vn/transactions" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                Giả lập giao dịch <ExternalLink className="h-3 w-3" />
              </a>{" "}
              (nếu dùng tài khoản Demo)
            </p>
          </div>

          {/* SePay Payload Reference */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">📦 Dữ liệu SePay gửi qua webhook:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{JSON.stringify({
  id: 92704,
  gateway: "Vietcombank",
  transactionDate: "2023-03-25 14:02:37",
  accountNumber: "0123499999",
  code: null,
  content: "chuyen tien mua iphone PG-ABC123",
  transferType: "in",
  transferAmount: 2277000,
  accumulated: 19077000,
  subAccount: null,
  referenceCode: "MBVCB.3278907687",
  description: "",
}, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Lưu ý quan trọng</p>
                <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Nội dung chuyển khoản phải chứa mã thanh toán (VD: <code>PG-ABC123</code>) để hệ thống tự động nhận diện</li>
                  <li>SePay sẽ retry tối đa 7 lần nếu webhook thất bại</li>
                  <li>Hệ thống tự động chống trùng lặp giao dịch</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Merchant's own webhook (for forwarding to their system) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Webhook đến hệ thống của bạn (tùy chọn)
          </CardTitle>
          <CardDescription>
            Nhận thông báo realtime khi có giao dịch thành công — chuyển tiếp đến server của bạn
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
      <Card>
        <CardHeader>
          <CardTitle>Tài liệu tích hợp webhook</CardTitle>
          <CardDescription>Xử lý webhook từ PayGate trên server của bạn</CardDescription>
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
