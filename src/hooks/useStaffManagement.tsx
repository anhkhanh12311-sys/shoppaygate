import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";
import { toast } from "sonner";

export interface StaffPermissions {
  view_transactions: boolean;
  create_payment_links: boolean;
  manage_store: boolean;
  view_reports: boolean;
  manage_staff: boolean;
}

export interface StaffMember {
  id: string;
  merchant_id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  permissions: StaffPermissions;
  status: "invited" | "active" | "disabled";
  invited_at: string;
  joined_at: string | null;
  created_at: string;
}

const DEFAULT_PERMISSIONS: StaffPermissions = {
  view_transactions: true,
  create_payment_links: false,
  manage_store: false,
  view_reports: false,
  manage_staff: false,
};

export const useStaffManagement = () => {
  const { merchant } = useMerchant();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("merchant_staff")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });

    if (!error) setStaff((data || []) as StaffMember[]);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const inviteStaff = async (email: string, displayName: string, permissions: StaffPermissions) => {
    if (!merchant) return false;
    const { error } = await supabase.from("merchant_staff").insert({
      merchant_id: merchant.id,
      email,
      display_name: displayName,
      permissions: permissions as any,
      status: "invited",
    });
    if (error) {
      if (error.code === "23505") toast.error("Email này đã được mời!");
      else toast.error("Lỗi: " + error.message);
      return false;
    }
    toast.success("Đã mời nhân viên thành công!");
    fetchStaff();
    return true;
  };

  const updatePermissions = async (staffId: string, permissions: StaffPermissions) => {
    const { error } = await supabase
      .from("merchant_staff")
      .update({ permissions: permissions as any })
      .eq("id", staffId);
    if (error) { toast.error("Lỗi cập nhật quyền"); return false; }
    toast.success("Đã cập nhật quyền!");
    fetchStaff();
    return true;
  };

  const updateStatus = async (staffId: string, status: string) => {
    const { error } = await supabase
      .from("merchant_staff")
      .update({ status })
      .eq("id", staffId);
    if (error) { toast.error("Lỗi cập nhật trạng thái"); return false; }
    toast.success("Đã cập nhật!");
    fetchStaff();
    return true;
  };

  const removeStaff = async (staffId: string) => {
    const { error } = await supabase
      .from("merchant_staff")
      .delete()
      .eq("id", staffId);
    if (error) { toast.error("Lỗi xóa nhân viên"); return false; }
    toast.success("Đã xóa nhân viên!");
    fetchStaff();
    return true;
  };

  return {
    staff, loading, inviteStaff, updatePermissions, updateStatus, removeStaff, refetch: fetchStaff,
    DEFAULT_PERMISSIONS,
  };
};
