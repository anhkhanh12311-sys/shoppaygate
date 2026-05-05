import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "./useMerchant";

export interface MerchantSecrets {
  sepay_api_key: string | null;
  webhook_secret: string | null;
  webhook_api_key: string | null;
}

const EMPTY: MerchantSecrets = {
  sepay_api_key: null,
  webhook_secret: null,
  webhook_api_key: null,
};

/**
 * Fetches/updates the merchant's sensitive credentials via secure RPC.
 * Secrets are NEVER returned by the merchants table; only the owner
 * (or an admin) can read them, and only on demand.
 */
export const useMerchantSecrets = () => {
  const { merchant } = useMerchant();
  const [secrets, setSecrets] = useState<MerchantSecrets>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetchSecrets = useCallback(async () => {
    if (!merchant) {
      setSecrets(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_my_merchant_secrets");
    if (error || !data || data.length === 0) {
      setSecrets(EMPTY);
    } else {
      setSecrets({
        sepay_api_key: data[0].sepay_api_key ?? null,
        webhook_secret: data[0].webhook_secret ?? null,
        webhook_api_key: data[0].webhook_api_key ?? null,
      });
    }
    setLoading(false);
  }, [merchant]);

  useEffect(() => { fetchSecrets(); }, [fetchSecrets]);

  const updateSecrets = async (updates: {
    sepay_api_key?: string | null;
    webhook_secret?: string | null;
    webhook_api_key?: string | null;
  }) => {
    const params: Record<string, unknown> = {};
    if (updates.sepay_api_key === null) params.p_clear_sepay = true;
    else if (updates.sepay_api_key !== undefined) params.p_sepay_api_key = updates.sepay_api_key;

    if (updates.webhook_secret === null) params.p_clear_webhook_secret = true;
    else if (updates.webhook_secret !== undefined) params.p_webhook_secret = updates.webhook_secret;

    if (updates.webhook_api_key === null) params.p_clear_webhook_api_key = true;
    else if (updates.webhook_api_key !== undefined) params.p_webhook_api_key = updates.webhook_api_key;

    const { error } = await (supabase as any).rpc("update_my_merchant_secrets", params);
    if (!error) await fetchSecrets();
    return { error };
  };

  return { secrets, loading, updateSecrets, refetch: fetchSecrets };
};
