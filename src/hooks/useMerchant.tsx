import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Merchant {
  id: string;
  auth_user_id: string;
  business_name: string;
  email: string;
  phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  webhook_url: string | null;
  webhook_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

export const useMerchant = () => {
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMerchant(null);
      setLoading(false);
      return;
    }

    const fetchMerchant = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else {
        setMerchant(data);
      }
      setLoading(false);
    };

    fetchMerchant();
  }, [user]);

  const updateMerchant = async (updates: Partial<Merchant>) => {
    if (!merchant) return { error: new Error("No merchant found") };

    const { data, error } = await supabase
      .from("merchants")
      .update(updates)
      .eq("id", merchant.id)
      .select()
      .single();

    if (!error && data) {
      setMerchant(data);
    }

    return { data, error };
  };

  return { merchant, loading, error, updateMerchant };
};
