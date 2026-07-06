import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "moderator" | "user";

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const resolvedForUser = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      resolvedForUser.current = null;
      setRoles([]);
      setLoading(false);
      return;
    }

    // Ensure loading is true whenever we haven't yet resolved roles
    // for the *current* user id — prevents guards from firing on a
    // stale `loading:false` from the signed-out state.
    if (resolvedForUser.current !== user.id) {
      setLoading(true);
    }

    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      setRoles((data?.map((r: any) => r.role as AppRole)) || []);
      resolvedForUser.current = user.id;
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator") || isAdmin;

  return { roles, isAdmin, isModerator, loading };
};
