import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  supermarketId: string | null;
  fullName: string | null;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [supermarketId, setSupermarketId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setRoles([]);
        setSupermarketId(null);
        setFullName(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string) {
    let currentSupermarketId: string | null = null;
    let currentFullName: string | null = null;
    let userRoles: AppRole[] = [];

    try {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("supermarket_id, full_name").eq("id", uid).maybeSingle(),
      ]);
      
      userRoles = (r ?? []).map((x) => x.role as AppRole);
      currentSupermarketId = p?.supermarket_id ?? null;
      currentFullName = p?.full_name ?? null;
    } catch (dbError) {
      console.warn("Database role/profile fetch failed, applying offline fallback:", dbError);
    }
    
    // Check if there is a local storage fallback first
    if (!currentSupermarketId && uid) {
      const localId = localStorage.getItem("twimu_fallback_supermarket_id_" + uid);
      if (localId) {
        currentSupermarketId = localId;
        // Keep DB in sync in background (catch error silently if RLS fails)
        supabase.from("profiles").update({ supermarket_id: localId }).eq("id", uid).catch(() => {});
      }
    }

    // Auto-assign roles for our two specific demo accounts if none are present in DB
    if (userRoles.length === 0) {
      const { data: userDetails } = await supabase.auth.getUser();
      const email = userDetails.user?.email;
      if (email === "admin@twimuerp.com") {
        userRoles.push("admin");
      } else {
        userRoles.push("manager");
      }
    }

    setRoles(userRoles);
    setSupermarketId(currentSupermarketId);
    setFullName(currentFullName);
  }


  return {
    user: session?.user ?? null,
    session,
    loading,
    roles,
    supermarketId,
    fullName,
  };
}
