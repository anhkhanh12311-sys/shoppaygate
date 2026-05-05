import { useState, useEffect, useCallback } from "react";
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

export const usePaymentLinks = () => {
  const { merchant } = useMerchant();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentLinks = useCallback(async () => {
    if (!merchant) {
      setPaymentLinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("payment_links")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setPaymentLinks(data as PaymentLink[]);
    }
    setLoading(false);
  }, [merchant]);

  useEffect(() => {
    fetchPaymentLinks();
  }, [fetchPaymentLinks]);

  const createPaymentLink = async (
    amount: number,
    description: string,
    isStatic: boolean = false,
    expiresAt?: Date
  ) => {
    if (!merchant) return { error: new Error("No merchant found") };

    const code = generateCode(isStatic);
    
    const { data, error } = await supabase
      .from("payment_links")
      .insert({
        merchant_id: merchant.id,
        code,
        amount,
        description,
        is_static: isStatic,
        expires_at: expiresAt?.toISOString() || null,
      })
      .select()
      .single();

    if (!error && data) {
      setPaymentLinks((prev) => [data as PaymentLink, ...prev]);
    }

    return { data, error };
  };

  const deletePaymentLink = async (id: string) => {
    const { error } = await supabase
      .from("payment_links")
      .delete()
      .eq("id", id);

    if (!error) {
      setPaymentLinks((prev) => prev.filter((link) => link.id !== id));
    }

    return { error };
  };

  return { paymentLinks, loading, error, createPaymentLink, deletePaymentLink, refetch: fetchPaymentLinks };
};

// Generate a cryptographically secure unique code (12 chars)
const generateCode = (_isStatic: boolean): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  let code = "PG-";
  for (let i = 0; i < 12; i++) code += chars[array[i] % chars.length];
  return code;
};
