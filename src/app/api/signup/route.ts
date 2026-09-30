/**
 * /api/signup — Cria uma conta nova.
 *
 * Fluxo:
 *   1. Cria o usuário no Supabase Auth (auth.users).
 *   2. Insere a linha correspondente em `public.users` no Postgres
 *      (campos de role/plate/car_model).
 *
 * Validação:
 *   - email válido
 *   - senha >= 6 chars
 *   - role in {motorista, donos}
 *
 * Erros retornados:
 *   400 = validação
 *   409 = email já cadastrado
 *   500 = erro interno (Supabase indisponível, Postgres falha, etc)
 */
import { NextResponse } from "next/server";
import {
  getSupabaseAnon,
  getSupabaseAdmin,
  isSupabaseEnabled,
} from "@/lib/supabase-server";
import { createUser } from "@/lib/db-pg";

type Body = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  role?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payload inválido." },
      { status: 400 },
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role =
    body.role === "motorista" || body.role === "donos" ? body.role : null;

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Email inválido." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Senha precisa de pelo menos 6 caracteres." },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Informe seu nome." },
      { status: 400 },
    );
  }
  if (!role) {
    return NextResponse.json(
      { ok: false, error: "Selecione um tipo de conta." },
      { status: 400 },
    );
  }

  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.",
      },
      { status: 500 },
    );
  }

  // 1. Cria no Supabase Auth (service role se disponível, senão signup público)
  const admin = getSupabaseAdmin();
  const anon = getSupabaseAnon();
  if (!anon) {
    return NextResponse.json(
      { ok: false, error: "Cliente Supabase indisponível." },
      { status: 500 },
    );
  }

  try {
    if (admin) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          return NextResponse.json(
            { ok: false, error: "Email já cadastrado." },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { ok: false, error: `Supabase: ${error.message}` },
          { status: 400 },
        );
      }
      if (!data.user) {
        return NextResponse.json(
          { ok: false, error: "Supabase não retornou usuário." },
          { status: 500 },
        );
      }
    } else {
      // fallback: signup público (precisa confirmação de email desligada)
      const { error } = await anon.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          return NextResponse.json(
            { ok: false, error: "Email já cadastrado." },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { ok: false, error: `Supabase: ${error.message}` },
          { status: 400 },
        );
      }
    }

    // 2. Insere em public.users (Postgres)
    const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const user = await createUser({
      id,
      email,
      role,
      name,
      plate: null,
      car_model: null,
      kwh_plan_limit: role === "motorista" ? 200 : null,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[voltrio/signup] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro interno.",
      },
      { status: 500 },
    );
  }
}