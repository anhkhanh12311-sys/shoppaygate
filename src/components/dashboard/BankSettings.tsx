import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CreditCard, User, Plus, Loader2, Star, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMerchantBanks, MerchantBank } from "@/hooks/useMerchantBanks";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  bank_name: z.string().min(1, "Vui lòng chọn ngân hàng"),
  bank_account_number: z.string().trim().min(6, "Số tài khoản không hợp lệ").max(20),
  bank_account_name: z.string().trim().min(2, "Tên chủ TK không hợp lệ").max(100),
});

type FormData = z.infer<typeof schema>;

const BankSettings = () => {
  const { banks: merchantBanks, loading, addBank, updateBank, deleteBank, setDefault } = useMerchantBanks();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bank_name: "", bank_account_number: "", bank_account_name: "" },
  });

  const startEdit = (bank: MerchantBank) => {
    setEditingId(bank.id);
    setIsAdding(true);
    form.reset({
      bank_name: bank.bank_name,
      bank_account_number: bank.bank_account_number,
      bank_account_name: bank.bank_account_name,
    });
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    form.reset({ bank_name: "", bank_account_number: "", bank_account_name: "" });
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    if (editingId) {
      const { error } = await updateBank(editingId, data);
      if (error) {
        toast({ variant: "destructive", title: "Lỗi", description: "Không thể cập nhật." });
      } else {
        toast({ title: "Thành công", description: "Đã cập nhật ngân hàng!" });
        cancelForm();
      }
    } else {
      const isFirst = merchantBanks.length === 0;
      const { error } = await addBank({ bank_name: data.bank_name, bank_account_number: data.bank_account_number, bank_account_name: data.bank_account_name, is_default: isFirst });
      if (error) {
        toast({ variant: "destructive", title: "Lỗi", description: "Không thể thêm ngân hàng." });
      } else {
        toast({ title: "Thành công", description: "Đã thêm ngân hàng!" });
        cancelForm();
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteBank(id);
    toast(error
      ? { variant: "destructive", title: "Lỗi", description: "Không thể xoá." }
      : { title: "Đã xoá", description: "Đã xoá ngân hàng." }
    );
  };

  const handleSetDefault = async (id: string) => {
    const { error } = await setDefault(id);
    if (!error) toast({ title: "Thành công", description: "Đã đặt mặc định!" });
  };

  const getBankLabel = (code: string) => banks.find((b) => b.code === code)?.name || code;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cài đặt ngân hàng</h1>
          <p className="text-muted-foreground">Quản lý tài khoản ngân hàng nhận thanh toán</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="gradient-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> Thêm ngân hàng
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Chỉnh sửa ngân hàng" : "Thêm ngân hàng mới"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="bank_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngân hàng</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Chọn ngân hàng" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {banks.map((b) => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bank_account_number" render={({ field }) => (
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
                )} />
                <FormField control={form.control} name="bank_account_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên chủ tài khoản</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="NGUYEN VAN A" className="pl-10 uppercase" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 gradient-primary text-primary-foreground" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingId ? "Cập nhật" : "Thêm ngân hàng"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelForm}>Huỷ</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Bank List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Ngân hàng đã thêm
          </CardTitle>
          <CardDescription>
            {merchantBanks.length === 0 ? "Chưa có ngân hàng nào" : `${merchantBanks.length} ngân hàng`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : merchantBanks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Thêm ngân hàng để bắt đầu nhận thanh toán</p>
            </div>
          ) : (
            <div className="space-y-3">
              {merchantBanks.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getBankLabel(bank.bank_name)}</span>
                        {bank.is_default && <Badge variant="secondary" className="text-xs">Mặc định</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bank.bank_account_number} • {bank.bank_account_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!bank.is_default && (
                      <Button variant="ghost" size="icon" onClick={() => handleSetDefault(bank.id)} title="Đặt mặc định">
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => startEdit(bank)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xoá ngân hàng?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc muốn xoá {getBankLabel(bank.bank_name)} - {bank.bank_account_number}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Huỷ</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(bank.id)} className="bg-destructive text-destructive-foreground">
                            Xoá
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankSettings;
