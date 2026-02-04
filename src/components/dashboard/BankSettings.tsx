import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Building2, CreditCard, User, Key, Save, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMerchant } from "@/hooks/useMerchant";

const banks = [
  { code: "VCB", name: "Vietcombank" },
  { code: "TCB", name: "Techcombank" },
  { code: "MB", name: "MB Bank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "BIDV", name: "BIDV" },
  { code: "VTB", name: "VietinBank" },
  { code: "AGRI", name: "Agribank" },
  { code: "SHB", name: "SHB" },
  { code: "MSB", name: "MSB" },
  { code: "OCB", name: "OCB" },
  { code: "EIB", name: "Eximbank" },
];

const schema = z.object({
  business_name: z.string().trim().min(2, "Tên cửa hàng phải có ít nhất 2 ký tự").max(100),
  phone: z.string().trim().optional(),
  bank_name: z.string().min(1, "Vui lòng chọn ngân hàng"),
  bank_account_number: z.string().trim().min(6, "Số tài khoản không hợp lệ").max(20),
  bank_account_name: z.string().trim().min(2, "Tên chủ tài khoản không hợp lệ").max(100),
  sepay_api_key: z.string().trim().optional(),
});

type FormData = z.infer<typeof schema>;

const BankSettings = () => {
  const { merchant, updateMerchant } = useMerchant();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name: merchant?.business_name || "",
      phone: merchant?.phone || "",
      bank_name: merchant?.bank_name || "",
      bank_account_number: merchant?.bank_account_number || "",
      bank_account_name: merchant?.bank_account_name || "",
      sepay_api_key: merchant?.sepay_api_key || "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const { error } = await updateMerchant({
      business_name: data.business_name,
      phone: data.phone || null,
      bank_name: data.bank_name,
      bank_account_number: data.bank_account_number,
      bank_account_name: data.bank_account_name,
      sepay_api_key: data.sepay_api_key || null,
    });
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể lưu thông tin. Vui lòng thử lại.",
      });
    } else {
      toast({
        title: "Thành công",
        description: "Đã lưu cấu hình ngân hàng!",
      });
    }
  };

  const isConfigured = merchant?.bank_account_number && merchant?.bank_name;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cài đặt ngân hàng</h1>
        <p className="text-muted-foreground">
          Cấu hình thông tin ngân hàng để nhận thanh toán
        </p>
      </div>

      {isConfigured && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-success/50 bg-success/5">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-success font-medium">
                Đã cấu hình ngân hàng - Sẵn sàng nhận thanh toán
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cửa hàng & ngân hàng</CardTitle>
          <CardDescription>
            Thông tin này sẽ được sử dụng để tạo mã QR và link thanh toán
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="business_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên cửa hàng / Doanh nghiệp</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Cửa hàng ABC" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại (tùy chọn)</FormLabel>
                    <FormControl>
                      <Input placeholder="0901234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngân hàng</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn ngân hàng" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tài khoản</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="1234567890" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bank_account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên chủ tài khoản</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="NGUYEN VAN A" className="pl-10 uppercase" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Nhập đúng tên trên thẻ ngân hàng (in hoa, không dấu)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sepay_api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SePay API Key (tùy chọn)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="sk_live_..." 
                          className="pl-10" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Nếu có SePay API key, hệ thống sẽ tự động xác nhận giao dịch
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankSettings;
