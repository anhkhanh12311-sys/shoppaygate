import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Book, Copy, Check, ShieldCheck, Webhook, Zap, Code2, KeyRound,
  AlertTriangle, ListChecks, Server, Send, Play, Loader2, Sparkles,
  Layers, Lock, Activity, FileJson, Globe, Terminal, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useMerchant } from "@/hooks/useMerchant";
import { useSystemSetting, ApiBrandingSetting } from "@/hooks/useSystemSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PROJECT_REF = "desgajgtdoxcgxlledww";
const BASE_URL = `https://${PROJECT_REF}.functions.supabase.co`;

/* ----------------------------- Code Block ----------------------------- */
const CodeBlock = ({ children, lang }: { children: string; lang?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success("Đã copy");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden border bg-[hsl(222_47%_8%)] text-slate-100">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
          {lang && <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400 font-mono">{lang}</span>}
        </div>
        <Button size="sm" variant="ghost" onClick={copy} className="h-7 px-2 text-slate-300 hover:text-white hover:bg-white/10">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5 text-xs">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed font-mono">
        <code>{children}</code>
      </pre>
    </div>
  );
};

/* ----------------------------- Endpoint Row ----------------------------- */
const MethodBadge = ({ method }: { method: string }) => {
  const map: Record<string, string> = {
    POST: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    GET: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    DELETE: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    PUT: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  };
  return <Badge variant="outline" className={`font-mono text-[10px] px-2 ${map[method] ?? ""}`}>{method}</Badge>;
};

const Endpoint = ({ method, path, desc, auth }: { method: string; path: string; desc: string; auth?: string }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl border bg-card/40 hover:bg-card/70 transition">
    <MethodBadge method={method} />
    <div className="flex-1 min-w-0">
      <code className="text-xs font-mono break-all">{path}</code>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
    {auth && <Badge variant="secondary" className="text-[10px] gap-1"><Lock className="h-3 w-3" />{auth}</Badge>}
  </div>
);

/* ----------------------------- Field Row ----------------------------- */
const Field = ({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) => (
  <div className="grid grid-cols-[minmax(120px,auto)_1fr] md:grid-cols-[160px_120px_1fr] gap-2 md:gap-4 py-2.5 border-b last:border-0 border-border/60 text-xs">
    <div className="flex items-center gap-2">
      <code className="font-mono font-semibold text-foreground">{name}</code>
      {required && <span className="text-[9px] font-semibold uppercase text-rose-500">required</span>}
    </div>
    <code className="hidden md:block font-mono text-muted-foreground">{type}</code>
    <span className="text-muted-foreground col-span-2 md:col-span-1">{desc}</span>
  </div>
);

/* ----------------------------- Section Anchor ----------------------------- */
const Section = ({ id, icon: Icon, title, kicker, children }: { id: string; icon: any; title: string; kicker?: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 space-y-4">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        {kicker && <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">{kicker}</p>}
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
    </div>
    {children}
  </section>
);

/* ----------------------------- Main Component ----------------------------- */
const NAV = [
  { id: "intro", label: "Giới thiệu", icon: Sparkles },
  { id: "quickstart", label: "Quickstart", icon: Zap },
  { id: "auth", label: "Xác thực", icon: KeyRound },
  { id: "endpoints", label: "Endpoints", icon: Server },
  { id: "callback", label: "Callback Event", icon: Webhook },
  { id: "signature", label: "Chữ ký HMAC", icon: ShieldCheck },
  { id: "examples", label: "Code mẫu", icon: Code2 },
  { id: "tryit", label: "Test thử API", icon: Play },
  { id: "errors", label: "Mã lỗi", icon: AlertTriangle },
  { id: "checklist", label: "Go-live", icon: ListChecks },
];

const ApiDocs = () => {
  const { merchant } = useMerchant();
  const { value: brand } = useSystemSetting<ApiBrandingSetting>("api_branding");
  const apiVersion = brand?.api_version ?? "v2";
  const brandName = brand?.brand_name ?? "PayGate";
  const brandKey = brandName.toUpperCase().replace(/[^A-Z]/g, "") || "PAYGATE";

  const merchantId = merchant?.id ?? "<MERCHANT_ID>";
  const webhookIngest = `${BASE_URL}/sepay-webhook?merchant_id=${merchantId}`;
  const callbackTestUrl = `${BASE_URL}/send-topup-callback`;

  // --- Active section tracking ---
  const [active, setActive] = useState("intro");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.5, 1] }
    );
    NAV.forEach(n => { const el = document.getElementById(n.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  // --- Try It state ---
  const [testCustomer, setTestCustomer] = useState("USER_001");
  const [testAmount, setTestAmount] = useState("50000");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status?: number; body?: string; error?: string } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-topup-callback", {
        body: { test: true, customer_ref: testCustomer, amount: Number(testAmount) || 0 },
      });
      if (error) {
        setTestResult({ ok: false, error: error.message });
        toast.error("Test thất bại");
      } else {
        setTestResult({ ok: !!data?.ok, status: data?.http_status, body: data?.response, error: data?.error });
        if (data?.ok) toast.success(`Callback OK (${data.http_status})`);
        else toast.error(`Callback failed (${data?.http_status ?? "—"})`);
      }
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
      toast.error("Lỗi không xác định");
    }
    setTesting(false);
  };

  /* ----------------------------- Code samples ----------------------------- */
  const samplePayload = `{
  "event": "topup.success",
  "customer_ref": "USER_123",
  "amount": 100000,
  "transaction_id": "5f2a-1b3c-...-e90c",
  "payment_code": "PG-ABC12345",
  "merchant_id": "${merchantId}",
  "bank_reference": "FT24090123456789",
  "timestamp": "2026-05-08T12:00:00.000Z"
}`;

  const codeNode = useMemo(() => `// Express — receiver chuẩn cho ${brandName}
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json({ verify: (req, _, buf) => { (req as any).rawBody = buf; } }));

const SECRET = process.env.${brandKey}_SECRET!;

app.post("/${brandName.toLowerCase()}/topup", (req, res) => {
  // 1) Verify HMAC-SHA256 trên RAW body
  const raw = (req as any).rawBody.toString("utf8");
  const expected = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  if (req.headers["x-paygate-signature"] !== expected) {
    return res.status(401).json({ ok: false, error: "invalid_signature" });
  }

  const { event, customer_ref, amount, transaction_id } = req.body;
  if (event !== "topup.success") return res.status(200).json({ ok: true, ignored: true });

  // 2) Idempotent: INSERT ON CONFLICT (transaction_id) DO NOTHING
  //    UPDATE wallets SET balance = balance + $amount WHERE user_id = $customer_ref;

  return res.status(200).json({ ok: true });
});

app.listen(3000);`, [brandName, brandKey]);

  const codePhp = useMemo(() => `<?php
// ${brandName} receiver
$secret = getenv('${brandKey}_SECRET');
$raw = file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_PAYGATE_SIGNATURE'] ?? '';

if (!hash_equals(hash_hmac('sha256', $raw, $secret), $sig)) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'invalid_signature']); exit;
}

$p = json_decode($raw, true);
if (($p['event'] ?? '') !== 'topup.success') { echo json_encode(['ok' => true]); exit; }

// TODO: cộng tiền idempotent theo $p['transaction_id']
echo json_encode(['ok' => true]);`, [brandName, brandKey]);

  const codePython = useMemo(() => `# FastAPI — ${brandName} receiver
from fastapi import FastAPI, Request, HTTPException
import hmac, hashlib, os

app = FastAPI()
SECRET = os.environ["${brandKey}_SECRET"].encode()

@app.post("/${brandName.toLowerCase()}/topup")
async def topup(req: Request):
    raw = await req.body()
    sig = req.headers.get("x-paygate-signature", "")
    expected = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(401, "invalid_signature")
    p = await req.json()
    if p.get("event") != "topup.success":
        return {"ok": True, "ignored": True}
    # idempotent credit by p["transaction_id"]
    return {"ok": True}`, [brandName, brandKey]);

  const codeGo = useMemo(() => `// Go — ${brandName} receiver
package main

import (
  "crypto/hmac"; "crypto/sha256"; "encoding/hex"; "encoding/json"
  "io"; "net/http"; "os"
)

var secret = []byte(os.Getenv("${brandKey}_SECRET"))

func handler(w http.ResponseWriter, r *http.Request) {
  body, _ := io.ReadAll(r.Body)
  mac := hmac.New(sha256.New, secret); mac.Write(body)
  if r.Header.Get("X-PayGate-Signature") != hex.EncodeToString(mac.Sum(nil)) {
    http.Error(w, "invalid_signature", 401); return
  }
  var p map[string]any; json.Unmarshal(body, &p)
  // idempotent credit by p["transaction_id"]
  json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}`, [brandKey]);

  const codeCurl = `curl -X POST ${callbackTestUrl} \\
  -H "Authorization: Bearer <YOUR_SUPABASE_JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "test": true,
    "customer_ref": "USER_001",
    "amount": 50000
  }'`;

  /* ============================ RENDER ============================ */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-purple-500/5 to-background p-6 md:p-8 mb-6">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                <Sparkles className="h-3 w-3 mr-1" /> API {apiVersion}
              </Badge>
              <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3 text-emerald-500" /> Operational</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              {brandName} Developer Docs
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm md:text-base">
              Tích hợp cổng nạp tiền tự động vào website của bạn trong <strong>&lt;10 phút</strong>.
              Webhook ký HMAC-SHA256, idempotent, retry-safe, sẵn sàng production.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> HMAC-SHA256</Badge>
              <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3" /> Realtime &lt;3s</Badge>
              <Badge variant="outline" className="gap-1"><Layers className="h-3 w-3" /> Idempotent</Badge>
              <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" /> REST + JSON</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" })}>
              Bắt đầu nhanh <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button size="sm" onClick={() => document.getElementById("tryit")?.scrollIntoView({ behavior: "smooth" })}>
              <Play className="h-4 w-4 mr-1" /> Test ngay
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* SIDEBAR NAV */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 mb-2">Tài liệu</p>
            {NAV.map(n => (
              <a key={n.id} href={`#${n.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(n.id)?.scrollIntoView({ behavior: "smooth" }); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                  ${active === n.id
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <n.icon className="h-3.5 w-3.5" /> {n.label}
              </a>
            ))}
          </div>
        </aside>

        {/* CONTENT */}
        <div className="space-y-12 min-w-0">

          {/* --- INTRO --- */}
          <Section id="intro" icon={Book} title="Giới thiệu" kicker="01 · Overview">
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm">
                <p>
                  {brandName} là cổng thanh toán QR + auto-bank cho phép website/hệ thống của bạn
                  <strong> nhận tiền nạp từ user và tự động cộng số dư</strong> mà không cần thao tác thủ công.
                </p>
                <div className="grid sm:grid-cols-3 gap-3 mt-4">
                  {[
                    { icon: Zap, t: "Realtime", d: "Biến động số dư trong 1–3 giây" },
                    { icon: ShieldCheck, t: "HMAC-SHA256", d: "Mọi callback đều được ký" },
                    { icon: Layers, t: "Idempotent", d: "Chống double-credit bằng transaction_id" },
                  ].map((b, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-card/40">
                      <b.icon className="h-5 w-5 text-primary mb-2" />
                      <p className="font-semibold text-sm">{b.t}</p>
                      <p className="text-xs text-muted-foreground">{b.d}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* --- QUICKSTART --- */}
          <Section id="quickstart" icon={Zap} title="Quickstart 4 bước" kicker="02 · 10 phút">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <ol className="space-y-3 text-sm">
                  {[
                    ["Mua gói & cấu hình", "Vào tab Thuê Cổng → chọn gói → nhập Callback URL HTTPS + sinh Secret (≥32 ký tự)."],
                    ["Hiển thị QR cho user", `Khi user nạp, dùng mã PG-XXXXXX [USER_REF] làm nội dung CK. Phần USER_REF chính là customer_ref.`],
                    ["Chờ webhook", `${brandName} nhận tín hiệu SePay, đối soát, ký HMAC và POST tới Callback URL của bạn.`],
                    ["Verify & cộng tiền", "Verify chữ ký, cộng tiền idempotent theo transaction_id, trả HTTP 200."],
                  ].map(([t, d], i) => (
                    <li key={i} className="flex gap-3">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</div>
                      <div>
                        <p className="font-semibold">{t}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-dashed text-xs font-mono overflow-x-auto">
                  User → Bank App → SePay → {brandName} → [HMAC-Signed POST] → Your Server → Wallet++
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* --- AUTH --- */}
          <Section id="auth" icon={KeyRound} title="Xác thực & môi trường" kicker="03 · Auth">
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm">
                <p>Hệ thống dùng <strong>2 cơ chế</strong> tách biệt:</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border bg-card/40">
                    <p className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Inbound (SePay → {brandName})</p>
                    <p className="text-xs text-muted-foreground mt-1">SePay gửi header <code className="text-[10px]">Apikey &lt;webhook_api_key&gt;</code>. Sinh trong tab Cài đặt → API.</p>
                  </div>
                  <div className="p-4 rounded-xl border bg-card/40">
                    <p className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Outbound ({brandName} → bạn)</p>
                    <p className="text-xs text-muted-foreground mt-1">Mỗi payload được ký <code className="text-[10px]">HMAC-SHA256(body, topup_secret)</code>, gắn vào <code className="text-[10px]">X-PayGate-Signature</code>.</p>
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-muted/50 flex justify-between"><span className="text-muted-foreground">Merchant ID</span><code className="font-mono">{merchantId}</code></div>
                  <div className="p-3 rounded-lg bg-muted/50 flex justify-between"><span className="text-muted-foreground">Base URL</span><code className="font-mono text-[10px]">{BASE_URL}</code></div>
                  <div className="p-3 rounded-lg bg-muted/50 flex justify-between sm:col-span-2"><span className="text-muted-foreground">SePay Webhook URL</span><code className="font-mono text-[10px] truncate ml-2 max-w-[60%]">{webhookIngest}</code></div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* --- ENDPOINTS --- */}
          <Section id="endpoints" icon={Server} title="Endpoints" kicker="04 · REST">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Base URL</CardTitle>
                <CardDescription><code>{BASE_URL}</code></CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Endpoint method="POST" path={`/sepay-webhook?merchant_id=${merchantId}`}
                  desc="Ingest từ SePay. Bạn KHÔNG gọi endpoint này — chỉ cấu hình URL này bên SePay." auth="Apikey" />
                <Endpoint method="POST" path="/send-topup-callback"
                  desc="Trigger gửi callback test tới Callback URL của bạn. Dùng để verify tích hợp." auth="JWT" />
                <Endpoint method="POST" path="<YOUR_CALLBACK_URL>"
                  desc="Endpoint TRÊN hệ thống của bạn. Nhận event topup.success, verify HMAC, cộng tiền." auth="HMAC" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Headers chuẩn (outbound từ {brandName})</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Field name="Content-Type" type="string" required desc="application/json" />
                <Field name="X-PayGate-Event" type="string" required desc='Tên sự kiện, hiện tại: "topup.success" hoặc "topup.test".' />
                <Field name="X-PayGate-Signature" type="string" required desc="hex(HMAC_SHA256(raw_body, topup_secret))" />
              </CardContent>
            </Card>
          </Section>

          {/* --- CALLBACK --- */}
          <Section id="callback" icon={Webhook} title="Callback event payload" kicker="05 · Schema">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><FileJson className="h-4 w-4" /> <code>topup.success</code></CardTitle>
                <CardDescription>JSON {brandName} POST tới Callback URL của bạn khi user nạp tiền thành công.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock lang="json">{samplePayload}</CodeBlock>
                <div className="rounded-xl border divide-y divide-border/60">
                  <div className="hidden md:grid grid-cols-[160px_120px_1fr] gap-4 px-3 py-2 bg-muted/40 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <span>Field</span><span>Type</span><span>Description</span>
                  </div>
                  <div className="px-3">
                    <Field name="event" type="string" required desc='"topup.success" cho giao dịch thật, "topup.test" cho test.' />
                    <Field name="customer_ref" type="string|null" desc="ID user trên hệ thống bạn — phần sau mã PG- trong nội dung CK." />
                    <Field name="amount" type="number" required desc="Số tiền nhận được (VND, đơn vị đồng)." />
                    <Field name="transaction_id" type="uuid" required desc="ID giao dịch trên PayGate. DÙNG LÀM IDEMPOTENCY KEY." />
                    <Field name="payment_code" type="string" desc="Mã link thanh toán PG-XXXXX." />
                    <Field name="merchant_id" type="uuid" required desc="ID merchant nhận tiền." />
                    <Field name="bank_reference" type="string" desc="Mã giao dịch ngân hàng (FT...)." />
                    <Field name="timestamp" type="ISO8601" required desc="Thời điểm giao dịch UTC." />
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Retry policy</AlertTitle>
                  <AlertDescription className="text-xs">
                    Trả <Badge variant="outline">2xx</Badge> trong ≤10s. Mọi response khác bị mark <code>failed</code> và lưu vào tab Nhật ký.
                    PayGate <strong>không auto-retry</strong> — nên bạn phải xử lý idempotent theo <code>transaction_id</code>.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* --- SIGNATURE --- */}
          <Section id="signature" icon={ShieldCheck} title="Verify chữ ký HMAC-SHA256" kicker="06 · Security">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <p className="text-sm">
                  Công thức: <code className="bg-muted px-2 py-0.5 rounded">signature = hex(HMAC_SHA256(raw_body_string, topup_secret))</code>.
                  Luôn dùng <strong>raw body string</strong> trước khi parse JSON — KHÔNG re-stringify object.
                </p>
                <Tabs defaultValue="js">
                  <TabsList>
                    <TabsTrigger value="js">Node.js</TabsTrigger>
                    <TabsTrigger value="php">PHP</TabsTrigger>
                    <TabsTrigger value="py">Python</TabsTrigger>
                    <TabsTrigger value="go">Go</TabsTrigger>
                  </TabsList>
                  <TabsContent value="js"><CodeBlock lang="javascript">{`const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
if (req.headers["x-paygate-signature"] !== expected) return res.status(401).end();`}</CodeBlock></TabsContent>
                  <TabsContent value="php"><CodeBlock lang="php">{`$expected = hash_hmac('sha256', file_get_contents('php://input'), $secret);
if (!hash_equals($expected, $_SERVER['HTTP_X_PAYGATE_SIGNATURE'])) http_response_code(401);`}</CodeBlock></TabsContent>
                  <TabsContent value="py"><CodeBlock lang="python">{`import hmac, hashlib
expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
assert hmac.compare_digest(expected, request.headers["X-PayGate-Signature"])`}</CodeBlock></TabsContent>
                  <TabsContent value="go"><CodeBlock lang="go">{`mac := hmac.New(sha256.New, []byte(secret)); mac.Write(rawBody)
if !hmac.Equal([]byte(r.Header.Get("X-PayGate-Signature")), []byte(hex.EncodeToString(mac.Sum(nil)))) {
  http.Error(w, "invalid_signature", 401); return
}`}</CodeBlock></TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </Section>

          {/* --- EXAMPLES --- */}
          <Section id="examples" icon={Code2} title="Receiver hoàn chỉnh" kicker="07 · Code">
            <Tabs defaultValue="node">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="node">Node.js</TabsTrigger>
                <TabsTrigger value="php">PHP</TabsTrigger>
                <TabsTrigger value="py">Python</TabsTrigger>
                <TabsTrigger value="go">Go</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>
              <TabsContent value="node" className="mt-3"><CodeBlock lang="typescript">{codeNode}</CodeBlock></TabsContent>
              <TabsContent value="php" className="mt-3"><CodeBlock lang="php">{codePhp}</CodeBlock></TabsContent>
              <TabsContent value="py" className="mt-3"><CodeBlock lang="python">{codePython}</CodeBlock></TabsContent>
              <TabsContent value="go" className="mt-3"><CodeBlock lang="go">{codeGo}</CodeBlock></TabsContent>
              <TabsContent value="curl" className="mt-3"><CodeBlock lang="bash">{codeCurl}</CodeBlock></TabsContent>
            </Tabs>
          </Section>

          {/* --- TRY IT --- */}
          <Section id="tryit" icon={Play} title="Test thử API ngay" kicker="08 · Playground">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" /> Gửi callback test tới hệ thống của bạn
                </CardTitle>
                <CardDescription>
                  Sẽ POST một payload <code>topup.test</code> đã ký HMAC tới Callback URL bạn đã cấu hình.
                  Kết quả lưu vào tab Nhật ký.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">customer_ref</Label>
                    <Input value={testCustomer} onChange={(e) => setTestCustomer(e.target.value)} placeholder="USER_001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">amount (VND)</Label>
                    <Input type="number" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} placeholder="50000" />
                  </div>
                </div>

                <Button onClick={runTest} disabled={testing} className="w-full sm:w-auto">
                  {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Gửi test callback
                </Button>

                {testResult && (
                  <div className={`rounded-xl border p-4 space-y-2 ${testResult.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
                    <div className="flex items-center gap-2">
                      {testResult.ok
                        ? <Check className="h-4 w-4 text-emerald-500" />
                        : <AlertTriangle className="h-4 w-4 text-rose-500" />}
                      <span className="font-semibold text-sm">
                        {testResult.ok ? "Thành công" : "Thất bại"}
                      </span>
                      {testResult.status !== undefined && (
                        <Badge variant="outline" className="font-mono">HTTP {testResult.status}</Badge>
                      )}
                    </div>
                    {testResult.error && <p className="text-xs text-rose-500">{testResult.error}</p>}
                    {testResult.body && (
                      <pre className="text-[11px] bg-background/70 border rounded-lg p-3 overflow-x-auto max-h-48">{testResult.body}</pre>
                    )}
                  </div>
                )}

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Chưa cấu hình Callback URL? Vào tab <strong>Thuê Cổng</strong> để setup trước.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </Section>

          {/* --- ERRORS --- */}
          <Section id="errors" icon={AlertTriangle} title="Mã lỗi & HTTP codes" kicker="09 · Errors">
            <Card>
              <CardContent className="pt-6 space-y-2 text-xs">
                <div className="rounded-xl border divide-y">
                  {[
                    ["200", "OK — callback giao thành công", "emerald"],
                    ["400", "Bad request — payload sai format / thiếu trường", "orange"],
                    ["401", "Unauthorized — chữ ký HMAC sai hoặc thiếu", "rose"],
                    ["403", "Forbidden — không có quyền (vd: test merchant khác)", "rose"],
                    ["404", "Not found — merchant/callback chưa cấu hình", "orange"],
                    ["409", "Conflict — duplicate transaction_id (idempotency hit)", "blue"],
                    ["5xx", "Server error — endpoint bạn lỗi, sẽ ghi vào Nhật ký", "rose"],
                  ].map(([code, desc, color]) => (
                    <div key={code} className="flex items-center gap-3 p-3">
                      <Badge variant="outline" className={`font-mono w-14 justify-center text-${color}-500 border-${color}-500/40`}>{code}</Badge>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* --- CHECKLIST --- */}
          <Section id="checklist" icon={ListChecks} title="Production checklist" kicker="10 · Go-live">
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-2.5 text-sm">
                  {[
                    "Đã mua gói (Starter/Pro/Business) phù hợp lưu lượng.",
                    "Callback URL là HTTPS công khai (không self-signed, không LAN/VPN).",
                    "Secret HMAC ngẫu nhiên ≥ 32 ký tự, lưu trong env var.",
                    "Verify chữ ký bằng raw body string — không stringify lại object.",
                    "Cộng tiền idempotent: UNIQUE constraint trên transaction_id.",
                    "Đã chạy nút 'Test thử API' phía trên và nhận HTTP 200.",
                    "Đã nạp thật một số tiền nhỏ, đối soát ở tab Nhật ký.",
                    "Đã setup alert nếu callback failed > 1% trong 5 phút.",
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-emerald-500" />
                      </div>
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Section>

        </div>
      </div>
    </motion.div>
  );
};

export default ApiDocs;
