import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2, QrCode, Loader2, Copy, ExternalLink, Check, Clock,
  Zap, FileText, AlertCircle, Sparkles, Calendar, CheckCircle2, Radio,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePaymentLinks } from "@/hooks/usePaymentLinks";
import { useMerchant } from "@/hooks/useMerchant";
import { useMerchantBanks } from "@/hooks/useMerchantBanks";
import { supabase } from "@/integrations/supabase/client";
import PaymentLinksList from "./PaymentLinksList";
import CreatedLinkCard from "./CreatedLinkCard";

const schema = z.object({
  amount: z.string().min(1, "Vui lòng nhập số tiền").refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 1000,
    "Số tiền phải từ 1,000đ trở lên"
  ),
  description: z.string().trim().max(200, "Mô tả tối đa 200 ký tự").optional(),
  expiryMinutes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];
const EXPIRY_OPTIONS = [
  { value: "0", label: "Không hết hạn" },
  { value: "15", label: "15 phút" },
  { value: "30", label: "30 phút" },
  { value: "60", label: "1 giờ" },
  { value: "1440", label: "24 giờ" },
  { value: "4320", label: "3 ngày" },
  { value: "10080", label: "7 ngày" },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN").format(amount);

interface CreatePaymentLinkProps {
  isStatic?: boolean;
}

const CreatePaymentLink = ({ isStatic = false }: CreatePaymentLinkProps) => {
  const { merchant } = useMerchant();
  const { defaultBank } = useMerchantBanks();
  const { createPaymentLink } = usePaymentLinks();
  const [isLoading, setIsLoading] = useState(false);
  const storageKey = `paygate.lastLink.${isStatic ? "qr" : "link"}.${merchant?.id || "anon"}`;
  const [createdLink, setCreatedLink] = useState<{ url: string; code: string; amount: number; id?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  const [paymentDetected, setPaymentDetected] = useState(false);
  const { toast } = useToast();

  // Restore last created link from localStorage on mount / merchant change
  useEffect(() => {
    if (!merchant) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.code && saved?.url && saved?.amount) {
          setCreatedLink(saved);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant?.id, isStatic]);

  // Persist whenever createdLink changes
  useEffect(() => {
    if (!merchant) return;
    if (createdLink) {
      localStorage.setItem(storageKey, JSON.stringify(createdLink));
    } else {
      localStorage.removeItem(storageKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdLink, merchant?.id, isStatic]);

  // Realtime: detect payment success on the currently-shown created link
  useEffect(() => {
    if (!merchant || !createdLink?.id || isStatic) return;
    setPaymentDetected(false);
    const ch = supabase
      .channel(`link-watch-${createdLink.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "transactions",
        filter: `payment_link_id=eq.${createdLink.id}`,
      }, () => {
        setPaymentDetected(true);
        toast({ title: "✅ Đã nhận thanh toán!", description: `Link ${createdLink.code} đã được thanh toán` });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [merchant, createdLink?.id, isStatic, toast, createdLink?.code]);


  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", description: "", expiryMinutes: "0" },
  });

  const hasBankConfig = !!defaultBank;
  const watchAmount = form.watch("amount");
  const parsedAmount = Number(watchAmount) || 0;

  const onSubmit = async (data: FormData) => {
    if (!hasBankConfig) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng cấu hình ngân hàng trước" });
      return;
    }

    setIsLoading(true);
    const expiryMinutes = Number(data.expiryMinutes) || 0;
    const expiresAt = expiryMinutes > 0 ? new Date(Date.now() + expiryMinutes * 60000) : undefined;

    const { data: link, error } = await createPaymentLink(
      Number(data.amount),
      data.description || "",
      isStatic,
      expiresAt
    );
    setIsLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể tạo. Vui lòng thử lại." });
    } else if (link) {
      const paymentUrl = `${window.location.origin}/pay/${link.code}`;
      setCreatedLink({ url: paymentUrl, code: link.code, amount: link.amount, id: (link as any).id });
      form.reset();
      setActiveTab("result");
      toast({ title: "✨ Thành công!", description: isStatic ? "Đã tạo mã QR tĩnh!" : "Đã tạo link thanh toán!" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            {isStatic ? <QrCode className="h-5 w-5 text-primary-foreground" /> : <Link2 className="h-5 w-5 text-primary-foreground" />}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {isStatic ? "QR Code tĩnh" : "Link thanh toán"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isStatic ? "Tạo mã QR cố định cho cửa hàng" : "Tạo và quản lý link thanh toán chuyên nghiệp"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bank warning */}
      {!hasBankConfig && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Chưa cấu hình ngân hàng</p>
                <p className="text-xs text-muted-foreground">Vui lòng thêm thông tin ngân hàng trong mục Cài đặt trước khi tạo link</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="gap-2">
            <Zap className="h-4 w-4" /> Tạo mới
          </TabsTrigger>
          <TabsTrigger value="result" disabled={!createdLink} className="gap-2">
            <Sparkles className="h-4 w-4" /> Kết quả
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <FileText className="h-4 w-4" /> Danh sách
          </TabsTrigger>
        </TabsList>

        {/* TAB: Create */}
        <TabsContent value="create" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Form - 3 cols */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin thanh toán</CardTitle>
                  <CardDescription>Điền thông tin để tạo {isStatic ? "mã QR" : "link"} mới</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      {/* Quick amounts */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Số tiền nhanh</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {QUICK_AMOUNTS.map((amt) => (
                            <Button
                              key={amt}
                              type="button"
                              variant={parsedAmount === amt ? "default" : "outline"}
                              size="sm"
                              className={parsedAmount === amt ? "gradient-primary text-primary-foreground" : ""}
                              onClick={() => form.setValue("amount", String(amt))}
                            >
                              {formatCurrency(amt)}đ
                            </Button>
                          ))}
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Số tiền tùy chỉnh (VNĐ)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input type="number" placeholder="Nhập số tiền" min="1000" step="1000" {...field} className="pr-14 text-lg font-semibold h-12" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">VNĐ</span>
                              </div>
                            </FormControl>
                            {parsedAmount > 0 && (
                              <p className="text-xs text-primary font-medium">
                                = {formatCurrency(parsedAmount)}đ
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mô tả</FormLabel>
                            <FormControl>
                              <Textarea placeholder="VD: Thanh toán đơn hàng #123" className="resize-none" rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {!isStatic && (
                        <FormField
                          control={form.control}
                          name="expiryMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Thời gian hết hạn
                              </FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn thời hạn" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {EXPIRY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Link sẽ tự động hết hạn sau thời gian này</FormDescription>
                            </FormItem>
                          )}
                        />
                      )}

                      <Button
                        type="submit"
                        className="w-full gradient-primary text-primary-foreground h-12 text-base"
                        disabled={isLoading || !hasBankConfig}
                      >
                        {isLoading ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tạo...</>
                        ) : (
                          <>
                            {isStatic ? <QrCode className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />}
                            {isStatic ? "Tạo QR Code" : "Tạo link thanh toán"}
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Preview - 2 cols */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
              <Card className="gradient-card border-primary/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Xem trước
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-background p-4 space-y-3 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Số tiền</span>
                      <span className="text-xl font-bold text-primary">
                        {parsedAmount > 0 ? `${formatCurrency(parsedAmount)}đ` : "---"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Loại</span>
                      <Badge variant="outline">{isStatic ? "QR tĩnh" : "Link thanh toán"}</Badge>
                    </div>
                    {form.watch("description") && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Mô tả</p>
                        <p className="text-sm">{form.watch("description")}</p>
                      </div>
                    )}
                    {!isStatic && form.watch("expiryMinutes") !== "0" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                        <Clock className="h-3 w-3" />
                        Hết hạn sau {EXPIRY_OPTIONS.find(o => o.value === form.watch("expiryMinutes"))?.label}
                      </div>
                    )}
                  </div>

                  {/* Bank info mini */}
                  {hasBankConfig && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Ngân hàng nhận</p>
                      <p className="text-sm font-semibold">{defaultBank?.bank_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {defaultBank?.bank_account_number}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-primary/5 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Trạng thái</p>
                      <p className="text-sm font-semibold text-primary">Sẵn sàng</p>
                    </div>
                    <div className="rounded-lg bg-success/5 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Realtime</p>
                      <p className="text-sm font-semibold text-success">Bật</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* TAB: Result */}
        <TabsContent value="result" className="mt-6">
          {createdLink ? (
            <div className="max-w-lg mx-auto">
              <CreatedLinkCard
                url={createdLink.url}
                code={createdLink.code}
                amount={createdLink.amount}
                isStatic={isStatic}
                bankName={defaultBank?.bank_name || ""}
                bankAccountNumber={defaultBank?.bank_account_number || ""}
                bankAccountName={defaultBank?.bank_account_name || ""}
              />
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setCreatedLink(null); setActiveTab("create"); }}>
                  <Zap className="mr-2 h-4 w-4" /> Tạo link mới
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setActiveTab("list")}>
                  <FileText className="mr-2 h-4 w-4" /> Xem danh sách
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>Chưa có link nào được tạo</p>
            </div>
          )}
        </TabsContent>

        {/* TAB: List */}
        <TabsContent value="list" className="mt-6">
          <PaymentLinksList isStatic={isStatic} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreatePaymentLink;
