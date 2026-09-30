"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { getLocalSession, setLocalSession, clearLocalSession } from "@/lib/auth-local";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  role: "motorista" | "donos";
} | null;

type AuthContextValue = {
  user: SessionUser;
  loading: boolean;
  /** Faz login via /api/login. Email e senha vêm do formulário. */
  login: (email: string, password: string) => Promise<{
    ok: boolean;
    user?: { id: string; email: string; name: string; role: "motorista" | "donos" };
    error?: string;
  }>;
  /** Logout: limpa cookie via /api/logout e storage local. */
  logout: () => Promise<void>;
  isSupabase: boolean;
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({ ok: false, error: "AuthProvider não inicializado." }),
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

  // Resolve usuário atual via cookie HttpOnly (/api/me). Fallback pro localStorage
  // pra não quebrar dev quando o servidor não responde.
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          user?: SessionUser;
        };
        if (data.ok && data.user) {
          setUser(data.user);
          // sincroniza cópia no localStorage como fallback
          try {
            setLocalSession(data.user);
          } catch {}
          setLoading(false);
          return;
        }
      }
    } catch {
      // cai no fallback
    }

    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        const s = data.session;
        if (s) {
          setUser({
            id: s.user.id,
            email: s.user.email ?? "",
            role:
              (s.user.user_metadata?.role as "motorista" | "donos") ??
              "motorista",
          });
          setLoading(false);
          return;
        }
      } catch {}
    }

    setUser(getLocalSession());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { id: string; email: string; name: string; role: "motorista" | "donos" };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.user) {
        setLoading(false);
        return { ok: false, error: data.error || "Falha no login." };
      }
      setUser(data.user);
      try {
        setLocalSession(data.user);
      } catch {}
      setLoading(false);
      return { ok: true, user: data.user };
    } catch (e) {
      setLoading(false);
      return { ok: false, error: "Erro de rede." };
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {}
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    clearLocalSession();
    setUser(null);
    setLoading(false);
  }

  return { user, loading, login, logout, isSupabase: Boolean(supabase) };
}