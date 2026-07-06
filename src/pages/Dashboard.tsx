import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, LayoutDashboard, Settings, Link2, QrCode,
  History, LogOut, User, Menu, X, Shield, Store,
  Activity, Filter, Users, Volume2, Brain, Database, Rocket, Wallet, Plug,
  Receipt, ReceiptText, Contact, Package, ShoppingBag, Ticket, Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMerchant } from "@/hooks/useMerchant";
import { useUserRole } from "@/hooks/useUserRole";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import BankSettings from "@/components/dashboard/BankSettings";
import CreatePaymentLink from "@/components/dashboard/CreatePaymentLink";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
import Integrations from "@/components/dashboard/Integrations";
import AccountSettings from "@/components/dashboard/AccountSettings";
import StoreSettings from "@/components/dashboard/StoreSettings";
import BalanceChanges from "@/components/dashboard/BalanceChanges";
import SmartFilter from "@/components/dashboard/SmartFilter";
import StaffManagement from "@/components/dashboard/StaffManagement";
import VoiceAnnouncerSettings from "@/components/dashboard/VoiceAnnouncerSettings";
import SepaySync from "@/components/dashboard/SepaySync";
import AIInsights from "@/components/dashboard/AIInsights";
import GatewayRental from "@/components/dashboard/GatewayRental";
import TopupBalance from "@/components/dashboard/TopupBalance";
import InstallPrompt from "@/components/InstallPrompt";
import BrandedReceiptSettings from "@/components/dashboard/BrandedReceiptSettings";
import BillHistory from "@/components/dashboard/BillHistory";
import CustomersCRM from "@/components/dashboard/CustomersCRM";
import ProductsManagement from "@/components/dashboard/ProductsManagement";
import OrdersManagement from "@/components/dashboard/OrdersManagement";
import VouchersManagement from "@/components/dashboard/VouchersManagement";
import BankRoutingManager from "@/components/dashboard/BankRoutingManager";
import TopupRentalCenter from "@/components/dashboard/TopupRentalCenter";
import RoutingPlayground from "@/components/dashboard/RoutingPlayground";

const navSections = [
  {
    label: "Tổng quan",
    items: [
      { value: "overview", label: "Tổng quan", icon: LayoutDashboard },
      { value: "ai-insights", label: "AI Insights", icon: Brain },
      { value: "balance", label: "Biến động số dư", icon: Activity },
    ],
  },
  {
    label: "Thu tiền",
    items: [
      { value: "create-link", label: "Tạo link", icon: Link2 },
      { value: "qr-static", label: "QR tĩnh", icon: QrCode },
      { value: "topup", label: "Nạp số dư", icon: Wallet },
    ],
  },
  {
    label: "Bán hàng",
    items: [
      { value: "products", label: "Sản phẩm", icon: Package },
      { value: "orders", label: "Đơn hàng", icon: ShoppingBag },
      { value: "store", label: "Cửa hàng", icon: Store },
      { value: "vouchers", label: "Khuyến mãi", icon: Ticket },
      { value: "customers", label: "Khách hàng", icon: Contact },
      { value: "branded-receipt", label: "Mẫu hoá đơn", icon: Receipt },
    ],
  },
  {
    label: "Giao dịch",
    items: [
      { value: "history", label: "Lịch sử GD", icon: History },
      { value: "bill-history", label: "Lịch sử bill", icon: ReceiptText },
      { value: "smart-filter", label: "Lọc thông minh", icon: Filter },
      { value: "sepay-sync", label: "Đồng bộ SePay", icon: Database },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { value: "settings", label: "Ngân hàng", icon: Settings },
      { value: "bank-routing", label: "Điều phối NH", icon: Network },
      { value: "routing-playground", label: "Routing Playground", icon: Sparkles },
      { value: "gateway-rental", label: "Cho thuê cổng", icon: Rocket },
      { value: "topup-rental", label: "Trung tâm thuê nạp", icon: Rocket },
      { value: "staff", label: "Nhân viên", icon: Users },
      { value: "voice", label: "Loa thanh toán", icon: Volume2 },
      { value: "integrations", label: "Webhook & API", icon: Plug },
      { value: "account", label: "Tài khoản", icon: User },
    ],
  },
];

const allNavItems = navSections.flatMap(s => s.items);

const LG_BREAKPOINT = 1024;

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { merchant, loading: merchantLoading } = useMerchant();
  const { isAdmin } = useUserRole();
  useRealtimeNotifications();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track if below lg breakpoint for sidebar visibility
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const check = () => setIsSmallScreen(window.innerWidth < LG_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isSmallScreen) setSidebarOpen(false);
  }, [isSmallScreen]);

  // Prevent page reload when returning from background
  useEffect(() => {
    const handleVisibility = () => {
      // do nothing - prevent default reload behavior
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleNav = (value: string) => {
    setActiveTab(value);
    if (isSmallScreen) setSidebarOpen(false);
  };

  if (authLoading || merchantLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-12 w-48 mb-8 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user || !merchant) return null;

  const tabs = [
    { key: "overview", component: <DashboardOverview /> },
    { key: "ai-insights", component: <AIInsights /> },
    { key: "balance", component: <BalanceChanges /> },
    { key: "history", component: <TransactionHistory /> },
    { key: "bill-history", component: <BillHistory /> },
    { key: "smart-filter", component: <SmartFilter /> },
    { key: "sepay-sync", component: <SepaySync /> },
    { key: "branded-receipt", component: <BrandedReceiptSettings /> },
    { key: "store", component: <StoreSettings /> },
    { key: "products", component: <ProductsManagement /> },
    { key: "orders", component: <OrdersManagement /> },
    { key: "staff", component: <StaffManagement /> },
    { key: "customers", component: <CustomersCRM /> },
    { key: "vouchers", component: <VouchersManagement /> },
    { key: "voice", component: <VoiceAnnouncerSettings /> },
    { key: "account", component: <AccountSettings /> },
    { key: "settings", component: <BankSettings /> },
    { key: "bank-routing", component: <BankRoutingManager /> },
    { key: "create-link", component: <CreatePaymentLink /> },
    { key: "qr-static", component: <CreatePaymentLink isStatic /> },
    { key: "topup", component: <TopupBalance /> },
    { key: "gateway-rental", component: <GatewayRental /> },
    { key: "topup-rental", component: <TopupRentalCenter /> },
    { key: "integrations", component: <Integrations /> },
  ];

  const renderSidebarNav = () => (
    <div className="space-y-5">
      {navSections.map((section) => (
        <div key={section.label}>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((navItem) => {
              const isActive = activeTab === navItem.value;
              return (
                <button
                  key={navItem.value}
                  onClick={() => handleNav(navItem.value)}
                  className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-primary/15 to-transparent text-primary active-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <navItem.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{navItem.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="pt-4 border-t space-y-0.5">
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>Quản trị viên</span>
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="midnight-shell min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {isSmallScreen && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-display font-bold tracking-tight text-foreground hidden sm:inline">
                PAYGATE
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground ml-4">
              <span>Trang chủ</span>
              <span className="opacity-40">/</span>
              <span className="text-accent">
                {allNavItems.find(n => n.value === activeTab)?.label ?? "Tổng quan"}
              </span>
            </nav>
          </div>
          {isSmallScreen && (
            <span className="text-sm font-semibold text-foreground truncate">
              {allNavItems.find(n => n.value === activeTab)?.label}
            </span>
          )}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm text-foreground truncate max-w-[160px]">{merchant.business_name}</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Đăng xuất" className="rounded-xl">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 border-r border-border/60 bg-card min-h-[calc(100vh-65px)] sticky top-[65px] overflow-y-auto flex-col">
          <nav className="p-4 pt-5 flex-1">
            {renderSidebarNav()}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {isSmallScreen && sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed left-0 top-[57px] bottom-0 z-50 w-72 bg-card border-r shadow-2xl overflow-y-auto"
              >
                <div className="p-4">
                  <div className="mb-5 px-3 py-3 rounded-xl bg-muted/50">
                    <p className="font-semibold text-sm">{merchant.business_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  {renderSidebarNav()}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 xl:p-8 min-w-0">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={activeTab === tab.key ? "block animate-fade-in" : "hidden"}
            >
              {tab.component}
            </div>
          ))}
        </main>
      </div>
      <InstallPrompt />
    </div>
  );
};

export default Dashboard;
