import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TopupBankSetting {
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  content_prefix: string;
  note?: string;
}
export interface ApiBrandingSetting {
  brand_name: string;
  api_version: string;
  support_email: string;
  doc_url: string;
}

export const useSystemSetting = <T = any>(key: string) => {
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("system_settings" as any)
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (mounted) {
        setValue(((data as any)?.value ?? null) as T);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [key]);
  return { value, loading };
};
