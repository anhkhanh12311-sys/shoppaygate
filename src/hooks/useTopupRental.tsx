import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RentalDashboard = {
  subscription?: {
    plan_id: string;
    status: string;
    expires_at: string | null;
    tx_quota_used: number;
    tx_quota_limit: number | null;
    quota_reset_at: string | null;
    topup_callback_url: string | null;
    has_secret: boolean;
  };
  callbacks_total: number;
  callbacks_success: number;
  callbacks_failed: number;
  callbacks_pending_retry: number;
  today_topups: number;
  today_amount: number;
};

export type CallbackLog = {
  id: string;
  status: string;
  payload: any;
  response_code: number | null;
  response_body: string | null;
  retry_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
};

export const useTopupRental = () => {
  const [data, setData] = useState<RentalDashboard | null>(null);
  const [logs, setLogs] = useState<CallbackLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: d }, { data: l }] = await Promise.all([
      supabase.rpc("get_topup_rental_dashboard" as any),
      supabase.rpc("list_topup_callbacks" as any, { p_limit: 30, p_status: null }),
    ]);
    if (d) setData(d as any);
    setLogs((l as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const regenerateSecret = async () => {
    const { data, error } = await supabase.rpc("regenerate_topup_secret" as any);
    if (error) return toast.error(error.message);
    toast.success("Đã tạo bí mật mới");
    load();
    return data as string;
  };

  const updateCallbackUrl = async (url: string, secret: string) => {
    const { error } = await supabase.rpc("update_topup_config" as any, {
      p_callback_url: url, p_secret: secret,
    });
    if (error) return toast.error(error.message);
    toast.success("Đã lưu cấu hình");
    load();
  };

  const retryCallback = async (id: string) => {
    const { error } = await supabase.rpc("retry_topup_callback" as any, { p_callback_id: id });
    if (error) return toast.error(error.message);
    toast.success("Đã đặt lịch thử lại");
    load();
  };

  return { data, logs, loading, regenerateSecret, updateCallbackUrl, retryCallback, reload: load };
};
