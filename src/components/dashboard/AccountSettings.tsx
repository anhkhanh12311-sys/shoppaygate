import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  User, Mail, Phone, Key, Save, Loader2, Eye, EyeOff, Lock, Shield,
  CheckCircle2, AlertTriangle, Building2, Globe, Pencil,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMerchant } from "@/hooks/useMerchant";
import { useMerchantSecrets } from "@/hooks/useMerchantSecrets";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const profileSchema = z.object({
  business_name: z.string().trim().min(2, "Tối thiểu 2 ký tự").max(100),
  phone: z.string().trim().optional(),
  email: z.string().email("Email không hợp lệ"),
});

const apiKeySchema = z.object({
  sepay_api_key: z.string().trim().optional(),
});

const emailSchema = z.object({
  new_email: z.string().email("Email không hợp lệ"),
});

const passwordSchema = z.object({
  new_password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "Mật khẩu không khớp",
  path: ["confirm_password"],
});

type ProfileData = z.infer<typeof profileSchema>;
type ApiKeyData = z.infer<typeof apiKeySchema>;
type EmailData = z.infer<typeof emailSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const AccountSettings = () => {
  const { user } = useAuth();
  const { merchant, updateMerchant } = useMerchant();
  const { secrets, updateSecrets } = useMerchantSecrets();
  const { toast } = useToast();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { business_name: "", phone: "", email: "" },
  });

  const apiKeyForm = useForm<ApiKeyData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { sepay_api_key: "" },
  });

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { new_email: "" },
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  useEffect(() => {
    if (merchant) {
      profileForm.reset({
        business_name: merchant.business_name || "",
        phone: merchant.phone || "",
        email: merchant.email || "",
      });
    }
  }, [merchant]);

  useEffect(() => {
    apiKeyForm.reset({ sepay_api_key: secrets.sepay_api_key || "" });
  }, [secrets.sepay_api_key]);

  const onSaveProfile = async (data: ProfileData) => {
    setSavingProfile(true);
    const { error } = await updateMerchant({
      business_name: data.business_name,
      phone: data.phone || null,
    });
    setSavingProfile(false);
    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể lưu thông tin." });
    } else {
      toast({ title: "✅ Thành công", description: "Đã cập nhật thông tin tài khoản!" });
      setEditingProfile(false);
    }
  };

  const onSaveApiKey = async (data: ApiKeyData) => {
    setSavingApiKey(true);
    const { error } = await updateSecrets({ sepay_api_key: data.sepay_api_key || null });
    setSavingApiKey(false);
    toast(error
      ? { variant: "destructive", title: "Lỗi", description: "Không thể lưu API Key." }
      : { title: "✅ Thành công", description: "Đã cập nhật SePay API Key!" }
    );
  };

  const onChangeEmail = async (data: EmailData) => {
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: data.new_email });
    setSavingEmail(false);
    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } else {
      toast({ title: "📧 Xác nhận email", description: "Email xác nhận đã được gửi. Vui lòng kiểm tra hộp thư." });
      emailForm.reset();
    }
  };

  const onChangePassword = async (data: PasswordData) => {
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: data.new_password });
    setSavingPassword(false);
    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } else {
      toast({ title: "✅ Thành công", description: "Đã đổi mật khẩu!" });
      passwordForm.reset();
    }
  };

  const apiKeyStatus = secrets.sepay_api_key ? "configured" : "missing";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div variants={item} initial="hidden" animate="show">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Thông tin tài khoản</h1>
            <p className="text-muted-foreground text-sm">Quản lý hồ sơ, bảo mật và API</p>
          </div>
        </div>
      </motion.div>

      {/* Profile Summary Card */}
      <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
        <Card className="gradient-card border-primary/10 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-xl font-bold shadow-md">
                  {merchant?.business_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{merchant?.business_name || "—"}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {user?.email}
                  </p>
                  {merchant?.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5" /> {merchant.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={apiKeyStatus === "configured" ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}>
                  {apiKeyStatus === "configured" ? <><CheckCircle2 className="h-3 w-3 mr-1" />API kết nối</> : <><AlertTriangle className="h-3 w-3 mr-1" />Chưa cấu hình</>}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-11">
          <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm"><Building2 className="h-4 w-4" /> Hồ sơ</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm"><Lock className="h-4 w-4" /> Bảo mật</TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5 text-xs sm:text-sm"><Shield className="h-4 w-4" /> API Key</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <motion.div variants={item} initial="hidden" animate="show">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-5 w-5 text-primary" /> Thông tin doanh nghiệp
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setEditingProfile(!editingProfile)}>
                    <Pencil className="h-4 w-4 mr-1" /> {editingProfile ? "Hủy" : "Chỉnh sửa"}
                  </Button>
                </div>
                <CardDescription>Thông tin hiển thị trên trang thanh toán và cửa hàng</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                    <FormField control={profileForm.control} name="business_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên cửa hàng / Doanh nghiệp</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Cửa hàng ABC" className="pl-10" disabled={!editingProfile} {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email liên hệ</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="contact@example.com" className="pl-10" disabled={!editingProfile} {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>Email hiển thị trên trang cửa hàng (khác email đăng nhập)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số điện thoại</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="0901234567" className="pl-10" disabled={!editingProfile} {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {editingProfile && (
                      <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={savingProfile}>
                        {savingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</> : <><Save className="mr-2 h-4 w-4" />Lưu thay đổi</>}
                      </Button>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 mt-4">
          {/* Change Auth Email */}
          <motion.div variants={item} initial="hidden" animate="show">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-5 w-5 text-primary" /> Thay đổi email đăng nhập
                </CardTitle>
                <CardDescription>Email hiện tại: <span className="font-medium text-foreground">{user?.email}</span></CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onChangeEmail)} className="space-y-4">
                    <FormField control={emailForm.control} name="new_email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email mới</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="newemail@example.com" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>Email xác nhận sẽ được gửi đến địa chỉ mới</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" variant="outline" className="w-full" disabled={savingEmail}>
                      {savingEmail ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi...</> : <><Mail className="mr-2 h-4 w-4" />Gửi xác nhận</>}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>

          <Separator />

          {/* Change Password */}
          <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-5 w-5 text-primary" /> Đổi mật khẩu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                    <FormField control={passwordForm.control} name="new_password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu mới</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="confirm_password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xác nhận mật khẩu</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
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
          </motion.div>
        </TabsContent>

        {/* API Key Tab */}
        <TabsContent value="api" className="space-y-4 mt-4">
          <motion.div variants={item} initial="hidden" animate="show">
            <Card className={apiKeyStatus === "configured" ? "border-success/30" : "border-warning/30"}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-primary" /> SePay API Key
                  </CardTitle>
                  <Badge variant="outline" className={apiKeyStatus === "configured" ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}>
                    {apiKeyStatus === "configured" ? <><CheckCircle2 className="h-3 w-3 mr-1" />Đã kết nối</> : <><AlertTriangle className="h-3 w-3 mr-1" />Chưa cấu hình</>}
                  </Badge>
                </div>
                <CardDescription>Kết nối SePay để tự động xác nhận giao dịch ngân hàng realtime</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...apiKeyForm}>
                  <form onSubmit={apiKeyForm.handleSubmit(onSaveApiKey)} className="space-y-4">
                    <FormField control={apiKeyForm.control} name="sepay_api_key" render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showApiKey ? "text" : "password"}
                              placeholder="sk_live_..."
                              className="pl-10 pr-10 font-mono text-sm"
                              {...field}
                            />
                            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Lấy API Key tại <span className="font-medium text-primary">my.sepay.vn</span> → Cài đặt → API Key
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={savingApiKey}>
                      {savingApiKey ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</> : <><Key className="mr-2 h-4 w-4" />Lưu API Key</>}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountSettings;
