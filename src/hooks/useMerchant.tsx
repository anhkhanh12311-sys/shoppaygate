import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Merchant DTO (safe view).
 * Sensitive fields (bank_account_number, bank_name, bank_account_name,
 * sepay_api_key, webhook_secret, webhook_api_key) are NEVER fetched here.
 * - Bank info → use `useMerchantBanks`
 * - Secrets   → use `useMerchantSecrets` (RPC, owner-scoped)
 */
export interface Merchant {
  id: string;
  auth_user_id: string;
  business_name: string;
  email: string;
  phone: string | null;
  webhook_url: string | null;
  webhook_enabled: boolean | null;
  balance: number;
  topup_code: string | null;
  created_at: string;
  updated_at: string;
}

const SAFE_COLUMNS =
  "id, auth_user_id, business_name, email, phone, webhook_url, webhook_enabled, balance, topup_code, created_at, updated_at";

// Updates allowed from client — strictly non-sensitive fields.
type SafeUpdate = Partial<
  Pick<Merchant, "business_name" | "phone" | "webhook_url" | "webhook_enabled">
>;

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
        .from("merchants_safe" as any)
        .select(SAFE_COLUMNS)
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else {
        setMerchant((data as unknown as Merchant) ?? null);
      }
      setLoading(false);
    };

    fetchMerchant();
  }, [user]);

  const updateMerchant = async (updates: SafeUpdate) => {
    if (!merchant) return { error: new Error("No merchant found") };

    // Whitelist fields — never let bank/secret columns leak through.
    const allowed: SafeUpdate = {};
    if ("business_name" in updates) allowed.business_name = updates.business_name;
    if ("phone" in updates) allowed.phone = updates.phone;
    if ("webhook_url" in updates) allowed.webhook_url = updates.webhook_url;
    if ("webhook_enabled" in updates) allowed.webhook_enabled = updates.webhook_enabled;

    const { error } = await supabase
      .from("merchants")
      .update(allowed)
      .eq("id", merchant.id);

    if (!error) {
      const { data } = await supabase
        .from("merchants_safe" as any)
        .select(SAFE_COLUMNS)
        .eq("id", merchant.id)
        .maybeSingle();
      if (data) setMerchant(data as unknown as Merchant);
    }

    return { data: merchant, error };
  };

  return { merchant, loading, error, updateMerchant };
};
