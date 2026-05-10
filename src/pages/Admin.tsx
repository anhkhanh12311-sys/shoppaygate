import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Users, BarChart3, Settings, LogOut,
  Menu, X, Activity, Database, Globe, Receipt,
  Package, CreditCard, Store, Wallet, Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminTransactions from "@/components/admin/AdminTransactions";
import AdminPlans from "@/components/admin/AdminPlans";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminStores from "@/components/admin/AdminStores";
import AdminBalances from "@/components/admin/AdminBalances";
import AdminSystemSettings from "@/components/admin/AdminSystemSettings";
import AdminMerchantCallbacks from "@/components/admin/AdminMerchantCallbacks";

const adminNavItems = [
  { value: "overview", label: "Tổng quan", icon: BarChart3 },
  { value: "transactions", label: "Giao dịch", icon: Receipt },
  { value: "users", label: "Người dùng", icon: Users },
  { value: "balances", label: "Số dư", icon: Wallet },
  { value: "plans", label: "Gói cước", icon: Package },
  { value: "subscriptions", label: "Đăng ký gói", icon: CreditCard },
  { value: "callbacks", label: "Callback merchant", icon: Webhook },
  { value: "stores", label: "Cửa hàng", icon: Store },
  { value: "system", label: "Hệ thống", icon: Settings },
];

const Admin = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data for user management
  const [merchants, setMerchants] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [user, authLoading, isAdmin, roleLoading, navigate]);

  const fetchData = async () => {
    setDataLoading(true);
    const [merchantsRes, rolesRes] = await Promise.all([
      supabase.from("merchants").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    setMerchants(merchantsRes.data || []);
    setUserRoles(rolesRes.data || []);
    setDataLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  const handleNav = (value: string) => {
    setActiveTab(value);
    if (isMobile) setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <AdminOverview />;
      case "transactions":
        return <AdminTransactions />;
      case "users":
        return (
          <AdminUserManagement
            merchants={merchants}
            userRoles={userRoles}
            onRefresh={fetchData}
          />
        );
      case "balances":
        return <AdminBalances />;
      case "plans":
        return <AdminPlans />;
      case "subscriptions":
        return <AdminSubscriptions />;
      case "stores":
        return <AdminStores />;
      case "system":
        return <AdminSystemSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 glass border-b">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary hidden sm:inline">
                Admin Panel
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Đăng xuất">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-60 border-r bg-card min-h-[calc(100vh-57px)] sticky top-[57px]">
          <nav className="p-4 space-y-1">
            {adminNavItems.map(item => (
              <button
                key={item.value}
                onClick={() => handleNav(item.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === item.value
                    ? "gradient-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

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
              <nav className="p-4 space-y-1">
                {adminNavItems.map(item => (
                  <button
                    key={item.value}
                    onClick={() => handleNav(item.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      activeTab === item.value
                        ? "gradient-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}

        <main className="flex-1 p-4 lg:p-8 min-w-0">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {renderContent()}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
