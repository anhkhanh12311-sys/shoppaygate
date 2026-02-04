import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Link2, QrCode, Loader2, Copy, ExternalLink, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { usePaymentLinks } from "@/hooks/usePaymentLinks";
import { useMerchant } from "@/hooks/useMerchant";
import PaymentLinksList from "./PaymentLinksList";

const schema = z.object({
  amount: z.string().min(1, "Vui lòng nhập số tiền").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Số tiền phải lớn hơn 0"
  ),
  description: z.string().trim().max(200, "Mô tả tối đa 200 ký tự").optional(),
});

type FormData = z.infer<typeof schema>;

interface CreatePaymentLinkProps {
  isStatic?: boolean;
}

const CreatePaymentLink = ({ isStatic = false }: CreatePaymentLinkProps) => {
  const { merchant } = useMerchant();
  const { createPaymentLink, paymentLinks, loading: linksLoading } = usePaymentLinks();
  const [isLoading, setIsLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!merchant?.bank_account_number) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng cấu hình ngân hàng trước khi tạo link thanh toán",
      });
      return;
    }

    setIsLoading(true);
    const { data: link, error } = await createPaymentLink(
      Number(data.amount),
      data.description || "",
      isStatic
    );
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tạo link thanh toán. Vui lòng thử lại.",
      });
    } else if (link) {
      const paymentUrl = `${window.location.origin}/pay/${link.code}`;
      setCreatedLink(paymentUrl);
      form.reset();
      toast({
        title: "Thành công",
        description: isStatic ? "Đã tạo mã QR tĩnh!" : "Đã tạo link thanh toán!",
      });
    }
  };

  const copyToClipboard = async () => {
    if (createdLink) {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Đã sao chép",
        description: "Link đã được sao chép vào clipboard",
      });
    }
  };

  const filteredLinks = paymentLinks.filter((link) => link.is_static === isStatic);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {isStatic ? "Tạo QR Code tĩnh" : "Tạo link thanh toán"}
        </h1>
        <p className="text-muted-foreground">
          {isStatic
            ? "Tạo mã QR cố định cho cửa hàng của bạn"
            : "Tạo link thanh toán và chia sẻ cho khách hàng"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isStatic ? (
                <>
                  <QrCode className="h-5 w-5" />
                  Thông tin QR tĩnh
                </>
              ) : (
                <>
                  <Link2 className="h-5 w-5" />
                  Thông tin thanh toán
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isStatic
                ? "Khách hàng có thể quét mã này để thanh toán"
                : "Nhập thông tin để tạo link thanh toán mới"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tiền (VNĐ)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100000"
                          min="1000"
                          step="1000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả (tùy chọn)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="VD: Thanh toán đơn hàng #123"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Mô tả sẽ hiển thị cho khách hàng trên trang thanh toán
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground"
                  disabled={isLoading || !merchant?.bank_account_number}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      {isStatic ? <QrCode className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
                      {isStatic ? "Tạo QR Code" : "Tạo link thanh toán"}
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {!merchant?.bank_account_number && (
              <p className="text-destructive text-sm mt-4">
                ⚠️ Vui lòng cấu hình ngân hàng trước khi tạo link
              </p>
            )}
          </CardContent>
        </Card>

        {createdLink && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-success/50 bg-success/5">
              <CardHeader>
                <CardTitle className="text-success flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  {isStatic ? "QR Code đã tạo!" : "Link đã tạo!"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-background rounded-lg border">
                  <p className="text-sm break-all font-mono">{createdLink}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Đã sao chép
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Sao chép
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(createdLink, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Mở link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* List of created links */}
      <PaymentLinksList links={filteredLinks} loading={linksLoading} isStatic={isStatic} />
    </div>
  );
};

export default CreatePaymentLink;
