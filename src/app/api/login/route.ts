import { cookies } from "next/headers";
import { encodeSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/session";
import { isSupabaseEnabled, getSupabaseAnon } from "@/lib/supabase-server";
import { getSubscriberByEmail, verifyPassword } from "@/lib/auth-db";

// garante execução por-request (lê cookies)
export const dynamic = "force-dynamic";

type Body = {
  email?: unknown;
  password?: unknown;
  role?: unknown;
};

type AuthResult =
  | { ok: true; user: { id: string; name: string; email: string; role: "motorista" | "donos" } }
  | { ok: false; error: string; status: 400 | 401 | 403 | 500 };

async function authenticateLocal(email: string, password: string): Promise<AuthResult> {
  const row = await getSubscriberByEmail(email);
  if (!row) return { ok: false, status: 401, error: "Credenciais inválidas." };
  if (!(await verifyPassword(row, password))) {
    return { ok: false, status: 401, error: "Credenciais inválidas." };
  }
  return {
    ok: true,
    user: { id: row.id, name: row.name, email: row.email, role: row.role },
  };
}

async function authenticateSupabase(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseAnon();
  if (!supabase) {
    return { ok: false, status: 500, error: "Supabase não configurado." };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log("[voltrio/login] supabase.signInWithPassword result:", { hasUser: !!data.user, error: error?.message });
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Credenciais inválidas." };
  }
  // Mapeia o auth.user.id (UUID) → user.id local no Postgres.
  // Em prod o Postgres dispatcher usa o user.id direto, mantemos o auth.user.id.
  // Busca profile no banco local pra pegar nome/role/plate.
  const row = await getSubscriberByEmail(email);
  console.log("[voltrio/login] getSubscriberByEmail result:", row ? { id: row.id, email: row.email, role: row.role } : null);
  if (!row) {
    return {
      ok: false,
      status: 403,
      error: "Conta autenticada mas sem perfil cadastrado no app.",
    };
  }
  return {
    ok: true,
    user: { id: row.id, name: row.name, email: row.email, role: row.role },
  };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json(
      { ok: false, error: "Payload inválido (esperava JSON)." },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "motorista" || body.role === "donos" ? body.role : null;

  if (!email || !password) {
    return Response.json(
      { ok: false, error: "Informe email e senha." },
      { status: 400 },
    );
  }

  // Estratégia: tenta Supabase se as env vars existirem, senão cai pra local.
  // Em prod (DATABASE_URL + SUPABASE_URL), o Supabase é o caminho real.
  // Em dev local sem Supabase configurado, usa o bcrypt local.
  const useSupabase = isSupabaseEnabled();
  const result = useSupabase
    ? await authenticateSupabase(email, password)
    : await authenticateLocal(email, password);

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }

  if (role && result.user.role !== role) {
    return Response.json(
      { ok: false, error: `Esta conta não tem perfil ${role}.` },
      { status: 403 },
    );
  }

  const token = encodeSession({
    userId: result.user.id,
    role: result.user.role,
    iat: Math.floor(Date.now() / 1000),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({ ok: true, user: result.user });
}