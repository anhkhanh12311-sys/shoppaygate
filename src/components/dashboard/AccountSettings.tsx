import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Phone, Key, Save, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMerchant } from "@/hooks/useMerchant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const profileSchema = z.object({
  business_name: z.string().trim().min(2, "Tối thiểu 2 ký tự").max(100),
  phone: z.string().trim().optional(),
  sepay_api_key: z.string().trim().optional(),
});

const passwordSchema = z.object({
  new_password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "Mật khẩu không khớp",
  path: ["confirm_password"],
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

const AccountSettings = () => {
  const { user } = useAuth();
  const { merchant, updateMerchant } = useMerchant();
  const { toast } = useToast();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      business_name: merchant?.business_name || "",
      phone: merchant?.phone || "",
      sepay_api_key: merchant?.sepay_api_key || "",
    },
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const onSaveProfile = async (data: ProfileData) => {
    setSavingProfile(true);
    const { error } = await updateMerchant({
      business_name: data.business_name,
      phone: data.phone || null,
      sepay_api_key: data.sepay_api_key || null,
    });
    setSavingProfile(false);
    toast(error
      ? { variant: "destructive", title: "Lỗi", description: "Không thể lưu thông tin." }
      : { title: "Thành công", description: "Đã cập nhật thông tin tài khoản!" }
    );
  };

  const onChangePassword = async (data: PasswordData) => {
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: data.new_password });
    setSavingPassword(false);
    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } else {
      toast({ title: "Thành công", description: "Đã đổi mật khẩu!" });
      passwordForm.reset();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Thông tin tài khoản</h1>
        <p className="text-muted-foreground">Quản lý thông tin cá nhân và API key</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Thông tin cơ bản
          </CardTitle>
          <CardDescription>Email: {user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <FormField control={profileForm.control} name="business_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên cửa hàng</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Cửa hàng ABC" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={profileForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="0901234567" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={profileForm.control} name="sepay_api_key" render={({ field }) => (
                <FormItem>
                  <FormLabel>SePay API Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk_live_..."
                        className="pl-10 pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Kết nối SePay để tự động xác nhận giao dịch
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={savingProfile}>
                {savingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</> : <><Save className="mr-2 h-4 w-4" />Lưu thông tin</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
              <FormField control={passwordForm.control} name="new_password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu mới</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirm_password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Xác nhận mật khẩu</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" variant="outline" className="w-full" disabled={savingPassword}>
                {savingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đổi...</> : <><Lock className="mr-2 h-4 w-4" />Đổi mật khẩu</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;
