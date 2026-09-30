/**
 * supabase-server.ts — Cliente Supabase para uso server-side.
 *
 * Usa a service role key quando disponível (cria usuários demo,
 * bypassa RLS). Pra login de usuário normal, basta a anon key.
 *
 * Disponível só no Node runtime (não Edge).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

function url(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? null;
}

function anonKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    null
  );
}

function serviceKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function isSupabaseEnabled(): boolean {
  return !!url() && !!anonKey();
}

/** Cliente anon — pode ser usado server-side para signInWithPassword. */
export function getSupabaseAnon(): SupabaseClient | null {
  if (!isSupabaseEnabled()) return null;
  if (_anon) return _anon;
  _anon = createClient(url()!, anonKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _anon;
}

/** Cliente admin — só disponível se SUPABASE_SERVICE_ROLE_KEY foi injetado.
 *  Usado para seed/criação de usuários em massa. */
export function getSupabaseAdmin(): SupabaseClient | null {
  const u = url();
  const k = serviceKey();
  if (!u || !k) return null;
  if (_admin) return _admin;
  _admin = createClient(u, k, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}