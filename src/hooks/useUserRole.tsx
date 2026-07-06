import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "moderator" | "user";

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  // Tracks which user id we've finished loading roles for.
  // Derived `loading` avoids the "stale loading=false" race that
  // caused admin guards to redirect during auth transitions.
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setRoles([]);
      setResolvedUserId("__anonymous__");
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      setRoles((data?.map((r: any) => r.role as AppRole)) || []);
      setResolvedUserId(user.id);
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Derived — updates in the same render as `user`, so guards never
  // see (user=<x>, loading=false, isAdmin=false) transiently.
  const loading = user ? resolvedUserId !== user.id : resolvedUserId === null;

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator") || isAdmin;

  return { roles, isAdmin, isModerator, loading };
};
