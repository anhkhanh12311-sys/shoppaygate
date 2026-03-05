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
import { useMerchantBanks } from "@/hooks/useMerchantBanks";
import PaymentLinksList from "./PaymentLinksList";
import CreatedLinkCard from "./CreatedLinkCard";

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
  const { defaultBank } = useMerchantBanks();
  const { createPaymentLink, paymentLinks, loading: linksLoading } = usePaymentLinks();
  const [isLoading, setIsLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ url: string; code: string; amount: number } | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", description: "" },
  });

  const hasBankConfig = !!(defaultBank || merchant?.bank_account_number);

  const onSubmit = async (data: FormData) => {
    if (!hasBankConfig) {
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
      setCreatedLink({ url: paymentUrl, code: link.code, amount: link.amount });
      form.reset();
      toast({
        title: "Thành công",
        description: isStatic ? "Đã tạo mã QR tĩnh!" : "Đã tạo link thanh toán!",
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
                <><QrCode className="h-5 w-5" /> Thông tin QR tĩnh</>
              ) : (
                <><Link2 className="h-5 w-5" /> Thông tin thanh toán</>
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
                        <Input type="number" placeholder="100000" min="1000" step="1000" {...field} />
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
                        <Textarea placeholder="VD: Thanh toán đơn hàng #123" className="resize-none" rows={3} {...field} />
                      </FormControl>
                      <FormDescription>Mô tả sẽ hiển thị cho khách hàng trên trang thanh toán</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground"
                  disabled={isLoading || !hasBankConfig}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo...</>
                  ) : (
                    <>
                      {isStatic ? <QrCode className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
                      {isStatic ? "Tạo QR Code" : "Tạo link thanh toán"}
                    </>
                  )}
                </Button>
              </form>
            </Form>
            {!hasBankConfig && (
              <p className="text-destructive text-sm mt-4">
                ⚠️ Vui lòng cấu hình ngân hàng trước khi tạo link
              </p>
            )}
          </CardContent>
        </Card>

        {createdLink && (
          <CreatedLinkCard
            url={createdLink.url}
            code={createdLink.code}
            amount={createdLink.amount}
            isStatic={isStatic}
            bankName={defaultBank?.bank_name || merchant?.bank_name || ""}
            bankAccountNumber={defaultBank?.bank_account_number || merchant?.bank_account_number || ""}
            bankAccountName={defaultBank?.bank_account_name || merchant?.bank_account_name || ""}
          />
        )}
      </div>

      <PaymentLinksList isStatic={isStatic} />
    </div>
  );
};

export default CreatePaymentLink;
