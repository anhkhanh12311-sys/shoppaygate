import { useState } from "react";
import { Search, UserCheck, UserX, MoreHorizontal, Ban, Trash2, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdminUserManagementProps {
  merchants: any[];
  userRoles: any[];
  onRefresh: () => void;
}

const AdminUserManagement = ({ merchants, userRoles, onRefresh }: AdminUserManagementProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialog, setEditDialog] = useState<{ open: boolean; merchant: any | null }>({ open: false, merchant: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; merchant: any | null }>({ open: false, merchant: null });
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const getUserRoles = (authUserId: string) => {
    return userRoles.filter(r => r.user_id === authUserId).map(r => r.role);
  };

  const filteredMerchants = merchants.filter(m =>
    m.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const assignRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } else {
      toast({ title: "Thành công", description: "Đã cập nhật quyền" });
      onRefresh();
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete()
      .eq("user_id", userId).eq("role", role as any);
    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } else {
      toast({ title: "Thành công", description: "Đã xóa quyền" });
      onRefresh();
    }
  };

  const openEdit = (merchant: any) => {
    setEditName(merchant.business_name || "");
    setEditPhone(merchant.phone || "");
    setEditDialog({ open: true, merchant });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.merchant) return;
    setSaving(true);
    const { error } = await supabase
      .from("merchants")
      .update({ business_name: editName, phone: editPhone || null })
      .eq("id", editDialog.merchant.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } else {
      toast({ title: "Thành công", description: "Đã cập nhật thông tin thành viên" });
      setEditDialog({ open: false, merchant: null });
      onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.merchant) return;
    setSaving(true);
    // Delete merchant and related data
    const merchantId = deleteDialog.merchant.id;
    const authUserId = deleteDialog.merchant.auth_user_id;

    // Delete transactions, payment_links, merchant_banks, user_roles, then merchant
    await supabase.from("transactions").delete().eq("merchant_id", merchantId);
    await supabase.from("payment_links").delete().eq("merchant_id", merchantId);
    await supabase.from("merchant_banks").delete().eq("merchant_id", merchantId);
    await supabase.from("user_roles").delete().eq("user_id", authUserId);
    const { error } = await supabase.from("merchants").delete().eq("id", merchantId);

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } else {
      toast({ title: "Đã xóa", description: "Đã xóa thành viên khỏi hệ thống" });
      setDeleteDialog({ open: false, merchant: null });
      onRefresh();
    }
  };

  const handleLock = async (merchant: any) => {
    // Lock = remove all roles (effectively making them a basic user with no privileges)
    const roles = getUserRoles(merchant.auth_user_id);
    for (const role of roles) {
      await supabase.from("user_roles").delete()
        .eq("user_id", merchant.auth_user_id).eq("role", role as any);
    }
    toast({ title: "Đã khóa", description: `Đã khóa tài khoản ${merchant.business_name}` });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý người dùng</h1>
          <p className="text-muted-foreground">Quản lý, phân quyền, khóa và xóa thành viên</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên cửa hàng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">SĐT</TableHead>
                  <TableHead>Quyền</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchants.map(m => {
                  const roles = getUserRoles(m.auth_user_id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.business_name}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{m.phone || "-"}</TableCell>
                      <TableCell>
                        {roles.map(r => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">
                            {r}
                          </Badge>
                        ))}
                        {roles.length === 0 && <Badge variant="outline">user</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(m)}>
                              <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa thông tin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!roles.includes("admin") && (
                              <DropdownMenuItem onClick={() => assignRole(m.auth_user_id, "admin")}>
                                <UserCheck className="mr-2 h-4 w-4" /> Cấp quyền Admin
                              </DropdownMenuItem>
                            )}
                            {!roles.includes("moderator") && (
                              <DropdownMenuItem onClick={() => assignRole(m.auth_user_id, "moderator")}>
                                <UserCheck className="mr-2 h-4 w-4" /> Cấp quyền Moderator
                              </DropdownMenuItem>
                            )}
                            {roles.includes("admin") && (
                              <DropdownMenuItem onClick={() => removeRole(m.auth_user_id, "admin")} className="text-destructive">
                                <UserX className="mr-2 h-4 w-4" /> Xóa quyền Admin
                              </DropdownMenuItem>
                            )}
                            {roles.includes("moderator") && (
                              <DropdownMenuItem onClick={() => removeRole(m.auth_user_id, "moderator")} className="text-destructive">
                                <UserX className="mr-2 h-4 w-4" /> Xóa quyền Moderator
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleLock(m)} className="text-yellow-600">
                              <Ban className="mr-2 h-4 w-4" /> Khóa tài khoản
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, merchant: m })} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Xóa thành viên
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => setEditDialog({ open: o, merchant: o ? editDialog.merchant : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin</DialogTitle>
            <DialogDescription>Cập nhật thông tin cho {editDialog.merchant?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Tên cửa hàng</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Số điện thoại</label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1" placeholder="0901234567" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, merchant: null })}>Hủy</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ open: o, merchant: o ? deleteDialog.merchant : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn tài khoản <strong>{deleteDialog.merchant?.business_name}</strong> ({deleteDialog.merchant?.email}) cùng toàn bộ dữ liệu liên quan. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserManagement;
