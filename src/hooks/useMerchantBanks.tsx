import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";

export interface MerchantBank {
  id: string;
  merchant_id: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useMerchantBanks = () => {
  const { merchant } = useMerchant();
  const [banks, setBanks] = useState<MerchantBank[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBanks = useCallback(async () => {
    if (!merchant) { setBanks([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("merchant_banks")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("is_default", { ascending: false });
    setBanks((data as MerchantBank[]) || []);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  const addBank = async (bank: Omit<MerchantBank, "id" | "merchant_id" | "created_at" | "updated_at">) => {
    if (!merchant) return { error: new Error("No merchant") };
    const { data, error } = await supabase
      .from("merchant_banks")
      .insert({ ...bank, merchant_id: merchant.id })
      .select()
      .single();
    if (!error) fetchBanks();
    return { data, error };
  };

  const updateBank = async (id: string, updates: Partial<MerchantBank>) => {
    const { data, error } = await supabase
      .from("merchant_banks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error) fetchBanks();
    return { data, error };
  };

  const deleteBank = async (id: string) => {
    const { error } = await supabase.from("merchant_banks").delete().eq("id", id);
    if (!error) fetchBanks();
    return { error };
  };

  const setDefault = async (id: string) => {
    return updateBank(id, { is_default: true });
  };

  const defaultBank = banks.find((b) => b.is_default) || banks[0] || null;

  return { banks, loading, addBank, updateBank, deleteBank, setDefault, defaultBank, refetch: fetchBanks };
};
