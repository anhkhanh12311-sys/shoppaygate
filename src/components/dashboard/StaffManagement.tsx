import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Users, Shield, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Search, Eye, EyeOff, Link2, Store as StoreIcon,
  BarChart3, UserCog, Sparkles, AlertCircle, CheckCircle2, Clock,
  Mail, Copy, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStaffManagement, StaffPermissions } from "@/hooks/useStaffManagement";

const PERMISSION_GROUPS: {
  group: string;
  icon: typeof Eye;
  permissions: { key: keyof StaffPermissions; label: string; desc: string; icon: typeof Eye }[];
}[] = [
  {
    group: "Xem & Báo cáo",
    icon: Eye,
    permissions: [
      { key: "view_transactions", label: "Xem giao dịch", desc: "Xem lịch sử giao dịch & biến động số dư", icon: Eye },
      { key: "view_reports", label: "Xem báo cáo", desc: "Xem thống kê doanh thu & biểu đồ", icon: BarChart3 },
    ],
  },
  {
    group: "Vận hành",
    icon: Link2,
    permissions: [
      { key: "create_payment_links", label: "Tạo link thanh toán", desc: "Tạo & quản lý link thanh toán, QR code", icon: Link2 },
      { key: "manage_store", label: "Quản lý cửa hàng", desc: "Chỉnh sửa thông tin & giao diện cửa hàng", icon: StoreIcon },
    ],
  },
  {
    group: "Quản trị",
    icon: UserCog,
    permissions: [
      { key: "manage_staff", label: "Quản lý nhân viên", desc: "Mời, sửa quyền, xóa nhân viên khác", icon: UserCog },
    ],
  },
];

const ROLE_PRESETS: { name: string; desc: string; permissions: StaffPermissions }[] = [
  {
    name: "👁️ Chỉ xem",
    desc: "Chỉ xem giao dịch và báo cáo",
    permissions: { view_transactions: true, create_payment_links: false, manage_store: false, view_reports: true, manage_staff: false },
  },
  {
    name: "💼 Nhân viên bán hàng",
    desc: "Xem GD, tạo link thanh toán",
    permissions: { view_transactions: true, create_payment_links: true, manage_store: false, view_reports: true, manage_staff: false },
  },
  {
    name: "🏪 Quản lý cửa hàng",
    desc: "Toàn quyền trừ quản lý nhân viên",
    permissions: { view_transactions: true, create_payment_links: true, manage_store: true, view_reports: true, manage_staff: false },
  },
  {
    name: "⭐ Quản lý cao cấp",
    desc: "Toàn quyền bao gồm quản lý nhân viên",
    permissions: { view_transactions: true, create_payment_links: true, manage_store: true, view_reports: true, manage_staff: true },
  },
];

const StaffManagement = () => {
  const { staff, loading, inviteStaff, updatePermissions, updateStatus, removeStaff, DEFAULT_PERMISSIONS } = useStaffManagement();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [perms, setPerms] = useState<StaffPermissions>({ ...DEFAULT_PERMISSIONS });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    const ok = await inviteStaff(email.trim(), displayName.trim() || email.trim(), perms);
    if (ok) {
      setInviteOpen(false);
      setEmail("");
      setDisplayName("");
      setPerms({ ...DEFAULT_PERMISSIONS });
    }
    setSubmitting(false);
  };

  const togglePerm = (staffId: string, currentPerms: StaffPermissions, key: keyof StaffPermissions) => {
    updatePermissions(staffId, { ...currentPerms, [key]: !currentPerms[key] });
  };

  const applyPreset = (preset: StaffPermissions) => setPerms({ ...preset });

  const getPermCount = (p: StaffPermissions) => Object.values(p).filter(Boolean).length;
  const totalPerms = 5;

  const filteredStaff = staff.filter(
    (m) =>
      m.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = staff.filter((s) => s.status === "active").length;
  const invitedCount = staff.filter((s) => s.status === "invited").length;
  const disabledCount = staff.filter((s) => s.status === "disabled").length;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active": return { badge: "bg-success/15 text-success border-success/30", icon: CheckCircle2, text: "Hoạt động" };
      case "invited": return { badge: "bg-warning/15 text-warning border-warning/30", icon: Clock, text: "Đã mời" };
      case "disabled": return { badge: "bg-muted text-muted-foreground", icon: EyeOff, text: "Vô hiệu" };
      default: return { badge: "", icon: AlertCircle, text: status };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Quản lý nhân viên</h1>
              <p className="text-muted-foreground text-sm">Mời nhân viên và phân quyền chi tiết</p>
            </div>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2">
                <UserPlus className="h-4 w-4" /> Mời nhân viên
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Mời nhân viên mới
                </DialogTitle>
                <DialogDescription>Nhập thông tin và chọn quyền hạn cho nhân viên</DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tên hiển thị</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tên nhân viên" />
                  </div>
                </div>

                {/* Role presets */}
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /> Mẫu quyền nhanh</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset.permissions)}
                        className="p-2.5 rounded-lg border text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <p className="text-sm font-medium">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Detailed permissions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Quyền hạn chi tiết</Label>
                    <Badge variant="outline" className="text-xs">{getPermCount(perms)}/{totalPerms}</Badge>
                  </div>
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.group} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.group}</p>
                      {group.permissions.map(({ key, label, desc, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${perms[key] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{label}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                          <Switch checked={perms[key]} onCheckedChange={() => setPerms((p) => ({ ...p, [key]: !p[key] }))} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Hủy</Button>
                <Button onClick={handleInvite} disabled={submitting || !email.trim()} className="gradient-primary text-primary-foreground">
                  {submitting ? "Đang mời..." : "Gửi lời mời"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Tổng nhân viên", value: staff.length, color: "text-primary" },
            { label: "Đang hoạt động", value: activeCount, color: "text-success" },
            { label: "Đã mời", value: invitedCount, color: "text-warning" },
            { label: "Vô hiệu", value: disabledCount, color: "text-muted-foreground" },
          ].map((stat) => (
            <Card key={stat.label} className="gradient-card border-primary/5">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách nhân viên</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-14 w-14 mx-auto mb-4 text-muted-foreground/30" />
              <p className="font-medium">{searchQuery ? "Không tìm thấy nhân viên" : "Chưa có nhân viên nào"}</p>
              <p className="text-sm mt-1">{searchQuery ? "Thử tìm với từ khóa khác" : "Bấm \"Mời nhân viên\" để bắt đầu"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((member, idx) => {
                const statusConfig = getStatusConfig(member.status);
                const StatusIcon = statusConfig.icon;
                const permCount = getPermCount(member.permissions);

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <button
                      onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                          {member.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{member.display_name}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs hidden sm:flex">{permCount}/{totalPerms} quyền</Badge>
                        <Badge variant="outline" className={`text-xs ${statusConfig.badge}`}>
                          <StatusIcon className="h-3 w-3 mr-1" /> {statusConfig.text}
                        </Badge>
                        {expandedId === member.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedId === member.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t"
                        >
                          <div className="p-4 space-y-4">
                            {/* Permission progress */}
                            <div className="flex items-center gap-3">
                              <Shield className="h-4 w-4 text-primary shrink-0" />
                              <div className="flex-1">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-medium">Quyền hạn</span>
                                  <span className="text-muted-foreground">{permCount}/{totalPerms}</span>
                                </div>
                                <Progress value={(permCount / totalPerms) * 100} className="h-2" />
                              </div>
                            </div>

                            {/* Permission toggles */}
                            <div className="grid gap-2 sm:grid-cols-2">
                              {PERMISSION_GROUPS.flatMap((g) => g.permissions).map(({ key, label, icon: Icon }) => (
                                <div key={key} className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${member.permissions[key] ? "bg-primary/5 border border-primary/20" : "bg-muted/50"}`}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${member.permissions[key] ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className="text-sm">{label}</span>
                                  </div>
                                  <Switch
                                    checked={member.permissions[key]}
                                    onCheckedChange={() => togglePerm(member.id, member.permissions, key)}
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              {member.status === "disabled" ? (
                                <Button size="sm" variant="outline" onClick={() => updateStatus(member.id, "active")} className="gap-1.5">
                                  <ToggleRight className="h-4 w-4" /> Kích hoạt
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => updateStatus(member.id, "disabled")} className="gap-1.5">
                                  <ToggleLeft className="h-4 w-4" /> Vô hiệu hóa
                                </Button>
                              )}
                              <Button size="sm" variant="destructive" onClick={() => setDeleteId(member.id)} className="gap-1.5">
                                <Trash2 className="h-4 w-4" /> Xóa
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nhân viên</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { removeStaff(deleteId); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground">
              Xóa nhân viên
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffManagement;
