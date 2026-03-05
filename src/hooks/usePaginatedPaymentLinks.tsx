import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";

export interface PaymentLink {
  id: string;
  merchant_id: string;
  code: string;
  amount: number;
  description: string | null;
  status: "active" | "expired" | "completed";
  is_static: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Filters {
  status?: string;
  search?: string;
  isStatic?: boolean;
}

const PAGE_SIZE = 20;

export const usePaginatedPaymentLinks = (isStatic?: boolean) => {
  const { merchant } = useMerchant();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({});

  const fetchPage = useCallback(async (pageNum: number, currentFilters: Filters) => {
    if (!merchant) {
      setLinks([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("payment_links")
      .select("*", { count: "exact" })
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (isStatic !== undefined) {
      query = query.eq("is_static", isStatic);
    }
    if (currentFilters.status) {
      query = query.eq("status", currentFilters.status);
    }
    if (currentFilters.search) {
      query = query.or(`code.ilike.%${currentFilters.search}%,description.ilike.%${currentFilters.search}%`);
    }

    const { data, count, error } = await query;

    if (!error) {
      setLinks(data as PaymentLink[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [merchant, isStatic]);

  useEffect(() => {
    fetchPage(page, filters);
  }, [page, filters, fetchPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const updateFilters = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setPage(0);
  }, []);

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from("payment_links").delete().eq("id", id);
    if (!error) {
      fetchPage(page, filters);
    }
    return { error };
  };

  return {
    links,
    loading,
    page,
    setPage,
    totalPages,
    totalCount,
    filters,
    updateFilters,
    deleteLink,
    refetch: () => fetchPage(page, filters),
    pageSize: PAGE_SIZE,
  };
};
