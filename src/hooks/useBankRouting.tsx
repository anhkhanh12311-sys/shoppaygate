import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RoutingBank = {
  id: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  is_default: boolean;
  priority: number;
  daily_limit: number | null;
  current_daily_received: number;
  last_reset_date: string | null;
  auto_route_enabled: boolean;
  sepay_account_id: string | null;
  sepay_api_key: string | null;
  last_used_at: string | null;
};

export type RoutingStats = {
  total_banks: number;
  active_routing: number;
  linked_sepay: number;
  today_received: number;
};

export const useBankRouting = () => {
  const [banks, setBanks] = useState<RoutingBank[]>([]);
  const [stats, setStats] = useState<RoutingStats>({ total_banks: 0, active_routing: 0, linked_sepay: 0, today_received: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: s }] = await Promise.all([
      supabase.from("merchant_banks").select("*").order("priority", { ascending: true }),
      supabase.rpc("get_bank_routing_stats" as any),
    ]);
    setBanks((b as any) || []);
    if (s) setStats(s as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRouting = async (id: string, patch: { priority?: number; daily_limit?: number | null; auto_route_enabled?: boolean }) => {
    const { error } = await supabase.rpc("update_bank_routing" as any, {
      p_bank_id: id,
      p_priority: patch.priority ?? null,
      p_daily_limit: patch.daily_limit ?? null,
      p_auto_route: patch.auto_route_enabled ?? null,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const linkSepay = async (id: string, apiKey: string, accountId: string) => {
    const { error } = await supabase.rpc("link_bank_sepay" as any, {
      p_bank_id: id, p_sepay_api_key: apiKey, p_sepay_account_id: accountId,
    });
    if (error) return toast.error(error.message);
    toast.success("Đã liên kết SePay");
    load();
  };

  return { banks, stats, loading, updateRouting, linkSepay, reload: load };
};
