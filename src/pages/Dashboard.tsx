import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, LayoutDashboard, Settings, Link2, QrCode,
  History, LogOut, Webhook, User, Menu, X, Shield, Store,
  Activity, Filter, Users,
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
import WebhookSettings from "@/components/dashboard/WebhookSettings";
import AccountSettings from "@/components/dashboard/AccountSettings";
import StoreSettings from "@/components/dashboard/StoreSettings";
import BalanceChanges from "@/components/dashboard/BalanceChanges";
import SmartFilter from "@/components/dashboard/SmartFilter";
import StaffManagement from "@/components/dashboard/StaffManagement";

const navSections = [
  {
    label: "Chính",
    items: [
      { value: "overview", label: "Tổng quan", icon: LayoutDashboard },
      { value: "balance", label: "Biến động số dư", icon: Activity },
      { value: "history", label: "Lịch sử GD", icon: History },
      { value: "smart-filter", label: "Lọc thông minh", icon: Filter },
    ],
  },
  {
    label: "Thanh toán",
    items: [
      { value: "create-link", label: "Tạo link", icon: Link2 },
      { value: "qr-static", label: "QR tĩnh", icon: QrCode },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { value: "store", label: "Cửa hàng", icon: Store },
      { value: "staff", label: "Nhân viên", icon: Users },
      { value: "settings", label: "Ngân hàng", icon: Settings },
      { value: "account", label: "Tài khoản", icon: User },
      { value: "webhook", label: "Webhook", icon: Webhook },
    ],
  },
];

const allNavItems = navSections.flatMap(s => s.items);

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { merchant, loading: merchantLoading } = useMerchant();
  const { isAdmin } = useUserRole();
  useRealtimeNotifications();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleNav = (value: string) => {
    setActiveTab(value);
    if (isMobile) setSidebarOpen(false);
  };

  if (authLoading || merchantLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user || !merchant) return null;

  const tabs = [
    { key: "overview", component: <DashboardOverview /> },
    { key: "balance", component: <BalanceChanges /> },
    { key: "history", component: <TransactionHistory /> },
    { key: "smart-filter", component: <SmartFilter /> },
    { key: "store", component: <StoreSettings /> },
    { key: "staff", component: <StaffManagement /> },
    { key: "account", component: <AccountSettings /> },
    { key: "settings", component: <BankSettings /> },
    { key: "create-link", component: <CreatePaymentLink /> },
    { key: "qr-static", component: <CreatePaymentLink isStatic /> },
    { key: "webhook", component: <WebhookSettings /> },
  ];

  const renderSidebarNav = () => (
    <>
      {navSections.map((section) => (
        <div key={section.label} className="mb-4">
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <button
                key={item.value}
                onClick={() => handleNav(item.value)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === item.value
                    ? "gradient-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="pt-3 border-t space-y-0.5">
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>Quản trị viên</span>
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary hidden sm:inline">
                PayGate
              </span>
            </Link>
          </div>
          {/* Mobile tab indicator */}
          {isMobile && (
            <span className="text-sm font-medium text-foreground">
              {allNavItems.find(n => n.value === activeTab)?.label}
            </span>
          )}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-medium text-sm">{merchant.business_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Đăng xuất">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 border-r bg-card min-h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto">
          <nav className="p-3">
            {renderSidebarNav()}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        {isMobile && sidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-[57px] bottom-0 z-50 w-72 bg-card border-r shadow-xl overflow-y-auto"
            >
              <div className="p-4">
                <div className="mb-4 px-3">
                  <p className="font-medium text-sm">{merchant.business_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                {renderSidebarNav()}
              </div>
            </motion.aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 min-w-0">
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
    </div>
  );
};

export default Dashboard;
