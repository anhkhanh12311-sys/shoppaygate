import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Book, Copy, Check, ShieldCheck, Webhook, Zap, Code2, KeyRound,
  AlertTriangle, ListChecks, Server, Send, Play, Loader2,
  Lock, FileJson, Terminal, ArrowRight, Hash, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMerchant } from "@/hooks/useMerchant";
import { useSystemSetting, ApiBrandingSetting } from "@/hooks/useSystemSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PROJECT_REF = "desgajgtdoxcgxlledww";
const BASE_URL = `https://${PROJECT_REF}.functions.supabase.co`;

/* ----------------------------- Copy helper ----------------------------- */
const CopyBtn = ({ text, label }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Đã copy");
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition shrink-0"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {label}
    </button>
  );
};

/* ----------------------------- Code Block ----------------------------- */
const CodeBlock = ({ children, lang }: { children: string; lang?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group rounded-lg overflow-hidden border border-white/5 bg-[hsl(222_47%_7%)] text-slate-100">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
        {lang && <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">{lang}</span>}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            toast.success("Đã copy");
            setTimeout(() => setCopied(false), 1500);
          }}
          className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11.5px] leading-relaxed font-mono">
        <code>{children}</code>
      </pre>
    </div>
  );
};

/* ----------------------------- UI atoms ----------------------------- */
const MethodBadge = ({ method }: { method: string }) => {
  const map: Record<string, string> = {
    POST: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    GET: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    DELETE: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    PUT: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 h-5 rounded font-mono text-[10px] font-semibold border ${map[method] ?? ""}`}>
      {method}
    </span>
  );
};

const Endpoint = ({ method, path, desc, auth }: { method: string; path: string; desc: string; auth?: string }) => (
  <div className="flex items-start gap-3 py-3 px-3 -mx-3 rounded-lg hover:bg-muted/40 transition">
    <MethodBadge method={method} />
    <div className="flex-1 min-w-0">
      <code className="text-[12px] font-mono break-all text-foreground">{path}</code>
      <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
    </div>
    {auth && (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded px-1.5 h-5 shrink-0">
        <Lock className="h-2.5 w-2.5" />{auth}
      </span>
    )}
  </div>
);

const Field = ({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) => (
  <div className="grid grid-cols-[1fr_auto] md:grid-cols-[180px_110px_1fr] gap-x-3 gap-y-1 py-2.5 border-b last:border-0 border-border/50">
    <div className="flex items-center gap-1.5 min-w-0">
      <code className="font-mono text-[12px] font-semibold text-foreground truncate">{name}</code>
      {required && <span className="text-[9px] font-semibold uppercase text-rose-500 tracking-wide">req</span>}
    </div>
    <code className="font-mono text-[11px] text-muted-foreground md:order-none order-3 col-span-2 md:col-span-1">{type}</code>
    <span className="text-[11.5px] text-muted-foreground col-span-2 md:col-span-1 leading-relaxed">{desc}</span>
  </div>
);

const SectionHeader = ({ id, num, title, desc }: { id: string; num: string; title: string; desc?: string }) => (
  <div className="flex items-start gap-3 pb-3 mb-4 border-b">
    <div className="font-mono text-[11px] text-muted-foreground tabular-nums mt-1">{num}</div>
    <div className="flex-1 min-w-0">
      <h2 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-2 group">
        {title}
        <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition">
          <Hash className="h-4 w-4" />
        </a>
      </h2>
      {desc && <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>}
    </div>
  </div>
);

/* ----------------------------- Nav ----------------------------- */
const NAV = [
  { id: "intro",      num: "01", label: "Giới thiệu",       icon: Book },
  { id: "credentials",num: "02", label: "Credentials",      icon: KeyRound },
  { id: "quickstart", num: "03", label: "Quickstart",       icon: Zap },
  { id: "auth",       num: "04", label: "Xác thực",         icon: Lock },
  { id: "endpoints",  num: "05", label: "Endpoints",        icon: Server },
  { id: "callback",   num: "06", label: "Callback payload", icon: Webhook },
  { id: "signature",  num: "07", label: "HMAC signature",   icon: ShieldCheck },
  { id: "examples",   num: "08", label: "Code mẫu",         icon: Code2 },
  { id: "tryit",      num: "09", label: "Test API",         icon: Play },
  { id: "errors",     num: "10", label: "Mã lỗi",           icon: AlertTriangle },
  { id: "checklist",  num: "11", label: "Go-live",          icon: ListChecks },
];

/* ============================ MAIN ============================ */
const ApiDocs = () => {
  const { merchant } = useMerchant();
  const { value: brand } = useSystemSetting<ApiBrandingSetting>("api_branding");
  const apiVersion = brand?.api_version ?? "v2";
  const brandName = brand?.brand_name ?? "PayGate";
  const brandKey = brandName.toUpperCase().replace(/[^A-Z]/g, "") || "PAYGATE";

  const merchantId = merchant?.id ?? "<MERCHANT_ID>";
  const webhookIngest = `${BASE_URL}/sepay-webhook?merchant_id=${merchantId}`;
  const callbackTestUrl = `${BASE_URL}/send-topup-callback`;

  const [active, setActive] = useState("intro");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.5, 1] }
    );
    NAV.forEach(n => { const el = document.getElementById(n.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  /* Try It */
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

  const codeNode = useMemo(() => `import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json({ verify: (req, _, buf) => { (req as any).rawBody = buf; } }));

const SECRET = process.env.${brandKey}_SECRET!;

app.post("/${brandName.toLowerCase()}/topup", (req, res) => {
  const raw = (req as any).rawBody.toString("utf8");
  const expected = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  if (req.headers["x-paygate-signature"] !== expected) {
    return res.status(401).json({ ok: false, error: "invalid_signature" });
  }

  const { event, customer_ref, amount, transaction_id } = req.body;
  if (event !== "topup.success") return res.status(200).json({ ok: true });

  // Idempotent credit by transaction_id
  // INSERT ... ON CONFLICT (transaction_id) DO NOTHING

  return res.status(200).json({ ok: true });
});`, [brandName, brandKey]);

  const codePhp = useMemo(() => `<?php
$secret = getenv('${brandKey}_SECRET');
$raw = file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_PAYGATE_SIGNATURE'] ?? '';

if (!hash_equals(hash_hmac('sha256', $raw, $secret), $sig)) {
  http_response_code(401); exit;
}

$p = json_decode($raw, true);
if (($p['event'] ?? '') !== 'topup.success') { echo '{"ok":true}'; exit; }

// TODO: idempotent credit by $p['transaction_id']
echo '{"ok":true}';`, [brandKey]);

  const codePython = useMemo(() => `from fastapi import FastAPI, Request, HTTPException
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
        return {"ok": True}
    # idempotent credit by p["transaction_id"]
    return {"ok": True}`, [brandName, brandKey]);

  const codeGo = useMemo(() => `package main

import (
  "crypto/hmac"; "crypto/sha256"; "encoding/hex"
  "io"; "net/http"; "os"
)

var secret = []byte(os.Getenv("${brandKey}_SECRET"))

func handler(w http.ResponseWriter, r *http.Request) {
  body, _ := io.ReadAll(r.Body)
  mac := hmac.New(sha256.New, secret); mac.Write(body)
  if r.Header.Get("X-PayGate-Signature") != hex.EncodeToString(mac.Sum(nil)) {
    http.Error(w, "invalid_signature", 401); return
  }
  w.Write([]byte(\`{"ok":true}\`))
}`, [brandKey]);

  const codeCurl = `curl -X POST ${callbackTestUrl} \\
  -H "Authorization: Bearer <YOUR_JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{"test":true,"customer_ref":"USER_001","amount":50000}'`;

  /* ============================ RENDER ============================ */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* COMPACT HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 pb-5 border-b">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">API Reference</span>
            <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">{apiVersion}</Badge>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Operational
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{brandName} Developer Docs</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">
            Cổng nạp tiền tự động qua QR · Webhook ký HMAC-SHA256 · Idempotent · Production-ready trong &lt;10 phút.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" })}>
            Quickstart <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          <Button size="sm" onClick={() => document.getElementById("tryit")?.scrollIntoView({ behavior: "smooth" })}>
            <Play className="h-3.5 w-3.5 mr-1" /> Test
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
        {/* SIDEBAR */}
        <aside className="hidden lg:block">
          <nav className="sticky top-4 space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2.5 mb-2">On this page</p>
            {NAV.map(n => (
              <a key={n.id} href={`#${n.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(n.id)?.scrollIntoView({ behavior: "smooth" }); }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] transition-all border-l-2
                  ${active === n.id
                    ? "border-primary text-primary bg-primary/5 font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                <span className="font-mono text-[10px] tabular-nums opacity-70 w-5">{n.num}</span>
                {n.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* CONTENT */}
        <div className="space-y-14 min-w-0">

          {/* INTRO */}
          <section id="intro" className="scroll-mt-6">
            <SectionHeader id="intro" num="01" title="Giới thiệu" desc={`${brandName} cho phép website nhận tiền nạp từ user qua QR ngân hàng và tự động cộng số dư qua webhook.`} />
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Zap, t: "Realtime", d: "Cộng tiền trong 1–3 giây" },
                { icon: ShieldCheck, t: "HMAC-SHA256", d: "Mọi callback đều được ký số" },
                { icon: Hash, t: "Idempotent", d: "Chống double-credit qua transaction_id" },
              ].map((b, i) => (
                <div key={i} className="p-4 rounded-lg border bg-muted/20">
                  <b.icon className="h-4 w-4 text-primary mb-2" />
                  <p className="font-semibold text-[13px]">{b.t}</p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">{b.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CREDENTIALS */}
          <section id="credentials" className="scroll-mt-6">
            <SectionHeader id="credentials" num="02" title="Credentials" desc="Thông tin định danh của merchant. Giữ bí mật secret HMAC." />
            <Card className="rounded-lg overflow-hidden">
              <CardContent className="p-0 divide-y">
                {[
                  { k: "Merchant ID", v: merchantId },
                  { k: "Base URL", v: BASE_URL },
                  { k: "SePay Webhook In", v: webhookIngest },
                  { k: "Callback Test URL", v: callbackTestUrl },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{row.k}</p>
                      <code className="text-[11.5px] font-mono break-all">{row.v}</code>
                    </div>
                    <CopyBtn text={row.v} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* QUICKSTART */}
          <section id="quickstart" className="scroll-mt-6">
            <SectionHeader id="quickstart" num="03" title="Quickstart" desc="4 bước để go-live, mất khoảng 10 phút." />
            <ol className="space-y-3">
              {[
                ["Mua gói & cấu hình", "Vào tab Thuê Cổng → chọn gói → nhập Callback URL HTTPS + sinh Secret ≥32 ký tự."],
                ["Hiển thị QR cho user", `Khi user nạp, dùng nội dung CK dạng PG-XXXXXX [USER_REF]. Phần USER_REF chính là customer_ref trả về callback.`],
                ["Chờ webhook", `${brandName} nhận tín hiệu SePay, đối soát, ký HMAC và POST tới Callback URL của bạn.`],
                ["Verify & cộng tiền", "Verify chữ ký bằng raw body, cộng tiền idempotent theo transaction_id, trả HTTP 200."],
              ].map(([t, d], i) => (
                <li key={i} className="flex gap-3 p-3 rounded-lg border bg-muted/10">
                  <div className="h-6 w-6 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold tabular-nums">{i + 1}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px]">{t}</p>
                    <p className="text-muted-foreground text-[11.5px] mt-0.5">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* AUTH */}
          <section id="auth" className="scroll-mt-6">
            <SectionHeader id="auth" num="04" title="Xác thực" desc="Hệ thống dùng 2 cơ chế tách biệt cho inbound và outbound." />
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border bg-muted/10">
                <p className="font-semibold flex items-center gap-2 text-[13px]">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Inbound · SePay → {brandName}
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-1.5">
                  Header <code className="text-[10.5px] bg-muted px-1 py-0.5 rounded">Apikey &lt;webhook_api_key&gt;</code>. Sinh trong Cài đặt → API.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/10">
                <p className="font-semibold flex items-center gap-2 text-[13px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Outbound · {brandName} → bạn
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-1.5">
                  Payload ký <code className="text-[10.5px] bg-muted px-1 py-0.5 rounded">HMAC-SHA256(body, topup_secret)</code>, header <code className="text-[10.5px] bg-muted px-1 py-0.5 rounded">X-PayGate-Signature</code>.
                </p>
              </div>
            </div>
          </section>

          {/* ENDPOINTS */}
          <section id="endpoints" className="scroll-mt-6">
            <SectionHeader id="endpoints" num="05" title="Endpoints" desc="REST · JSON · 3 endpoint chính." />
            <Card className="rounded-lg">
              <CardContent className="p-3 divide-y divide-border/50">
                <Endpoint method="POST" path={`/sepay-webhook?merchant_id=${merchantId}`}
                  desc="Ingest từ SePay. Bạn không gọi — chỉ cấu hình URL này bên SePay." auth="Apikey" />
                <Endpoint method="POST" path="/send-topup-callback"
                  desc="Trigger callback test tới Callback URL của bạn để verify tích hợp." auth="JWT" />
                <Endpoint method="POST" path="<YOUR_CALLBACK_URL>"
                  desc="Endpoint TRÊN hệ thống bạn. Nhận topup.success, verify HMAC, cộng tiền." auth="HMAC" />
              </CardContent>
            </Card>

            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Outbound headers</p>
              <Card className="rounded-lg">
                <CardContent className="px-4 py-1">
                  <Field name="Content-Type" type="string" required desc="application/json" />
                  <Field name="X-PayGate-Event" type="string" required desc='"topup.success" | "topup.test"' />
                  <Field name="X-PayGate-Signature" type="string" required desc="hex(HMAC_SHA256(raw_body, topup_secret))" />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CALLBACK */}
          <section id="callback" className="scroll-mt-6">
            <SectionHeader id="callback" num="06" title="Callback payload" desc="JSON gửi tới Callback URL khi user nạp tiền thành công." />
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-[12px]">
                  <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
                  <code className="font-mono">topup.success</code>
                </div>
                <CodeBlock lang="json">{samplePayload}</CodeBlock>
              </div>
              <Card className="rounded-lg">
                <CardContent className="px-4 py-1">
                  <Field name="event" type="string" required desc='"topup.success" hoặc "topup.test"' />
                  <Field name="customer_ref" type="string|null" desc="ID user trên hệ thống bạn." />
                  <Field name="amount" type="number" required desc="VND, đơn vị đồng." />
                  <Field name="transaction_id" type="uuid" required desc="DÙNG LÀM IDEMPOTENCY KEY." />
                  <Field name="payment_code" type="string" desc="Mã link thanh toán PG-XXXXX." />
                  <Field name="merchant_id" type="uuid" required desc="ID merchant nhận tiền." />
                  <Field name="bank_reference" type="string" desc="Mã giao dịch ngân hàng." />
                  <Field name="timestamp" type="ISO8601" required desc="Thời điểm giao dịch UTC." />
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[12px]">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">Retry policy</p>
                <p className="text-muted-foreground mt-0.5">
                  Trả <code className="bg-muted px-1 rounded">2xx</code> trong ≤10s. Response khác bị mark <code className="bg-muted px-1 rounded">failed</code>, lưu vào Nhật ký. <strong>Không auto-retry</strong> — xử lý idempotent theo <code className="bg-muted px-1 rounded">transaction_id</code>.
                </p>
              </div>
            </div>
          </section>

          {/* SIGNATURE */}
          <section id="signature" className="scroll-mt-6">
            <SectionHeader id="signature" num="07" title="HMAC signature" desc="Verify chữ ký bằng raw body string, không re-stringify JSON." />
            <div className="p-3 rounded-lg bg-muted/40 border text-[12px] mb-3">
              <code>signature = hex(HMAC_SHA256(raw_body, topup_secret))</code>
            </div>
            <Tabs defaultValue="js">
              <TabsList className="h-8">
                <TabsTrigger value="js" className="text-[11.5px]">Node</TabsTrigger>
                <TabsTrigger value="php" className="text-[11.5px]">PHP</TabsTrigger>
                <TabsTrigger value="py" className="text-[11.5px]">Python</TabsTrigger>
                <TabsTrigger value="go" className="text-[11.5px]">Go</TabsTrigger>
              </TabsList>
              <TabsContent value="js" className="mt-2"><CodeBlock lang="javascript">{`const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
if (req.headers["x-paygate-signature"] !== expected) return res.status(401).end();`}</CodeBlock></TabsContent>
              <TabsContent value="php" className="mt-2"><CodeBlock lang="php">{`$expected = hash_hmac('sha256', file_get_contents('php://input'), $secret);
if (!hash_equals($expected, $_SERVER['HTTP_X_PAYGATE_SIGNATURE'])) http_response_code(401);`}</CodeBlock></TabsContent>
              <TabsContent value="py" className="mt-2"><CodeBlock lang="python">{`import hmac, hashlib
expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
assert hmac.compare_digest(expected, request.headers["X-PayGate-Signature"])`}</CodeBlock></TabsContent>
              <TabsContent value="go" className="mt-2"><CodeBlock lang="go">{`mac := hmac.New(sha256.New, []byte(secret)); mac.Write(rawBody)
if !hmac.Equal([]byte(r.Header.Get("X-PayGate-Signature")), []byte(hex.EncodeToString(mac.Sum(nil)))) {
  http.Error(w, "invalid_signature", 401); return
}`}</CodeBlock></TabsContent>
            </Tabs>
          </section>

          {/* EXAMPLES */}
          <section id="examples" className="scroll-mt-6">
            <SectionHeader id="examples" num="08" title="Code mẫu" desc="Receiver hoàn chỉnh, copy-paste là chạy." />
            <Tabs defaultValue="node">
              <TabsList className="grid grid-cols-5 w-full h-8">
                <TabsTrigger value="node" className="text-[11.5px]">Node</TabsTrigger>
                <TabsTrigger value="php" className="text-[11.5px]">PHP</TabsTrigger>
                <TabsTrigger value="py" className="text-[11.5px]">Python</TabsTrigger>
                <TabsTrigger value="go" className="text-[11.5px]">Go</TabsTrigger>
                <TabsTrigger value="curl" className="text-[11.5px]">cURL</TabsTrigger>
              </TabsList>
              <TabsContent value="node" className="mt-2"><CodeBlock lang="typescript">{codeNode}</CodeBlock></TabsContent>
              <TabsContent value="php" className="mt-2"><CodeBlock lang="php">{codePhp}</CodeBlock></TabsContent>
              <TabsContent value="py" className="mt-2"><CodeBlock lang="python">{codePython}</CodeBlock></TabsContent>
              <TabsContent value="go" className="mt-2"><CodeBlock lang="go">{codeGo}</CodeBlock></TabsContent>
              <TabsContent value="curl" className="mt-2"><CodeBlock lang="bash">{codeCurl}</CodeBlock></TabsContent>
            </Tabs>
          </section>

          {/* TRY IT */}
          <section id="tryit" className="scroll-mt-6">
            <SectionHeader id="tryit" num="09" title="Test API" desc="Gửi callback ký HMAC tới Callback URL bạn đã cấu hình." />
            <Card className="rounded-lg border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
              <CardContent className="p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">customer_ref</Label>
                    <Input value={testCustomer} onChange={(e) => setTestCustomer(e.target.value)} placeholder="USER_001" className="h-9 font-mono text-[12.5px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">amount (VND)</Label>
                    <Input type="number" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} placeholder="50000" className="h-9 font-mono text-[12.5px]" />
                  </div>
                </div>

                <Button onClick={runTest} disabled={testing} size="sm" className="w-full sm:w-auto">
                  {testing ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
                  Gửi test callback
                </Button>

                {testResult && (
                  <div className={`rounded-lg border p-3 space-y-2 ${testResult.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
                    <div className="flex items-center gap-2">
                      {testResult.ok
                        ? <Check className="h-4 w-4 text-emerald-500" />
                        : <AlertTriangle className="h-4 w-4 text-rose-500" />}
                      <span className="font-semibold text-[13px]">
                        {testResult.ok ? "Thành công" : "Thất bại"}
                      </span>
                      {testResult.status !== undefined && (
                        <Badge variant="outline" className="font-mono text-[10px] h-5">HTTP {testResult.status}</Badge>
                      )}
                    </div>
                    {testResult.error && <p className="text-[11.5px] text-rose-500 font-mono">{testResult.error}</p>}
                    {testResult.body && (
                      <pre className="text-[10.5px] bg-background/70 border rounded-md p-2.5 overflow-x-auto max-h-48 font-mono">{testResult.body}</pre>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  Chưa cấu hình Callback URL? Vào tab <strong>Thuê Cổng</strong>.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ERRORS */}
          <section id="errors" className="scroll-mt-6">
            <SectionHeader id="errors" num="10" title="Mã lỗi" desc="HTTP codes trả về từ Callback URL được ghi nhận và lưu vào Nhật ký." />
            <Card className="rounded-lg">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {[
                    ["200", "OK — callback giao thành công", "emerald"],
                    ["400", "Bad request — payload sai format / thiếu trường", "amber"],
                    ["401", "Unauthorized — chữ ký HMAC sai hoặc thiếu", "rose"],
                    ["403", "Forbidden — không có quyền", "rose"],
                    ["404", "Not found — merchant/callback chưa cấu hình", "amber"],
                    ["409", "Conflict — duplicate transaction_id (idempotency hit)", "blue"],
                    ["5xx", "Server error — endpoint bạn lỗi, ghi vào Nhật ký", "rose"],
                  ].map(([code, desc, color]) => (
                    <div key={code} className="flex items-center gap-3 px-4 py-2.5">
                      <code className={`font-mono w-12 text-center font-bold text-[12px] text-${color}-500`}>{code}</code>
                      <span className="text-[12px] text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CHECKLIST */}
          <section id="checklist" className="scroll-mt-6">
            <SectionHeader id="checklist" num="11" title="Go-live checklist" desc="Tick hết trước khi đẩy production." />
            <Card className="rounded-lg">
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {[
                    "Đã mua gói phù hợp lưu lượng (Starter / Pro / Business).",
                    "Callback URL là HTTPS công khai (không self-signed, không LAN/VPN).",
                    "Secret HMAC ngẫu nhiên ≥ 32 ký tự, lưu trong env var.",
                    "Verify chữ ký bằng raw body string — không stringify lại object.",
                    "Cộng tiền idempotent: UNIQUE constraint trên transaction_id.",
                    "Đã chạy nút Test API và nhận HTTP 200.",
                    "Đã nạp thật một số tiền nhỏ, đối soát ở tab Nhật ký.",
                    "Đã setup alert nếu callback failed > 1% trong 5 phút.",
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12.5px]">
                      <div className="h-4 w-4 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5 text-emerald-500" />
                      </div>
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <div className="text-center py-6 text-[11px] text-muted-foreground border-t">
            <Terminal className="h-3.5 w-3.5 inline mr-1 opacity-60" />
            {brandName} API {apiVersion} · End of reference
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ApiDocs;
