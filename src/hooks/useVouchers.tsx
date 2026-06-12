import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Voucher = {
  id: string;
  merchant_id: string;
  code: string;
  name: string | null;
  type: "percent" | "fixed" | "freeship";
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  per_customer_limit: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
};

export type VoucherStats = {
  total: number;
  active: number;
  redemptions: number;
  total_discount: number;
};

export const useVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<VoucherStats>({ total: 0, active: 0, redemptions: 0, total_discount: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: v }, { data: s }] = await Promise.all([
      (supabase as any).from("vouchers").select("*").order("created_at", { ascending: false }),
      supabase.rpc("get_voucher_stats" as any),
    ]);
    setVouchers((v as Voucher[]) || []);
    if (s) setStats(s as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (payload: Partial<Voucher>) => {
    const { data: m } = await supabase.from("merchants").select("id").eq("auth_user_id", (await supabase.auth.getUser()).data.user!.id).single();
    if (!m) return;
    const { error } = await (supabase as any).from("vouchers").insert({ ...payload, merchant_id: m.id, code: payload.code?.toUpperCase() });
    if (error) return toast.error(error.message);
    toast.success("Đã tạo voucher");
    load();
  };

  const update = async (id: string, patch: Partial<Voucher>) => {
    const { error } = await (supabase as any).from("vouchers").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("vouchers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xoá");
    load();
  };

  return { vouchers, stats, loading, create, update, remove, reload: load };
};
