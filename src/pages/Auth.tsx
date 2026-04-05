import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Sparkles, ArrowLeft, Loader2, Mail, Lock, Building2, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email không hợp lệ" }),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" }),
});

const signupSchema = z.object({
  businessName: z.string().trim().min(2, { message: "Tên cửa hàng phải có ít nhất 2 ký tự" }).max(100),
  email: z.string().trim().email({ message: "Email không hợp lệ" }),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { businessName: "", email: "", password: "", confirmPassword: "" },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);
    if (error) {
      let message = "Đăng nhập thất bại";
      if (error.message.includes("Invalid login credentials")) message = "Email hoặc mật khẩu không đúng";
      else if (error.message.includes("Email not confirmed")) message = "Vui lòng xác nhận email trước khi đăng nhập";
      toast({ variant: "destructive", title: "Lỗi", description: message });
    } else {
      toast({ title: "Thành công", description: "Đăng nhập thành công!" });
      navigate("/dashboard");
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.businessName);
    setIsLoading(false);
    if (error) {
      let message = "Đăng ký thất bại";
      if (error.message.includes("already registered")) message = "Email đã được đăng ký";
      toast({ variant: "destructive", title: "Lỗi", description: message });
    } else {
      toast({ title: "Đăng ký thành công!", description: "Tài khoản đã được tạo. Đang chuyển hướng..." });
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-[5%] w-72 h-72 rounded-full bg-primary/8 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-20 right-[5%] w-96 h-96 rounded-full bg-secondary/8 blur-3xl"
      />

      {/* Header */}
      <header className="relative z-10 container py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại trang chủ</span>
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 container flex items-center justify-center py-6 pb-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <span className="text-3xl font-bold text-gradient-primary">
                PayGate
              </span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="border border-border/60 shadow-xl bg-card/80 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-2xl font-bold">
                  {activeTab === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
                </CardTitle>
                <CardDescription className="text-base">
                  {activeTab === "login"
                    ? "Đăng nhập để quản lý thanh toán"
                    : "Đăng ký miễn phí để bắt đầu"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-8 px-6 md:px-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-11">
                    <TabsTrigger value="login" className="rounded-lg font-medium">Đăng nhập</TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-lg font-medium">Đăng ký</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                        <FormField control={loginForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="email" placeholder="email@example.com" className="pl-10 h-11 rounded-xl" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={loginForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11 rounded-xl" {...field} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" className="w-full gradient-primary text-primary-foreground h-11 rounded-xl font-semibold shadow-lg hover:shadow-glow transition-all" disabled={isLoading}>
                          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đăng nhập...</> : "Đăng nhập"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <Form {...signupForm}>
                      <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                        <FormField control={signupForm.control} name="businessName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tên cửa hàng / Doanh nghiệp</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Cửa hàng ABC" className="pl-10 h-11 rounded-xl" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={signupForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="email" placeholder="email@example.com" className="pl-10 h-11 rounded-xl" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={signupForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11 rounded-xl" {...field} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Xác nhận mật khẩu</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 h-11 rounded-xl" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" className="w-full gradient-primary text-primary-foreground h-11 rounded-xl font-semibold shadow-lg hover:shadow-glow transition-all" disabled={isLoading}>
                          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đăng ký...</> : "Đăng ký"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-primary" />Bảo mật</div>
                  <div className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-primary" />Nhanh chóng</div>
                  <div className="flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-primary" />Mã hóa</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
