import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { toast } from "sonner";

export type CustomerTag = "new" | "regular" | "vip" | "blocked";

export interface Customer {
  id: string;
  merchant_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  tag: CustomerTag;
  notes: string | null;
  total_spent: number;
  tx_count: number;
  last_paid_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerStats {
  total: number;
  vip: number;
  new_month: number;
  total_spent: number;
}

export const useCustomers = () => {
  const { merchant } = useMerchant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({ total: 0, vip: 0, new_month: 0, total_spent: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const [{ data: list }, { data: st }] = await Promise.all([
      supabase.from("customers").select("*").eq("merchant_id", merchant.id).order("updated_at", { ascending: false }),
      supabase.rpc("get_customer_stats"),
    ]);
    setCustomers((list as Customer[]) || []);
    if (st) setStats(st as unknown as CustomerStats);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upsert = async (payload: {
    id?: string;
    full_name?: string;
    phone?: string;
    email?: string;
    tag?: CustomerTag;
    notes?: string;
  }) => {
    if (!merchant) return;
    if (payload.id) {
      const { error } = await supabase.from("customers").update({
        full_name: payload.full_name,
        phone: payload.phone || null,
        email: payload.email || null,
        tag: payload.tag,
        notes: payload.notes,
      }).eq("id", payload.id);
      if (error) return toast.error(error.message);
      toast.success("Đã cập nhật khách hàng");
    } else {
      const { error } = await supabase.rpc("upsert_customer_manual", {
        p_full_name: payload.full_name || null,
        p_phone: payload.phone || null,
        p_email: payload.email || null,
        p_tag: payload.tag || "new",
        p_notes: payload.notes || null,
      });
      if (error) return toast.error(error.message);
      toast.success("Đã thêm khách hàng");
    }
    fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xoá");
    fetchAll();
  };

  const syncFromTransactions = async () => {
    setSyncing(true);
    const { data, error } = await supabase.rpc("sync_customers_from_transactions");
    setSyncing(false);
    if (error) return toast.error(error.message);
    toast.success(`Đã gom thêm ${data ?? 0} khách từ giao dịch`);
    fetchAll();
  };

  return { customers, stats, loading, syncing, fetchAll, upsert, remove, syncFromTransactions };
};
