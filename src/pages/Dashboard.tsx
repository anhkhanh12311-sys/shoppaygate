import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  Settings,
  Link2,
  QrCode,
  History,
  LogOut,
  Menu,
   Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useMerchant } from "@/hooks/useMerchant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import BankSettings from "@/components/dashboard/BankSettings";
import CreatePaymentLink from "@/components/dashboard/CreatePaymentLink";
import PaymentLinksList from "@/components/dashboard/PaymentLinksList";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
 import WebhookSettings from "@/components/dashboard/WebhookSettings";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { merchant, loading: merchantLoading } = useMerchant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || merchantLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user || !merchant) {
    return null;
  }

  const navItems = [
    { value: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { value: "settings", label: "Cài đặt ngân hàng", icon: Settings },
    { value: "create-link", label: "Tạo link thanh toán", icon: Link2 },
    { value: "qr-static", label: "QR tĩnh", icon: QrCode },
    { value: "history", label: "Lịch sử giao dịch", icon: History },
     { value: "webhook", label: "Webhook", icon: Webhook },
  ];

  const SideNav = () => (
    <div className="space-y-2">
      {navItems.map((item) => (
        <button
          key={item.value}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
          onClick={() => {
            const tabsList = document.querySelector(`[data-value="${item.value}"]`);
            if (tabsList) {
              (tabsList as HTMLButtonElement).click();
            }
          }}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </button>
      ))}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-left"
      >
        <LogOut className="h-5 w-5" />
        <span>Đăng xuất</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="py-6">
                  <Link to="/" className="flex items-center gap-2 mb-8">
                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                      PayGate
                    </span>
                  </Link>
                  <SideNav />
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary hidden sm:inline">
                PayGate
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-medium">{merchant.business_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden lg:flex">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-transparent p-0 h-auto gap-2">
              {navItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  data-value={item.value}
                  className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <DashboardOverview />
            </TabsContent>

            <TabsContent value="settings">
              <BankSettings />
            </TabsContent>

            <TabsContent value="create-link">
              <CreatePaymentLink />
            </TabsContent>

            <TabsContent value="qr-static">
              <CreatePaymentLink isStatic />
            </TabsContent>

            <TabsContent value="history">
              <TransactionHistory />
            </TabsContent>
             
             <TabsContent value="webhook">
               <WebhookSettings />
             </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
