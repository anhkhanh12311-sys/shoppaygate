import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap, Shield, QrCode, BarChart3, Users, Clock,
  ArrowRight, CheckCircle2, Sparkles, Star, Quote,
  CreditCard, Globe, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const features = [
  {
    icon: QrCode,
    title: "QR Code & Link Thanh Toán",
    description: "Tạo mã QR tĩnh hoặc link thanh toán động trong vài giây",
  },
  {
    icon: Zap,
    title: "Xác Nhận Tự Động",
    description: "Hệ thống tự động xác nhận khi có giao dịch thành công qua SePay API",
  },
  {
    icon: Shield,
    title: "Bảo Mật Tuyệt Đối",
    description: "Mã hóa dữ liệu end-to-end, RLS bảo vệ thông tin ngân hàng",
  },
  {
    icon: BarChart3,
    title: "Thống Kê Chi Tiết",
    description: "Dashboard realtime theo dõi doanh thu và giao dịch",
  },
  {
    icon: CreditCard,
    title: "Đa Ngân Hàng",
    description: "Hỗ trợ nhiều tài khoản ngân hàng, chọn mặc định linh hoạt",
  },
  {
    icon: Globe,
    title: "Webhook Thông Minh",
    description: "Nhận thông báo realtime qua webhook khi có thanh toán",
  },
];

const steps = [
  { step: 1, title: "Đăng ký tài khoản", description: "Tạo tài khoản miễn phí, không cần xác thực email" },
  { step: 2, title: "Cấu hình ngân hàng", description: "Thêm tài khoản ngân hàng và API key SePay" },
  { step: 3, title: "Tạo link/QR", description: "Tạo và chia sẻ link thanh toán hoặc QR Code" },
  { step: 4, title: "Nhận tiền tự động", description: "Hệ thống tự động xác nhận khi khách chuyển khoản" },
];

const testimonials = [
  {
    name: "Nguyễn Văn Minh",
    role: "Chủ cửa hàng thời trang",
    content: "PayGate giúp tôi tiết kiệm rất nhiều thời gian kiểm tra chuyển khoản. Giờ tôi chỉ cần gửi QR cho khách là xong!",
    rating: 5,
  },
  {
    name: "Trần Thị Hương",
    role: "Kinh doanh online",
    content: "Tính năng tự động xác nhận giao dịch rất tuyệt vời. Khách hàng thanh toán xong là tôi nhận được thông báo ngay.",
    rating: 5,
  },
  {
    name: "Lê Hoàng Nam",
    role: "Freelancer",
    content: "Giao diện đẹp, dễ sử dụng. Tạo link thanh toán chỉ trong vài giây. Rất phù hợp cho người bán hàng nhỏ lẻ.",
    rating: 5,
  },
];

const stats = [
  { value: "10,000+", label: "Giao dịch" },
  { value: "500+", label: "Merchants" },
  { value: "99.9%", label: "Uptime" },
  { value: "< 5s", label: "Xác nhận" },
];

const Index = () => {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container py-4">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                PayGate
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {loading ? (
                <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
              ) : user ? (
                <Link to="/dashboard">
                  <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow">
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="hidden sm:inline">
                    <Button variant="ghost">Đăng nhập</Button>
                  </Link>
                  <Link to="/auth?tab=signup">
                    <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow">
                      Đăng ký miễn phí
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero">
        <div className="container py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Giải pháp thanh toán tự động #1 Việt Nam</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Nhận thanh toán{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
                dễ dàng & tự động
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Tạo link và mã QR thanh toán chuyên nghiệp. Tích hợp SePay API để tự động xác nhận giao dịch trong vài giây.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="gradient-primary text-primary-foreground shadow-xl hover:shadow-2xl transition-shadow text-lg px-8">
                  Bắt đầu miễn phí
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-2 text-lg px-8">
                  Đăng nhập
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Stats bar */}
        <div className="container pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-background py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tính năng{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                nổi bật
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Mọi thứ bạn cần để nhận thanh toán online một cách chuyên nghiệp
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="group hover:shadow-xl transition-all duration-300 border-0 gradient-card h-full">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Cách{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                hoạt động
              </span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Chỉ 4 bước đơn giản để bắt đầu nhận thanh toán
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-center">
                  <div className="relative inline-flex">
                    <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mb-4">
                      {item.step}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-background py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Khách hàng{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                nói gì
              </span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Hàng trăm merchants đã tin tưởng sử dụng PayGate
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-0 gradient-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 flex flex-col h-full">
                    <Quote className="h-8 w-8 text-primary/30 mb-4" />
                    <p className="text-muted-foreground flex-1 mb-4 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="gradient-primary p-8 md:p-16 text-center border-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
                  Sẵn sàng nhận thanh toán tự động?
                </h2>
                <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                  Đăng ký ngay hôm nay — miễn phí, không cần xác thực email
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth?tab=signup">
                    <Button size="lg" variant="secondary" className="shadow-xl text-lg px-8">
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Đăng ký miễn phí
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                PayGate
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Giải pháp thanh toán tự động</span>
              <span>•</span>
              <span>© 2025 PayGate</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
