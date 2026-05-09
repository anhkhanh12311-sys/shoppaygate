import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Book, Copy, Check, ShieldCheck, Webhook, Zap, Code2, KeyRound, AlertTriangle, ListChecks, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useMerchant } from "@/hooks/useMerchant";
import { useSystemSetting, ApiBrandingSetting } from "@/hooks/useSystemSettings";
import { toast } from "sonner";

const PROJECT_REF = "desgajgtdoxcgxlledww";
const WEBHOOK_BASE = `https://${PROJECT_REF}.functions.supabase.co`;

const CodeBlock = ({ children, lang }: { children: string; lang?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success("Đã copy");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      {lang && <Badge variant="outline" className="absolute top-2 left-2 text-[10px] uppercase">{lang}</Badge>}
      <Button size="icon" variant="ghost" onClick={copy} className="absolute top-1 right-1 h-7 w-7">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <pre className="bg-muted/70 border rounded-xl p-4 pt-8 overflow-x-auto text-xs leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
};

const Endpoint = ({ method, path, desc }: { method: string; path: string; desc: string }) => {
  const color =
    method === "POST" ? "bg-blue-500/15 text-blue-600 border-blue-500/30" :
    method === "GET" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" :
    "bg-orange-500/15 text-orange-600 border-orange-500/30";
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card/40">
      <Badge variant="outline" className={`font-mono ${color}`}>{method}</Badge>
      <div className="flex-1 min-w-0">
        <code className="text-xs font-mono break-all">{path}</code>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
};

const ApiDocs = () => {
  const { merchant } = useMerchant();
  const { value: brand } = useSystemSetting<ApiBrandingSetting>("api_branding");
  const apiVersion = brand?.api_version ?? "v2";
  const brandName = brand?.brand_name ?? "PayGate";

  const merchantId = merchant?.id ?? "<MERCHANT_ID>";
  const webhookIngest = `${WEBHOOK_BASE}/sepay-webhook?merchant_id=${merchantId}`;
  const callbackTest = `${WEBHOOK_BASE}/send-topup-callback`;

  const nodeReceiver = useMemo(() => `// Express endpoint nhận tín hiệu nạp tiền từ ${brandName}
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "1mb" }));

const ${brandName.toUpperCase().replace(/[^A-Z]/g, "")}_SECRET = process.env.PAYGATE_SECRET;

app.post("/paygate/topup", (req, res) => {
  // 1) Verify signature (HMAC-SHA256)
  const raw = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", ${brandName.toUpperCase().replace(/[^A-Z]/g, "")}_SECRET)
    .update(raw)
    .digest("hex");
  if (req.headers["x-paygate-signature"] !== expected) {
    return res.status(401).json({ ok: false, error: "Invalid signature" });
  }

  // 2) Idempotency — chống double credit
  const { event, customer_ref, amount, transaction_id, bank_reference } = req.body;
  if (event !== "topup.success") return res.status(200).json({ ok: true, ignored: true });

  // 3) Cộng tiền cho user trong DB của bạn (PHẢI dùng transaction_id làm key chống trùng)
  //    INSERT ... ON CONFLICT (transaction_id) DO NOTHING
  //    UPDATE wallets SET balance = balance + $amount WHERE user_id = $customer_ref

  return res.status(200).json({ ok: true });
});

app.listen(3000);`, [brandName]);

  const phpReceiver = useMemo(() => `<?php
// Endpoint PHP nhận callback từ ${brandName}
$secret = getenv('PAYGATE_SECRET');
$raw = file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_PAYGATE_SIGNATURE'] ?? '';
$expected = hash_hmac('sha256', $raw, $secret);

if (!hash_equals($expected, $sig)) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'Invalid signature']);
  exit;
}

$payload = json_decode($raw, true);
if (($payload['event'] ?? '') !== 'topup.success') {
  echo json_encode(['ok' => true, 'ignored' => true]);
  exit;
}

// TODO: cộng tiền cho user $payload['customer_ref'], chống trùng theo $payload['transaction_id']

echo json_encode(['ok' => true]);`, [brandName]);

  const pythonReceiver = `# FastAPI receiver
from fastapi import FastAPI, Request, HTTPException
import hmac, hashlib, os

app = FastAPI()
SECRET = os.environ["PAYGATE_SECRET"].encode()

@app.post("/paygate/topup")
async def topup(req: Request):
    raw = await req.body()
    sig = req.headers.get("x-paygate-signature", "")
    expected = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(401, "Invalid signature")
    payload = await req.json()
    if payload.get("event") != "topup.success":
        return {"ok": True, "ignored": True}
    # credit user payload["customer_ref"] amount payload["amount"]
    # idempotent by payload["transaction_id"]
    return {"ok": True}`;

  const samplePayload = `{
  "event": "topup.success",
  "customer_ref": "USER_123",
  "amount": 100000,
  "transaction_id": "5f2a...e90c",
  "payment_code": "PG-ABC12345",
  "merchant_id": "${merchantId}",
  "bank_reference": "FT24090123456",
  "timestamp": "2026-05-08T12:00:00.000Z"
}`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Book className="h-6 w-6 text-primary" /> Tài liệu API {apiVersion}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Tích hợp {brandName} vào hệ thống của bạn — auto-bank, callback HMAC, idempotent.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> HMAC-SHA256</Badge>
          <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3" /> Realtime</Badge>
          <Badge variant="outline" className="gap-1"><Server className="h-3 w-3" /> REST</Badge>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Bảo mật là bắt buộc</AlertTitle>
        <AlertDescription className="text-xs">
          Mọi request gửi tới hệ thống của bạn đều ký HMAC-SHA256 bằng <code>topup_secret</code>.
          Hệ thống của bạn <strong>phải</strong> verify chữ ký và xử lý idempotent theo <code>transaction_id</code>.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="callback">Callback</TabsTrigger>
          <TabsTrigger value="signature">Chữ ký</TabsTrigger>
          <TabsTrigger value="examples">Code mẫu</TabsTrigger>
          <TabsTrigger value="checklist">Go-live</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Luồng tích hợp</CardTitle>
              <CardDescription>4 bước để hệ thống của bạn nhận tín hiệu nạp tiền tự động.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="space-y-2 list-decimal pl-5">
                <li>User trên website của bạn nhập số tiền muốn nạp → bạn hiển thị QR/thông tin chuyển khoản với nội dung <code className="px-1.5 py-0.5 rounded bg-muted">PG-XXXXXX USER_REF</code>.</li>
                <li>User chuyển khoản qua app ngân hàng — SePay nhận biến động số dư trong 1–3 giây.</li>
                <li>{brandName} nhận webhook từ SePay, đối soát, ký HMAC payload và POST tới <strong>Callback URL</strong> của bạn.</li>
                <li>Hệ thống của bạn verify chữ ký, cộng tiền cho user theo <code>customer_ref</code>, trả về HTTP 200.</li>
              </ol>
              <pre className="text-xs bg-muted/60 rounded-xl p-4 mt-2 overflow-x-auto">{`User → Bank App → SePay → ${brandName} → [HMAC] → Your Server → Wallet++`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Thông tin hệ thống của bạn</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Merchant ID</span>
                <code className="font-mono text-xs">{merchantId}</code>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">API Version</span>
                <Badge>{apiVersion}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">Webhook ingest từ SePay</span>
                <code className="font-mono text-[10px] truncate max-w-[60%]">{webhookIngest}</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code2 className="h-4 w-4" /> Endpoints chính</CardTitle>
              <CardDescription>Base URL: <code>{WEBHOOK_BASE}</code></CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Endpoint method="POST" path={`/sepay-webhook?merchant_id=${merchantId}`}
                desc="Webhook ingest. SePay gửi biến động giao dịch về đây — bạn KHÔNG cần gọi." />
              <Endpoint method="POST" path="/send-topup-callback"
                desc="Test gửi callback giả lập về Callback URL của bạn để verify tích hợp." />
              <Endpoint method="POST" path="<your-callback-url>"
                desc="Endpoint trên hệ thống của bạn. Nhận event topup.success — phải verify HMAC." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Headers chuẩn</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-muted/50"><strong>Content-Type:</strong> application/json</div>
              <div className="p-2 rounded bg-muted/50"><strong>X-PayGate-Event:</strong> topup.success</div>
              <div className="p-2 rounded bg-muted/50"><strong>X-PayGate-Signature:</strong> hex(hmac_sha256(body, secret))</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="callback" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Payload event <code>topup.success</code></CardTitle>
              <CardDescription>Đây là JSON {brandName} POST tới Callback URL của bạn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeBlock lang="json">{samplePayload}</CodeBlock>
              <div className="grid gap-2 text-xs">
                <Field name="event" type="string" desc='Luôn là "topup.success".' />
                <Field name="customer_ref" type="string|null" desc="ID user trên hệ thống bạn — lấy từ phần sau mã PG- trong nội dung CK." />
                <Field name="amount" type="number" desc="Số tiền đã nhận (VND, đơn vị đồng)." />
                <Field name="transaction_id" type="uuid" desc="ID giao dịch trên PayGate. DÙNG LÀM IDEMPOTENCY KEY." />
                <Field name="payment_code" type="string" desc="Mã link thanh toán dạng PG-XXXXX." />
                <Field name="merchant_id" type="uuid" desc="ID merchant nhận tiền." />
                <Field name="bank_reference" type="string" desc="Mã giao dịch ngân hàng (FT...)." />
                <Field name="timestamp" type="ISO8601" desc="Thời điểm giao dịch (UTC)." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Retry & độ tin cậy</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Trả về <Badge variant="outline">2xx</Badge> trong tối đa <strong>10 giây</strong>. Mọi response khác bị coi là <code>failed</code>.</p>
              <p>• Tất cả callback được lưu trong tab <strong>Nhật ký</strong> với HTTP status, payload, signature.</p>
              <p>• Idempotency: PayGate không tự retry — bạn nên xử lý kiểu "INSERT ON CONFLICT" theo <code>transaction_id</code> để chống trùng nếu bạn tự retry.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Verify HMAC-SHA256</CardTitle>
              <CardDescription>
                Server ký <code>HMAC_SHA256(body_raw_string, topup_secret)</code> → hex → header <code>X-PayGate-Signature</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeBlock lang="js">{`// Node.js
const expected = crypto.createHmac("sha256", SECRET)
  .update(rawBody)              // dùng raw string, KHÔNG re-stringify object
  .digest("hex");
if (req.headers["x-paygate-signature"] !== expected) reject();`}</CodeBlock>
              <CodeBlock lang="php">{`// PHP
$expected = hash_hmac('sha256', file_get_contents('php://input'), $secret);
if (!hash_equals($expected, $_SERVER['HTTP_X_PAYGATE_SIGNATURE'])) abort(401);`}</CodeBlock>
              <CodeBlock lang="python">{`# Python
import hmac, hashlib
expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
assert hmac.compare_digest(expected, request.headers["X-PayGate-Signature"])`}</CodeBlock>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Node.js / Express</CardTitle></CardHeader>
            <CardContent><CodeBlock lang="js">{nodeReceiver}</CodeBlock></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>PHP (Laravel/vanilla)</CardTitle></CardHeader>
            <CardContent><CodeBlock lang="php">{phpReceiver}</CodeBlock></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Python (FastAPI)</CardTitle></CardHeader>
            <CardContent><CodeBlock lang="python">{pythonReceiver}</CodeBlock></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Test bằng cURL</CardTitle></CardHeader>
            <CardContent>
              <CodeBlock lang="bash">{`curl -X POST ${callbackTest} \\
  -H "Authorization: Bearer <YOUR_JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{"test": true, "customer_ref": "USER_001", "amount": 50000}'`}</CodeBlock>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Checklist trước khi go-live</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  "Đã đăng ký gói cước phù hợp (Starter/Pro/Business).",
                  "Đã cấu hình Callback URL HTTPS công khai (không tự ký, không VPN).",
                  "Đã sinh secret ngẫu nhiên >= 32 ký tự cho HMAC.",
                  "Server verify chữ ký bằng raw body string — không stringify lại object.",
                  "Cộng tiền idempotent theo transaction_id (UNIQUE constraint).",
                  "Đã chạy 'Gửi tín hiệu test' và nhận HTTP 200.",
                  "Đã thử nạp thật một số tiền nhỏ và đối soát tab Nhật ký.",
                  "Đã thiết lập alert nếu Nhật ký xuất hiện callback failed.",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

const Field = ({ name, type, desc }: { name: string; type: string; desc: string }) => (
  <div className="p-2 rounded-lg bg-muted/40 border">
    <div className="flex items-center gap-2">
      <code className="font-mono text-xs font-bold text-primary">{name}</code>
      <Badge variant="outline" className="text-[10px]">{type}</Badge>
    </div>
    <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
  </div>
);

export default ApiDocs;
