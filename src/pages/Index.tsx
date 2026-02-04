import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Zap, 
  Shield, 
  QrCode, 
  BarChart3, 
  Users, 
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles
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
    description: "Hệ thống tự động xác nhận khi có giao dịch thành công",
  },
  {
    icon: Shield,
    title: "Bảo Mật Tuyệt Đối",
    description: "Mã hóa dữ liệu, bảo vệ thông tin ngân hàng của bạn",
  },
  {
    icon: BarChart3,
    title: "Thống Kê Chi Tiết",
    description: "Theo dõi doanh thu theo thời gian thực",
  },
  {
    icon: Users,
    title: "Đa Người Dùng",
    description: "Mỗi merchant có dashboard riêng biệt",
  },
  {
    icon: Clock,
    title: "Hoạt Động 24/7",
    description: "Nhận thanh toán mọi lúc mọi nơi",
  },
];

const steps = [
  { step: 1, title: "Đăng ký tài khoản", description: "Tạo tài khoản miễn phí chỉ trong 30 giây" },
  { step: 2, title: "Cấu hình ngân hàng", description: "Thêm thông tin tài khoản ngân hàng của bạn" },
  { step: 3, title: "Tạo link/QR", description: "Tạo và chia sẻ link thanh toán cho khách hàng" },
  { step: 4, title: "Nhận tiền tự động", description: "Hệ thống tự động xác nhận khi có thanh toán" },
];

const Index = () => {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="container py-6">
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
                <Link to="/auth">
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
      </header>

      {/* Hero Section */}
      <section className="container py-20 lg:py-32">
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
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-xl hover:shadow-2xl transition-shadow animate-pulse-glow">
                Bắt đầu miễn phí
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-2">
              Xem demo
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
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
      </section>

      {/* How it works */}
      <section className="container py-20">
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
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Card className="gradient-primary p-8 md:p-12 text-center border-0">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Sẵn sàng nhận thanh toán tự động?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              Đăng ký ngay hôm nay và bắt đầu nhận thanh toán từ khách hàng của bạn
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?tab=signup">
                <Button size="lg" variant="secondary" className="shadow-xl">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Đăng ký miễn phí
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="container py-10 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              PayGate
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 PayGate. Giải pháp thanh toán tự động.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
