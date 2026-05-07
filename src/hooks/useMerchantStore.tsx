import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";

export interface MerchantStore {
  id: string;
  merchant_id: string;
  slug: string;
  store_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string | null;
  is_active: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  business_hours: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  zalo_url: string | null;
  website_url: string | null;
  show_stats: boolean;
  theme_style: string;
  created_at: string;
  updated_at: string;
}

export const useMerchantStore = () => {
  const { merchant } = useMerchant();
  const [store, setStore] = useState<MerchantStore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchant) {
      setStore(null);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("merchant_stores")
        .select("*")
        .eq("merchant_id", merchant.id)
        .maybeSingle();
      setStore(data);
      setLoading(false);
    };

    fetch();
  }, [merchant]);

  const upsertStore = async (updates: Partial<MerchantStore> & { slug: string; store_name: string }) => {
    if (!merchant) return { error: new Error("No merchant") };

    if (store) {
      const { data, error } = await supabase
        .from("merchant_stores")
        .update(updates)
        .eq("id", store.id)
        .select()
        .single();
      if (!error && data) setStore(data);
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from("merchant_stores")
        .insert({ ...updates, merchant_id: merchant.id })
        .select()
        .single();
      if (!error && data) setStore(data);
      return { data, error };
    }
  };

  return { store, loading, upsertStore };
};
