import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";

export type BillChannel = "zalo" | "sms" | "email" | "link" | "print";

export interface BillShare {
  id: string;
  merchant_id: string;
  transaction_id: string | null;
  channel: BillChannel;
  recipient: string | null;
  created_at: string;
}

export const useBillShares = (filter?: { from?: string; to?: string; channel?: BillChannel | "all" }) => {
  const { merchant } = useMerchant();
  const [shares, setShares] = useState<BillShare[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShares = useCallback(async () => {
    if (!merchant) {
      setShares([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("bill_shares" as any)
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (filter?.from) q = q.gte("created_at", filter.from);
    if (filter?.to) q = q.lte("created_at", filter.to);
    if (filter?.channel && filter.channel !== "all") q = q.eq("channel", filter.channel);

    const { data } = await q;
    setShares((data as unknown as BillShare[]) ?? []);
    setLoading(false);
  }, [merchant, filter?.from, filter?.to, filter?.channel]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const logShare = async (channel: BillChannel, transactionId?: string, recipient?: string) => {
    if (!merchant) return;
    await supabase.from("bill_shares" as any).insert({
      merchant_id: merchant.id,
      transaction_id: transactionId ?? null,
      channel,
      recipient: recipient ?? null,
    });
    fetchShares();
  };

  // Stats
  const todayStr = new Date().toDateString();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const stats = {
    today: shares.filter((s) => new Date(s.created_at).toDateString() === todayStr).length,
    week: shares.filter((s) => new Date(s.created_at).getTime() >= weekAgo).length,
    total: shares.length,
    topChannel: ((): BillChannel | null => {
      const c: Record<string, number> = {};
      shares.forEach((s) => { c[s.channel] = (c[s.channel] || 0) + 1; });
      const entries = Object.entries(c).sort((a, b) => b[1] - a[1]);
      return (entries[0]?.[0] as BillChannel) ?? null;
    })(),
  };

  return { shares, loading, stats, logShare, refetch: fetchShares };
};
