import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Users, BarChart3, Settings, LogOut, Sparkles,
  Menu, X, Activity, Database, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import AdminUserManagement from "@/components/admin/AdminUserManagement";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const adminNavItems = [
  { value: "overview", label: "Tổng quan", icon: BarChart3 },
  { value: "users", label: "Người dùng", icon: Users },
  { value: "system", label: "Hệ thống", icon: Settings },
];

const Admin = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [merchants, setMerchants] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
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
    const [merchantsRes, txRes, rolesRes] = await Promise.all([
      supabase.from("merchants").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("*"),
    ]);
    setMerchants(merchantsRes.data || []);
    setTransactions(txRes.data || []);
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

  // Role management is now in AdminUserManagement component

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  // Stats
  const totalRevenue = transactions.filter(t => t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalMerchants = merchants.length;
  const totalTransactions = transactions.length;
  const completedTx = transactions.filter(t => t.status === "completed").length;

  const getUserRole = (authUserId: string) => {
    return userRoles.filter(r => r.user_id === authUserId).map(r => r.role);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Quản trị hệ thống</h1>
              <p className="text-muted-foreground">Tổng quan hoạt động của toàn bộ hệ thống</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Tổng doanh thu", value: formatCurrency(totalRevenue), icon: BarChart3, gradient: "from-primary to-secondary" },
                { title: "Merchants", value: totalMerchants, icon: Users, gradient: "from-success to-accent" },
                { title: "Giao dịch", value: totalTransactions, icon: Activity, gradient: "from-warning to-secondary" },
                { title: "Thành công", value: `${completedTx}/${totalTransactions}`, icon: Database, gradient: "from-accent to-primary" },
              ].map((stat, i) => (
                <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`} />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                        <stat.icon className="h-5 w-5 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dataLoading ? <Skeleton className="h-8 w-24" /> : stat.value}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Recent merchants */}
            <Card>
              <CardHeader>
                <CardTitle>Merchants gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ngân hàng</TableHead>
                        <TableHead>Quyền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants.slice(0, 5).map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.business_name}</TableCell>
                          <TableCell>{m.email}</TableCell>
                          <TableCell>{m.bank_name || "-"}</TableCell>
                          <TableCell>
                            {getUserRole(m.auth_user_id).map(r => (
                              <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">
                                {r}
                              </Badge>
                            ))}
                            {getUserRole(m.auth_user_id).length === 0 && <Badge variant="outline">user</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "users":
        return (
          <AdminUserManagement
            merchants={merchants}
            userRoles={userRoles}
            onRefresh={fetchData}
          />
        );

      case "system":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Cài đặt hệ thống</h1>
              <p className="text-muted-foreground">Cấu hình và quản lý hệ thống</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" /> Cơ sở dữ liệu
                  </CardTitle>
                  <CardDescription>Thống kê dữ liệu hệ thống</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Merchants</span>
                    <span className="font-medium">{totalMerchants}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Giao dịch</span>
                    <span className="font-medium">{totalTransactions}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Tỉ lệ thành công</span>
                    <span className="font-medium">
                      {totalTransactions > 0 ? Math.round((completedTx / totalTransactions) * 100) : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" /> API & Tích hợp
                  </CardTitle>
                  <CardDescription>Trạng thái các dịch vụ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">SePay API</span>
                    <Badge className="bg-success/20 text-success">Hoạt động</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">VietQR</span>
                    <Badge className="bg-success/20 text-success">Hoạt động</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Webhook</span>
                    <Badge className="bg-success/20 text-success">Hoạt động</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

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
