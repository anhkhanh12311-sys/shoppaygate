import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";
import { useQueryClient } from "@tanstack/react-query";

export interface Transaction {
  id: string;
  payment_link_id: string;
  merchant_id: string;
  amount: number;
  transfer_content: string | null;
  bank_reference: string | null;
  status: "pending" | "completed" | "failed" | "cancelled";
  paid_at: string | null;
  created_at: string;
}

interface Filters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

const PAGE_SIZE = 20;

export const usePaginatedTransactions = () => {
  const { merchant } = useMerchant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({});

  const fetchPage = useCallback(async (pageNum: number, currentFilters: Filters) => {
    if (!merchant) {
      setTransactions([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (currentFilters.status) {
      query = query.eq("status", currentFilters.status);
    }
    if (currentFilters.search) {
      query = query.or(`transfer_content.ilike.%${currentFilters.search}%,bank_reference.ilike.%${currentFilters.search}%`);
    }
    if (currentFilters.dateFrom) {
      query = query.gte("created_at", currentFilters.dateFrom);
    }
    if (currentFilters.dateTo) {
      query = query.lte("created_at", currentFilters.dateTo + "T23:59:59");
    }

    const { data, count, error } = await query;

    if (!error) {
      setTransactions(data as Transaction[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [merchant]);

  useEffect(() => {
    fetchPage(page, filters);
  }, [page, filters, fetchPage]);

  // Realtime subscription
  useEffect(() => {
    if (!merchant) return;
    const channel = supabase
      .channel("paginated-tx")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "transactions",
        filter: `merchant_id=eq.${merchant.id}`,
      }, () => {
        // Refresh current page on any change
        fetchPage(page, filters);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [merchant, page, filters, fetchPage]);

  // Fetch ALL transactions matching current filters (for export). Capped for safety.
  const fetchAllForExport = useCallback(async (max = 5000): Promise<Transaction[]> => {
    if (!merchant) return [];
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .limit(max);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.search) {
      query = query.or(`transfer_content.ilike.%${filters.search}%,bank_reference.ilike.%${filters.search}%`);
    }
    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo + "T23:59:59");
    }

    const { data, error } = await query;
    if (error) return [];
    return (data as Transaction[]) || [];
  }, [merchant, filters]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const updateFilters = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page
  }, []);

  // Quick stats (from count functions - server side)
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, totalAmount: 0, todayAmount: 0 });
  
  useEffect(() => {
    if (!merchant) return;
    // Fetch stats via a quick query
    const fetchStats = async () => {
      const [allRes, completedRes, pendingRes] = await Promise.all([
        supabase.from("transactions").select("amount", { count: "exact", head: false }).eq("merchant_id", merchant.id).eq("status", "completed"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("merchant_id", merchant.id).eq("status", "completed"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("merchant_id", merchant.id).eq("status", "pending"),
      ]);
      const totalAmount = allRes.data?.reduce((s: number, t: any) => s + t.amount, 0) || 0;
      setStats({
        total: totalCount,
        completed: completedRes.count || 0,
        pending: pendingRes.count || 0,
        totalAmount,
        todayAmount: 0, // Will use from overview
      });
    };
    fetchStats();
  }, [merchant, totalCount]);

  return {
    transactions,
    loading,
    page,
    setPage,
    totalPages,
    totalCount,
    filters,
    updateFilters,
    stats,
    refetch: () => fetchPage(page, filters),
    fetchAllForExport,
    pageSize: PAGE_SIZE,
  };
};
