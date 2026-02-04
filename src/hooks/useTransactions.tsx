import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";

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

export const useTransactions = () => {
  const { merchant } = useMerchant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!merchant) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  }, [merchant]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!merchant) return;

    const channel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `merchant_id=eq.${merchant.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTransactions((prev) => [payload.new as Transaction, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTransactions((prev) =>
              prev.map((t) =>
                t.id === (payload.new as Transaction).id
                  ? (payload.new as Transaction)
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTransactions((prev) =>
              prev.filter((t) => t.id !== (payload.old as Transaction).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchant]);

  // Stats
  const stats = {
    total: transactions.length,
    completed: transactions.filter((t) => t.status === "completed").length,
    pending: transactions.filter((t) => t.status === "pending").length,
    totalAmount: transactions
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0),
    todayAmount: transactions
      .filter(
        (t) =>
          t.status === "completed" &&
          new Date(t.paid_at || t.created_at).toDateString() ===
            new Date().toDateString()
      )
      .reduce((sum, t) => sum + t.amount, 0),
  };

  return { transactions, loading, error, stats, refetch: fetchTransactions };
};
