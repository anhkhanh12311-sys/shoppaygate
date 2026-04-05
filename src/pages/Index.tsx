import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap, Shield, QrCode, BarChart3, Clock,
  ArrowRight, CheckCircle2, Sparkles, Star, Quote,
  CreditCard, Globe, Smartphone, ChevronRight, Layers,
  TrendingUp, Lock, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRef } from "react";

const features = [
  {
    icon: QrCode,
    title: "QR & Link Thanh Toán",
    description: "Tạo mã QR tĩnh hoặc link thanh toán động chuyên nghiệp trong vài giây",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Zap,
    title: "Xác Nhận Tự Động",
    description: "Tự động xác nhận giao dịch thành công realtime qua SePay API",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Shield,
    title: "Bảo Mật Tối Đa",
    description: "Mã hóa end-to-end, RLS policies bảo vệ mọi dữ liệu ngân hàng",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: BarChart3,
    title: "Thống Kê Realtime",
    description: "Dashboard trực quan theo dõi doanh thu, giao dịch mọi lúc",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: CreditCard,
    title: "Đa Ngân Hàng",
    description: "Quản lý nhiều tài khoản ngân hàng, chuyển đổi linh hoạt",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Globe,
    title: "Webhook Thông Minh",
    description: "Nhận thông báo realtime qua webhook tùy chỉnh khi có thanh toán",
    color: "from-indigo-500 to-violet-600",
  },
];

const steps = [
  { step: 1, title: "Đăng ký tài khoản", description: "Tạo tài khoản miễn phí trong 30 giây", icon: Smartphone },
  { step: 2, title: "Cấu hình ngân hàng", description: "Thêm tài khoản ngân hàng & API key", icon: CreditCard },
  { step: 3, title: "Tạo link/QR", description: "Tạo và chia sẻ link hoặc QR Code", icon: QrCode },
  { step: 4, title: "Nhận tiền tự động", description: "Hệ thống tự xác nhận khi có chuyển khoản", icon: Zap },
];

const testimonials = [
  {
    name: "Nguyễn Văn Minh",
    role: "Chủ cửa hàng thời trang",
    content: "PayGate giúp tôi tiết kiệm rất nhiều thời gian kiểm tra chuyển khoản. Giờ tôi chỉ cần gửi QR cho khách là xong!",
    rating: 5,
    avatar: "NM",
  },
  {
    name: "Trần Thị Hương",
    role: "Kinh doanh online",
    content: "Tính năng tự động xác nhận giao dịch rất tuyệt vời. Khách hàng thanh toán xong là tôi nhận được thông báo ngay.",
    rating: 5,
    avatar: "TH",
  },
  {
    name: "Lê Hoàng Nam",
    role: "Freelancer",
    content: "Giao diện đẹp, dễ sử dụng. Tạo link thanh toán chỉ trong vài giây. Rất phù hợp cho người bán hàng nhỏ lẻ.",
    rating: 5,
    avatar: "LN",
  },
];

const stats = [
  { value: "10,000+", label: "Giao dịch xử lý", icon: TrendingUp },
  { value: "500+", label: "Merchants tin dùng", icon: Layers },
  { value: "99.9%", label: "Thời gian hoạt động", icon: Wifi },
  { value: "< 5s", label: "Xác nhận giao dịch", icon: Zap },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
} as const;
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
} as const;

const Index = () => {
  const { user, loading } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container py-3">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow duration-300">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-gradient-primary">
                PayGate
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {loading ? (
                <div className="h-10 w-24 bg-muted animate-pulse rounded-xl" />
              ) : user ? (
                <Link to="/dashboard">
                  <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-glow transition-all duration-300 rounded-xl">
                    Dashboard
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="hidden sm:inline">
                    <Button variant="ghost" className="rounded-xl">Đăng nhập</Button>
                  </Link>
                  <Link to="/auth?tab=signup">
                    <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-glow transition-all duration-300 rounded-xl">
                      Bắt đầu miễn phí
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden">
        {/* Mesh Background */}
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 dot-pattern opacity-40" />
        
        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-secondary/10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-accent/8 blur-3xl"
        />

        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative z-10">
          <div className="container py-20 lg:py-32">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 text-primary mb-8">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium">Giải pháp thanh toán tự động #1 Việt Nam</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </motion.div>

              <motion.h1 variants={item} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Nhận thanh toán{" "}
                <span className="text-gradient">
                  dễ dàng & tự động
                </span>
              </motion.h1>

              <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Tạo link và mã QR thanh toán chuyên nghiệp. Tích hợp SePay API để tự động xác nhận giao dịch trong vài giây.
              </motion.p>

              <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?tab=signup">
                  <Button size="lg" className="gradient-primary text-primary-foreground shadow-xl hover:shadow-glow-lg transition-all duration-300 text-lg px-8 h-14 rounded-xl w-full sm:w-auto">
                    Bắt đầu miễn phí
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-xl border-2 hover:bg-primary/5 w-full sm:w-auto">
                    <Lock className="mr-2 h-4 w-4" />
                    Đăng nhập
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Stats bar */}
          <div className="container pb-20">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            >
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={item}>
                  <div className="glass-card rounded-2xl p-5 text-center hover-lift">
                    <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl md:text-3xl font-bold text-gradient-primary">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background relative">
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Tính năng
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Tính năng{" "}
              <span className="text-gradient-primary">nổi bật</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Mọi thứ bạn cần để nhận thanh toán online một cách chuyên nghiệp
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <Card className="group hover-lift card-shine border border-border/60 bg-card h-full rounded-2xl">
                  <CardContent className="p-6">
                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-muted/40 relative overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="absolute -right-40 -top-40 w-80 h-80 rounded-full border border-primary/10"
        />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Layers className="h-3.5 w-3.5" />
              Hướng dẫn
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Cách <span className="text-gradient-primary">hoạt động</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Chỉ 4 bước đơn giản để bắt đầu nhận thanh toán
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, index) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                viewport={{ once: true }}
              >
                <div className="relative text-center group">
                  <div className="relative inline-flex mb-5">
                    <div className="h-20 w-20 rounded-3xl gradient-primary flex items-center justify-center shadow-xl group-hover:shadow-glow transition-shadow duration-300">
                      <s.icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm font-bold text-primary shadow-md">
                      {s.step}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[calc(50%+48px)] w-[calc(100%-96px)] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                  )}
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-sm">{s.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-background relative">
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Star className="h-3.5 w-3.5" />
              Đánh giá
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Khách hàng{" "}
              <span className="text-gradient-primary">nói gì</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Hàng trăm merchants đã tin tưởng sử dụng PayGate
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={item}>
                <Card className="h-full border border-border/60 bg-card hover-lift rounded-2xl">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-1 mb-4">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                      ))}
                    </div>
                    <Quote className="h-6 w-6 text-primary/20 mb-3" />
                    <p className="text-muted-foreground flex-1 mb-6 leading-relaxed text-sm">
                      "{t.content}"
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                        {t.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Card className="gradient-primary p-8 md:p-16 text-center border-0 relative overflow-hidden rounded-3xl shadow-glow-lg">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12),transparent)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.06),transparent)] pointer-events-none" />
              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 leading-tight">
                    Sẵn sàng nhận thanh toán<br className="hidden md:block" /> tự động?
                  </h2>
                  <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
                    Đăng ký ngay hôm nay — miễn phí, bắt đầu trong 30 giây
                  </p>
                  <Link to="/auth?tab=signup">
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl text-lg px-10 h-14 rounded-xl font-bold">
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Đăng ký miễn phí
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-gradient-primary text-lg">
                PayGate
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Giải pháp thanh toán tự động</span>
              <span className="text-border">•</span>
              <span>© 2025 PayGate</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
