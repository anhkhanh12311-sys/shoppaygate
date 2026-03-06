import { useState } from "react";
import { UserPlus, Users, Shield, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useStaffManagement, StaffPermissions } from "@/hooks/useStaffManagement";
import { motion, AnimatePresence } from "framer-motion";

const PERMISSION_LABELS: Record<keyof StaffPermissions, { label: string; desc: string }> = {
  view_transactions: { label: "Xem giao dịch", desc: "Xem lịch sử & biến động số dư" },
  create_payment_links: { label: "Tạo link thanh toán", desc: "Tạo & quản lý link thanh toán" },
  manage_store: { label: "Quản lý cửa hàng", desc: "Chỉnh sửa thông tin cửa hàng" },
  view_reports: { label: "Xem báo cáo", desc: "Xem thống kê & biểu đồ doanh thu" },
  manage_staff: { label: "Quản lý nhân viên", desc: "Mời, sửa quyền, xóa nhân viên khác" },
};

const StaffManagement = () => {
  const { staff, loading, inviteStaff, updatePermissions, updateStatus, removeStaff, DEFAULT_PERMISSIONS } = useStaffManagement();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [perms, setPerms] = useState<StaffPermissions>({ ...DEFAULT_PERMISSIONS });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const updated = { ...currentPerms, [key]: !currentPerms[key] };
    updatePermissions(staffId, updated);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-success/20 text-success">Hoạt động</Badge>;
      case "invited": return <Badge className="bg-warning/20 text-warning">Đã mời</Badge>;
      case "disabled": return <Badge variant="secondary">Vô hiệu</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Quản lý nhân viên
          </h1>
          <p className="text-muted-foreground text-sm">Mời nhân viên và phân quyền chi tiết cho từng người</p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <UserPlus className="h-4 w-4 mr-2" /> Mời nhân viên
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mời nhân viên mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <Label>Tên hiển thị</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tên nhân viên" />
              </div>
              <div className="space-y-3">
                <Label className="flex items-center gap-2"><Shield className="h-4 w-4" /> Quyền hạn</Label>
                {(Object.keys(PERMISSION_LABELS) as (keyof StaffPermissions)[]).map(key => (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{PERMISSION_LABELS[key].label}</p>
                      <p className="text-xs text-muted-foreground">{PERMISSION_LABELS[key].desc}</p>
                    </div>
                    <Switch checked={perms[key]} onCheckedChange={() => setPerms(p => ({ ...p, [key]: !p[key] }))} />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Hủy</Button>
              <Button onClick={handleInvite} disabled={submitting || !email.trim()}>
                {submitting ? "Đang mời..." : "Gửi lời mời"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách nhân viên ({staff.length})</CardTitle>
          <CardDescription>Nhấn vào hàng để mở rộng chi tiết quyền hạn</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Chưa có nhân viên nào. Bấm "Mời nhân viên" để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {staff.map((member) => (
                <div key={member.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {member.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{member.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(member.status)}
                      {expandedId === member.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedId === member.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t"
                      >
                        <div className="p-4 space-y-3">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" /> Quyền hạn
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(Object.keys(PERMISSION_LABELS) as (keyof StaffPermissions)[]).map(key => (
                              <div key={key} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                                <span className="text-sm">{PERMISSION_LABELS[key].label}</span>
                                <Switch
                                  checked={member.permissions[key]}
                                  onCheckedChange={() => togglePerm(member.id, member.permissions, key)}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            {member.status === "disabled" ? (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(member.id, "active")}>
                                <ToggleRight className="h-4 w-4 mr-1" /> Kích hoạt
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(member.id, "disabled")}>
                                <ToggleLeft className="h-4 w-4 mr-1" /> Vô hiệu hóa
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => removeStaff(member.id)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Xóa
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffManagement;
