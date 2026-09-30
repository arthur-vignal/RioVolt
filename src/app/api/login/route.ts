import { cookies } from "next/headers";
import { getSubscriberByEmail, verifyPassword } from "@/lib/auth-db";
import { encodeSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/session";

// garante execução por-request (lê cookies)
export const dynamic = "force-dynamic";

type Body = {
  email?: unknown;
  password?: unknown;
  role?: unknown;
};

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

  const row = getSubscriberByEmail(email);
  if (!row) {
    return Response.json(
      { ok: false, error: "Credenciais inválidas." },
      { status: 401 },
    );
  }

  if (role && row.role !== role) {
    return Response.json(
      { ok: false, error: `Esta conta não tem perfil ${role}.` },
      { status: 403 },
    );
  }

  if (!verifyPassword(row, password)) {
    return Response.json(
      { ok: false, error: "Credenciais inválidas." },
      { status: 401 },
    );
  }

  const token = encodeSession({
    userId: row.id,
    role: row.role,
    iat: Math.floor(Date.now() / 1000),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    // secure: true em produção (HTTPS). Em dev (http://localhost) deixamos false
    // porque o cookie seria rejeitado pelo browser.
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({
    ok: true,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
    },
  });
}