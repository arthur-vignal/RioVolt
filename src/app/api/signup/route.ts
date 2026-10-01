/**
 * /api/signup — Cria uma conta nova via Supabase Auth (caminho primário)
 * com fallback local (bcrypt) quando Supabase nao esta habilitado.
 *
 * Body:
 *   {
 *     name, email, password, role,
 *     plate?, carModelId?, vehicle?, batteryKwh?
 *   }
 *
 * Erros:
 *   400 = validacao
 *   409 = email ja cadastrado
 *   500 = erro interno
 *
 * Requer: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 * configurados (env). Opcional: SUPABASE_SERVICE_ROLE_KEY para usar
 * o cliente admin (cria user sem limite de rate).
 */
import { NextResponse } from "next/server";
import {
  getSupabaseAnon,
  isSupabaseEnabled,
} from "@/lib/supabase-server";
import { findUserByEmail } from "@/lib/db";
import { CAR_MODELS, carModelById } from "@/lib/mock-data";

type Body = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  plate?: unknown;
  carModelId?: unknown;
  vehicle?: unknown;
  batteryKwh?: unknown;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(v: unknown, max = 80): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > max) return null;
  return s;
}

function asPlate(v: unknown): string | null {
  const s = asString(v, 16);
  if (!s) return null;
  const clean = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 6 || clean.length > 8) return null;
  return clean;
}

function asBatteryKwh(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 200) return null;
  return Math.round(n * 10) / 10;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
  }

  // --- validacao ---
  const name = asString(body.name, 80);
  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name) {
    return NextResponse.json({ ok: false, error: "Informe seu nome." }, { status: 400 });
  }
  if (!EMAIL_RE.test(emailRaw)) {
    return NextResponse.json({ ok: false, error: "Email inválido." }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Senha precisa de pelo menos 6 caracteres." },
      { status: 400 },
    );
  }
  const role = body.role === "motorista" || body.role === "donos" ? body.role : null;
  if (!role) {
    return NextResponse.json(
      { ok: false, error: "Selecione um tipo de conta (motorista ou dono)." },
      { status: 400 },
    );
  }

  // --- validacao do veiculo (motorista) ---
  let plate: string | null = null;
  let carModelId: string | null = null;
  let batteryKwh: number | null = null;
  let vehicle: string | null = null;
  if (role === "motorista") {
    if (body.plate) {
      plate = asPlate(body.plate);
      if (!plate) {
        return NextResponse.json(
          { ok: false, error: "Placa inválida (formato 3 letras + 4 números)." },
          { status: 400 },
        );
      }
    }
    const modelId = asString(body.carModelId, 64);
    if (modelId === "outro") {
      carModelId = "outro";
      vehicle = asString(body.vehicle, 80);
      batteryKwh = asBatteryKwh(body.batteryKwh);
      if (!vehicle && batteryKwh === null) {
        return NextResponse.json(
          { ok: false, error: "Modelo 'Outro': informe o nome do carro OU a bateria (kWh)." },
          { status: 400 },
        );
      }
    } else if (modelId) {
      const m = carModelById(modelId);
      if (!m) {
        return NextResponse.json({ ok: false, error: "Modelo inválido." }, { status: 400 });
      }
      carModelId = m.id;
      vehicle = m.name;
      batteryKwh = m.batteryKwh;
    }
  }

  // --- checa duplicidade local ---
  const existing = await findUserByEmail(emailRaw);
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Email já cadastrado. Tente Entrar." },
      { status: 409 },
    );
  }

  // --- caminho primario: Supabase Auth ---
  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAnon();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase mal configurado." },
        { status: 500 },
      );
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailRaw,
        password,
        options: {
          data: { name, role },
          emailRedirectTo: undefined, // confirmacao de email desativada
        },
      });
      if (error || !data.user) {
        console.error("[voltrio/signup] supabase.signUp error:", error?.message);
        return NextResponse.json(
          { ok: false, error: error?.message ?? "Falha ao criar conta." },
          { status: 400 },
        );
      }
      // auth.user.id eh UUID. Replica no Postgres local com mesmo ID.
      const id = data.user.id;
      const dbMod = process.env.DATABASE_URL
        ? await import("@/lib/db-pg")
        : await import("@/lib/db-sqlite");
      const inserted = await dbMod.rawInsertUser({
        id,
        email: emailRaw,
        role,
        name,
        plate,
        car_model: vehicle,
        kwh_plan_limit: role === "motorista" ? 150 : null,
        battery_kwh: batteryKwh,
        car_model_id: carModelId,
        password_hash: null, // senha fica no Supabase Auth
      });
      if (!inserted) {
        return NextResponse.json(
          { ok: false, error: "Email já cadastrado (condição de corrida)." },
          { status: 409 },
        );
      }
      // Login imediato: Supabase Auth ja fez signup, entao ja tem sessao?
      // Nao — signUp exige confirmacao de email OU retorno de session.
      // Como confirm email esta OFF, ja temos session no data.session.
      // Mas nosso app usa cookie proprio HMAC, entao vamos gerar um
      // cookie com o user.id UUID.
      const { encodeSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } = await import(
        "@/lib/session"
      );
      const { cookies } = await import("next/headers");
      const token = encodeSession({
        userId: id,
        role,
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
      return NextResponse.json({
        ok: true,
        user: { id, email: emailRaw, name, role },
      });
    } catch (err) {
      console.error("[voltrio/signup] supabase error:", err);
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : "Erro no Supabase." },
        { status: 500 },
      );
    }
  }

  // --- fallback local: bcrypt (dev ou Railway sem Supabase) ---
  const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const dbMod = process.env.DATABASE_URL
      ? await import("@/lib/db-pg")
      : await import("@/lib/db-sqlite");
    const inserted = await dbMod.rawInsertUser({
      id,
      email: emailRaw,
      role,
      name,
      plate,
      car_model: vehicle,
      kwh_plan_limit: role === "motorista" ? 150 : null,
      battery_kwh: batteryKwh,
      car_model_id: carModelId,
      password_hash: passwordHash,
    });
    if (!inserted) {
      return NextResponse.json(
        { ok: false, error: "Email já cadastrado (condição de corrida)." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      user: { id, email: emailRaw, name, role },
    });
  } catch (err) {
    console.error("[voltrio/signup] local error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro interno." },
      { status: 500 },
    );
  }
}

// Re-exports pra garantir que o bundler nao tree-shake.
void CAR_MODELS;