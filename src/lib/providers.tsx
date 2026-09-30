"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { getLocalSession, setLocalSession, clearLocalSession } from "@/lib/auth-local";

export type SessionUser = { id: string; email: string; role: "motorista" | "donos" } | null;

type AuthContextValue = {
  user: SessionUser;
  loading: boolean;
  loginAs: (role: "motorista" | "donos", email?: string) => Promise<{ mode: "otp" | "local" }>;
  logout: () => Promise<void>;
  isSupabase: boolean;
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  loginAs: async () => ({ mode: "local" }),
  logout: async () => {},
  isSupabase: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuth();
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAppAuth() {
  return useContext(AuthCtx);
}

function useAuth(): AuthContextValue {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();

  useEffect(() => {
    let active = true;
    (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const s = data.session;
        if (active) {
          setUser(s ? { id: s.user.id, email: s.user.email ?? "", role: (s.user.user_metadata?.role as "motorista" | "donos") ?? "motorista" } : null);
          setLoading(false);
        }
      } else {
        if (active) {
          setUser(getLocalSession());
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function loginAs(role: "motorista" | "donos", email?: string) {
    if (supabase) {
      const targetEmail = email || (role === "donos" ? "dono@voltrio.local" : "motorista@voltrio.local");
      const { error } = await supabase.auth.signInWithOtp({ email: targetEmail, options: { data: { role } } });
      if (error) throw error;
      return { mode: "otp" as const };
    }
    setLocalSession({ id: role === "donos" ? "owner-1" : "user-1", email: role === "donos" ? "dono@voltrio.local" : "motorista@voltrio.local", role });
    setUser(getLocalSession());
    return { mode: "local" as const };
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    clearLocalSession();
    setUser(null);
  }

  return { user, loading, loginAs, logout, isSupabase: Boolean(supabase) };
}
