/**
 * db-pg.ts — Adapter Postgres para a camada de dados do Voltrio.
 *
 * Carregado lazy pelo db.ts quando process.env.DATABASE_URL existe (Postgres
 * no Railway, Supabase, etc). Em dev local, db.ts cai no SQLite e este módulo
 * não é importado.
 *
 * Mantém as MESMAS assinaturas públicas do db.ts (listPoints, createBooking,
 * etc). Os internals são completamente diferentes (queries parametrizadas com
 * $1, $2, retorno via pg.Pool).
 */

import { Pool, type PoolClient, type QueryResultRow } from "pg";
import {
  POINTS,
  ME,
  type Point,
  type Connector,
  type Booking,
  type Subscriber,
  type Subscription,
  type DayPoint,
  type PlanId,
  type ChargerKind,
  type PointStatus,
} from "@/lib/mock-data";

// ---------------------------------------------------------------- singleton

let _pool: Pool | null = null;
let _schemaReady: Promise<void> | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL nao configurada");
  _pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 10,
  });
  return _pool;
}

export { getPool };

/**
 * Garante que o schema existe E a migration de emails está aplicada.
 * Lazy + idempotente + thread-safe.
 * Não roda seed (já é responsabilidade do seedIfEmpty).
 */
export function ensureSchema(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    try {
      await initSchema();
      // migration idempotente: renameia emails .local → .app se existirem
      await getPool().query(
        "UPDATE users SET email = REPLACE(email, '@voltrio.local', '@voltrio.app') WHERE email LIKE '%@voltrio.local'",
      );
    } catch (err) {
      _schemaReady = null;
      throw err;
    }
  })();
  return _schemaReady;
}

// ---------------------------------------------------------------- schema

export async function initSchema(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      email           TEXT NOT NULL UNIQUE,
      role            TEXT NOT NULL CHECK (role IN ('motorista','donos')),
      name            TEXT NOT NULL,
      plate           TEXT,
      car_model       TEXT,
      kwh_plan_limit  INTEGER,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS points (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      neighborhood  TEXT NOT NULL,
      focus         TEXT NOT NULL CHECK (focus IN ('moradores','motoristas')),
      address       TEXT NOT NULL,
      lat           DOUBLE PRECISION NOT NULL,
      lon           DOUBLE PRECISION NOT NULL,
      open_hours    TEXT NOT NULL,
      partner       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connectors (
      id          TEXT PRIMARY KEY,
      point_id    TEXT NOT NULL REFERENCES points(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL CHECK (kind IN ('AC','DC')),
      power_kw    DOUBLE PRECISION NOT NULL,
      status      TEXT NOT NULL CHECK (status IN ('free','reserved','in_use','offline')),
      note        TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id            TEXT PRIMARY KEY,
      user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      connector_id  TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
      point_id      TEXT NOT NULL REFERENCES points(id) ON DELETE CASCADE,
      plan          TEXT NOT NULL CHECK (plan IN ('noturno','pro')),
      start_hour    DOUBLE PRECISION NOT NULL,
      duration_min  INTEGER NOT NULL,
      status        TEXT NOT NULL CHECK (status IN ('confirmed','pending','cancelled','no_show','done','in_progress')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
          id            SERIAL PRIMARY KEY,
          user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          plan          TEXT NOT NULL CHECK (plan IN ('noturno','pro')),
          kwh_used      DOUBLE PRECISION NOT NULL DEFAULT 0,
          monthly_fee   DOUBLE PRECISION NOT NULL,
          since         TEXT NOT NULL,
          next_renewal  TEXT NOT NULL,
          payment_ok    BOOLEAN NOT NULL DEFAULT TRUE,
          cycle_start   TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
          cupons_ac_used INTEGER NOT NULL DEFAULT 0
        );

    CREATE TABLE IF NOT EXISTS subscribers (
      id            SERIAL PRIMARY KEY,
      user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      name          TEXT NOT NULL,
      plan          TEXT NOT NULL CHECK (plan IN ('noturno','pro')),
      status        TEXT NOT NULL CHECK (status IN ('ativo','inadimplente','cancelado')),
      since         TEXT NOT NULL,
      kwh30d        DOUBLE PRECISION NOT NULL DEFAULT 0,
      monthly_fee   DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE IF NOT EXISTS charges (
      id              TEXT PRIMARY KEY,
      booking_id      TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
      connector_id    TEXT NOT NULL,
      point_id        TEXT NOT NULL,
      started_at      TIMESTAMPTZ NOT NULL,
      ended_at        TIMESTAMPTZ,
      kwh             DOUBLE PRECISION NOT NULL DEFAULT 0,
      amount_brl      DOUBLE PRECISION NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT INTO settings (key, value) VALUES ('kwhPrice', '2.04')
      ON CONFLICT (key) DO NOTHING;
    `);
    // ensure default 'in_progress' exists in CHECK (post-migration safety)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'bookings_status_check'
        ) THEN
          ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
          ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
            CHECK (status IN ('confirmed','pending','cancelled','no_show','done','in_progress'));
        END IF;
      END$$;
    `).catch(() => {});

    // Migration idempotente: adiciona cupons_ac_used + cycle_start se faltarem.
    // Banco ja criado em deploy anterior fica sem essas colunas. ADD COLUMN
    // com IF NOT EXISTS e DEFAULT seguro nao quebra dados existentes.
    await pool.query(`
      ALTER TABLE subscriptions
        ADD COLUMN IF NOT EXISTS cupons_ac_used INTEGER NOT NULL DEFAULT 0;
    `).catch((err) => {
      console.error("[voltrio/db-pg] falha ao adicionar cupons_ac_used:", err instanceof Error ? err.message : err);
    });
    await pool.query(`
      ALTER TABLE subscriptions
        ADD COLUMN IF NOT EXISTS cycle_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now());
    `).catch((err) => {
      console.error("[voltrio/db-pg] falha ao adicionar cycle_start:", err instanceof Error ? err.message : err);
    });
  }

// ---------------------------------------------------------------- seed

export async function seedIfEmpty(): Promise<void> {
  const pool = getPool();
  const r = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  const n = (r.rows[0] as { n: number }).n;
  // migration: emails demo antigos usam @voltrio.app (rejeitado pelo supabase).
  // Renomeia pra @voltrio.app pra alinhar com as credenciais criadas no supabase auth.
  if (n > 0) {
    await pool.query("UPDATE users SET email = REPLACE(email, '@voltrio.app', '@voltrio.app') WHERE email LIKE '%@voltrio.app'");
    return;
  }
  const tx = await pool.connect();
  try {
    await tx.query("BEGIN");
    for (const u of [
      { id: "user-1", email: "mariana@voltrio.app", role: "motorista", name: "Mariana Souza", plate: "RIO-2A19", car: "BYD Dolphin", plan: 200 },
      { id: "user-2", email: "rafael@voltrio.app", role: "motorista", name: "Rafael Mendes", plate: "RIO-3B42", car: "Volvo EX30", plan: 200 },
      { id: "user-3", email: "carlos@voltrio.app", role: "motorista", name: "Carlos Andrade", plate: "RIO-4C77", car: "Renault Kwid E-Tech", plan: 200 },
      { id: "owner-1", email: "dono@voltrio.app", role: "donos", name: "Bruno Tavares", plate: null, car: null, plan: null },
    ]) {
      await tx.query(
        `INSERT INTO users (id,email,role,name,plate,car_model,kwh_plan_limit)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [u.id, u.email, u.role, u.name, u.plate, u.car, u.plan],
      );
    }
    for (const p of POINTS) {
      await tx.query(
        `INSERT INTO points (id,name,neighborhood,focus,address,lat,lon,open_hours,partner)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [p.id, p.name, p.neighborhood, p.focus, p.address, p.lat, p.lon, p.openHours, p.partner],
      );
      for (const c of p.connectors) {
        await tx.query(
          `INSERT INTO connectors (id,point_id,kind,power_kw,status,note)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [c.id, p.id, c.kind, c.powerKw, c.status, c.note ?? null],
        );
      }
    }
    // Subscription ativa pra Mariana (user-1), zerada.
    // Plan: noturno, mensalidade R$349, franquia 200 kWh. Demais usuarios sem
    // subscription ate assinarem.
    await tx.query(
      `INSERT INTO subscriptions (user_id,plan,kwh_used,monthly_fee,since,next_renewal,payment_ok)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        "user-1",
        ME.planId,
        0, // kwh_used zerado no seed (consumo real sobe com charges)
        ME.monthlyFee,
        ME.since,
        ME.nextRenewal,
        ME.paymentOk,
      ],
    );
    // Sem subscribers placeholder: tabela fica vazia ate alguem assinar de verdade.
    await tx.query("COMMIT");
  } catch (err) {
    await tx.query("ROLLBACK");
    throw err;
  } finally {
    tx.release();
  }
}

// ---------------------------------------------------------------- tipos públicos

export type UserRow = {
  id: string;
  email: string;
  role: "motorista" | "donos";
  name: string;
  plate: string | null;
  car_model: string | null;
  kwh_plan_limit: number | null;
  created_at: string;
};

export type Charge = {
  id: string;
  bookingId: string;
  userId: string | null;
  connectorId: string;
  pointId: string;
  startedAt: string;
  endedAt: string | null;
  kwh: number;
  amount: number;
};

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: "motorista" | "donos";
  plate: string;
  vehicle: string;
};

// ---------------------------------------------------------------- mappers

type PointRow = {
  id: string;
  name: string;
  neighborhood: string;
  focus: "moradores" | "motoristas";
  address: string;
  lat: number;
  lon: number;
  open_hours: string;
  partner: string;
};

type ConnectorRow = {
  id: string;
  point_id: string;
  kind: ChargerKind;
  power_kw: number;
  status: PointStatus;
  note: string | null;
};

type BookingRow = {
  id: string;
  user_id: string | null;
  connector_id: string;
  point_id: string;
  plan: PlanId;
  start_hour: number;
  duration_min: number;
  status: Booking["status"];
  created_at: string;
};

type SubscriberRow = {
  id: number;
  user_id: string | null;
  name: string;
  plan: PlanId;
  status: Subscriber["status"];
  since: string;
  kwh30d: number;
  monthly_fee: number;
};

function rowToConnector(r: ConnectorRow): Connector {
  return {
    id: r.id,
    pointId: r.point_id,
    kind: r.kind,
    powerKw: Number(r.power_kw),
    status: r.status,
    note: r.note ?? undefined,
  };
}

function rowToPoint(p: PointRow, conns: Connector[]): Point {
  return {
    id: p.id,
    name: p.name,
    neighborhood: p.neighborhood,
    focus: p.focus,
    address: p.address,
    lat: Number(p.lat),
    lon: Number(p.lon),
    openHours: p.open_hours,
    partner: p.partner,
    connectors: conns,
  };
}

async function rowToBooking(r: BookingRow): Promise<Booking> {
  let userName = "—";
  if (r.user_id) {
    const r2 = await getPool().query<{ name: string }>(
      "SELECT name FROM users WHERE id = $1",
      [r.user_id],
    );
    if (r2.rows[0]) userName = r2.rows[0].name;
  }
  return {
    id: r.id,
    connectorId: r.connector_id,
    pointId: r.point_id,
    user: userName,
    planId: r.plan,
    start: Number(r.start_hour),
    durationMin: r.duration_min,
    status: r.status,
  };
}

function rowToSubscriber(r: SubscriberRow): Subscriber {
  return {
    name: r.name,
    planId: r.plan,
    status: r.status,
    since: r.since,
    kwh30d: Number(r.kwh30d),
    monthlyFee: Number(r.monthly_fee),
  };
}

// ---------------------------------------------------------------- reads

export async function listPoints(): Promise<Point[]> {
  const pool = getPool();
  const [pts, conns] = await Promise.all([
    pool.query<PointRow>("SELECT * FROM points ORDER BY name"),
    pool.query<ConnectorRow>("SELECT * FROM connectors"),
  ]);
  const byPoint = new Map<string, Connector[]>();
  for (const c of conns.rows) {
    const arr = byPoint.get(c.point_id) ?? [];
    arr.push(rowToConnector(c));
    byPoint.set(c.point_id, arr);
  }
  return pts.rows.map((p) => rowToPoint(p, byPoint.get(p.id) ?? []));
}

export async function listConnectors(): Promise<Connector[]> {
  const r = await getPool().query<ConnectorRow>("SELECT * FROM connectors");
  return r.rows.map(rowToConnector);
}

export async function listBookingsForDay(_date: string): Promise<Booking[]> {
  const r = await getPool().query<BookingRow>(
    "SELECT * FROM bookings ORDER BY start_hour ASC",
  );
  return Promise.all(r.rows.map(rowToBooking));
}

export async function getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
  await ensureSchema();
  const pool = getPool();
  // primeiro tenta pelo user_id (email -> users -> subscribers)
  const u = await pool.query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    [email.trim().toLowerCase()],
  );
  if (u.rows[0]) {
    const s = await pool.query<SubscriberRow>(
      "SELECT * FROM subscribers WHERE user_id = $1 ORDER BY id DESC LIMIT 1",
      [u.rows[0].id],
    );
    if (s.rows[0]) return rowToSubscriber(s.rows[0]);
  }
  // fallback por name
  const f = await pool.query<SubscriberRow>(
    "SELECT * FROM subscribers WHERE name = $1 ORDER BY id DESC LIMIT 1",
    [email],
  );
  return f.rows[0] ? rowToSubscriber(f.rows[0]) : undefined;
}

export async function listAllSubscribers(): Promise<Subscriber[]> {
  const r = await getPool().query<SubscriberRow>(
    "SELECT * FROM subscribers ORDER BY id ASC",
  );
  return r.rows.map(rowToSubscriber);
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const r = await getPool().query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email.trim().toLowerCase()],
  );
  return r.rows[0];
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const r = await getPool().query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return r.rows[0];
}

export type CreateUserInput = {
  id: string;
  email: string;
  role: "motorista" | "donos";
  name: string;
  plate: string | null;
  car_model: string | null;
  kwh_plan_limit: number | null;
};

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  await getPool().query(
    `INSERT INTO users (id, email, role, name, plate, car_model, kwh_plan_limit)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [input.id, input.email, input.role, input.name, input.plate, input.car_model, input.kwh_plan_limit],
  );
  // se conflict, retorna o existente
  const existing = await findUserByEmail(input.email);
  if (existing) return existing;
  throw new Error("user_insert_failed");
}

export async function listAllUsers(): Promise<UserRow[]> {
  const r = await getPool().query<UserRow>("SELECT * FROM users ORDER BY role, name");
  return r.rows;
}

export async function verifyPassword(email: string, password: string): Promise<UserRow | null> {
  const pool = getPool();
  const r = await pool.query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE email = $1",
    [email.trim().toLowerCase()],
  );
  if (!r.rows[0]) return null;
  const ok = await import("bcryptjs").then((b) =>
    b.compareSync(password, r.rows[0].password_hash),
  );
  if (!ok) return null;
  const u = await findUserByEmail(email);
  return u ?? null;
}

export async function getProfile(userId: string): Promise<Profile | undefined> {
  const u = await findUserById(userId);
  if (!u) return undefined;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    plate: u.plate ?? "",
    vehicle: u.car_model ?? "",
  };
}

export async function updateProfile(
  userId: string,
  patch: { name?: string; plate?: string; vehicle?: string },
): Promise<Profile | undefined> {
  if (typeof patch.name === "string") {
    await getPool().query("UPDATE users SET name = $1 WHERE id = $2", [patch.name, userId]);
  }
  if (typeof patch.plate === "string") {
    await getPool().query(
      "UPDATE users SET plate = $1 WHERE id = $2",
      [patch.plate.toUpperCase(), userId],
    );
  }
  if (typeof patch.vehicle === "string") {
    await getPool().query(
      "UPDATE users SET car_model = $1 WHERE id = $2",
      [patch.vehicle, userId],
    );
  }
  return getProfile(userId);
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  const r = await getPool().query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
  if (!r.rows[0]) return undefined;
  return rowToBooking(r.rows[0]);
}

export async function getPoint(id: string): Promise<Point | undefined> {
  return (await listPoints()).find((p) => p.id === id);
}

export async function listBookingsForUser(userId: string): Promise<Booking[]> {
  const r = await getPool().query<BookingRow>(
    "SELECT * FROM bookings WHERE user_id = $1 ORDER BY start_hour ASC",
    [userId],
  );
  return Promise.all(r.rows.map(rowToBooking));
}

export async function listChargesForUser(userId: string): Promise<Charge[]> {
  const r = await getPool().query<{
    id: string;
    booking_id: string;
    user_id: string | null;
    connector_id: string;
    point_id: string;
    started_at: string;
    ended_at: string | null;
    kwh: string;
    amount_brl: string;
  }>(
    `SELECT * FROM charges WHERE user_id = $1 ORDER BY started_at DESC`,
    [userId],
  );
  return r.rows.map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    connectorId: row.connector_id,
    pointId: row.point_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    kwh: Number(row.kwh),
    amount: Number(row.amount_brl),
  }));
}

export async function getCharge(bookingId: string): Promise<Charge | undefined> {
  const r = await getPool().query<{
    id: string;
    booking_id: string;
    user_id: string | null;
    connector_id: string;
    point_id: string;
    started_at: string;
    ended_at: string | null;
    kwh: string;
    amount_brl: string;
  }>(
    `SELECT * FROM charges
     WHERE booking_id = $1 AND ended_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
    [bookingId],
  );
  if (!r.rows[0]) return undefined;
  const row = r.rows[0];
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    connectorId: row.connector_id,
    pointId: row.point_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    kwh: Number(row.kwh),
    amount: Number(row.amount_brl),
  };
}

// ---------------------------------------------------------------- writes

export async function createBooking(input: {
  userId: string;
  connectorId: string;
  plan: PlanId;
  startHour: number;
  durationMin: number;
}): Promise<Booking> {
  const pool = getPool();
  const end = input.startHour + input.durationMin / 60;
  const conflict = await pool.query(
    `SELECT id FROM bookings
     WHERE connector_id = $1
       AND status IN ('confirmed','pending','in_progress')
       AND NOT (start_hour + (duration_min / 60.0) <= $2 OR start_hour >= $3)`,
    [input.connectorId, input.startHour, end],
  );
  if (conflict.rows.length > 0) throw new Error(`connector_busy:${input.connectorId}`);

  const connRow = await pool.query<{ point_id: string; kind: ChargerKind }>(
    "SELECT c.point_id, c.kind FROM connectors c WHERE c.id = $1",
    [input.connectorId],
  );
  const pointId = connRow.rows[0]?.point_id;
  if (!pointId) throw new Error(`connector_not_found:${input.connectorId}`);
  const connectorKind = connRow.rows[0]?.kind;

  // Regra Pro Plus 150: cada reserva em conector AC consome 1 cupom de R$20
  // (isencao da tarifa de estacionamento). Limite mensal: 6.
  // DC nao consome cupom.
  if (input.plan === "pro" && connectorKind === "AC") {
    await ensureSchema();
    const subR = await pool.query<{ id: number; cupons_ac_used: number; cycle_start: string }>(
      `SELECT id, cupons_ac_used, cycle_start
       FROM subscriptions WHERE user_id = $1
       ORDER BY id DESC LIMIT 1`,
      [input.userId],
    );
    const sub = subR.rows[0];
    if (!sub) throw new Error("cupons_no_subscription");
    const cycleStart = new Date(sub.cycle_start);
    const now = new Date();
    const sameCycle =
      cycleStart.getUTCFullYear() === now.getUTCFullYear() &&
      cycleStart.getUTCMonth() === now.getUTCMonth();
    const used = sameCycle ? Number(sub.cupons_ac_used) : 0;
    if (used >= 6) {
      throw new Error("cupons_ac_esgotados");
    }
    if (!sameCycle) {
      // reseta cycle_start + cupons ao iniciar novo ciclo
      await pool.query(
        `UPDATE subscriptions
            SET cycle_start = date_trunc('month', now()),
                cupons_ac_used = 0
          WHERE id = $1`,
        [sub.id],
      );
    }
    await pool.query(
      "UPDATE subscriptions SET cupons_ac_used = cupons_ac_used + 1 WHERE id = $1",
      [sub.id],
    );
  }

  const id = `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await pool.query(
    `INSERT INTO bookings (id,user_id,connector_id,point_id,plan,start_hour,duration_min,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed')`,
    [id, input.userId, input.connectorId, pointId, input.plan, input.startHour, input.durationMin],
  );
  await pool.query("UPDATE connectors SET status = 'reserved' WHERE id = $1", [input.connectorId]);
  const r = await pool.query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
  return rowToBooking(r.rows[0]);
}

export async function cancelBooking(id: string): Promise<Booking | undefined> {
  const pool = getPool();
  const r = await pool.query<BookingRow>(
    "SELECT * FROM bookings WHERE id = $1",
    [id],
  );
  if (!r.rows[0]) return undefined;
  await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);
  const remaining = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM bookings
     WHERE connector_id = $1 AND status IN ('confirmed','pending','in_progress')`,
    [r.rows[0].connector_id],
  );
  if (remaining.rows[0].n === 0) {
    await pool.query("UPDATE connectors SET status = 'free' WHERE id = $1", [
      r.rows[0].connector_id,
    ]);
  }
  const upd = await pool.query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
  return rowToBooking(upd.rows[0]);
}

export async function updateBookingStatus(
  id: string,
  status: Booking["status"],
): Promise<Booking | undefined> {
  const pool = getPool();
  const r = await pool.query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
  if (!r.rows[0]) return undefined;
  await pool.query("UPDATE bookings SET status = $1 WHERE id = $2", [status, id]);
  const connState: PointStatus =
    status === "confirmed" || status === "pending" ? "reserved" : "free";
  await pool.query("UPDATE connectors SET status = $1 WHERE id = $2", [
    connState,
    r.rows[0].connector_id,
  ]);
  const upd = await pool.query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
  return rowToBooking(upd.rows[0]);
}

export async function incrementSubscriptionKwh(subId: number, kwh: number): Promise<number> {
  const pool = getPool();
  await pool.query("UPDATE subscriptions SET kwh_used = kwh_used + $1 WHERE id = $2", [
    kwh,
    subId,
  ]);
  const r = await pool.query<{ kwh_used: number }>(
    "SELECT kwh_used FROM subscriptions WHERE id = $1",
    [subId],
  );
  return r.rows[0] ? Number(r.rows[0].kwh_used) : 0;
}

export type SubscriptionRow = {
  id: number;
  userId: string;
  plan: PlanId;
  kwhUsed: number;
  monthlyFee: number;
  since: string;
  nextRenewal: string;
  paymentOk: boolean;
  /** início do ciclo de cobrança atual (ISO). */
  cycleStart: string | null;
  /** quantos cupons de isenção R$20 em vagas AC foram consumidos no ciclo. */
  cuponsACUsed: number;
};

function rowToSubscription(r: {
  id: number;
  user_id: string;
  plan: PlanId;
  kwh_used: number | string;
  monthly_fee: number | string;
  since: string;
  next_renewal: string;
  payment_ok: boolean;
  cycle_start?: string | Date;
  cupons_ac_used?: number | string;
}): SubscriptionRow {
  return {
    id: r.id,
    userId: r.user_id,
    plan: r.plan,
    kwhUsed: Number(r.kwh_used),
    monthlyFee: Number(r.monthly_fee),
    since: r.since,
    nextRenewal: r.next_renewal,
    paymentOk: r.payment_ok,
    cycleStart: r.cycle_start ? new Date(r.cycle_start).toISOString() : null,
    cuponsACUsed: Number(r.cupons_ac_used ?? 0),
  };
}

/** Retorna a subscription ativa do usuario (a mais recente), ou null. */
export async function getSubscriptionByUserId(userId: string): Promise<SubscriptionRow | null> {
  const pool = getPool();
  const r = await pool.query(
    `SELECT id, user_id, plan, kwh_used, monthly_fee, since, next_renewal, payment_ok,
            cycle_start, cupons_ac_used
     FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  if (r.rows.length === 0) return null;
  return rowToSubscription(r.rows[0]);
}

/** Soma kWh cobrados no mes atual, agrupados por dia (UTC-3). */
export type DailyKwh = { day: string; kwh: number; revenue: number };
export async function getDailyKwhLast30Days(): Promise<DailyKwh[]> {
  const pool = getPool();
  const r = await pool.query<{ day: string; kwh: string; revenue: string }>(
    `SELECT to_char(date_trunc('day', c.started_at AT TIME ZONE 'America/Sao_Paulo'), 'DD') AS day,
            COALESCE(SUM(c.kwh), 0)::text AS kwh,
            COALESCE(SUM(c.amount), 0)::text AS revenue
     FROM charges c
     WHERE c.started_at >= (NOW() - INTERVAL '30 days')
     GROUP BY 1 ORDER BY 1`,
  );
  return r.rows.map((row) => ({
    day: row.day,
    kwh: Number(row.kwh),
    revenue: Number(row.revenue),
  }));
}

export async function updateSubscriberStatus(
  id: number,
  status: Subscriber["status"],
): Promise<Subscriber | undefined> {
  const pool = getPool();
  const r = await pool.query<SubscriberRow>("SELECT * FROM subscribers WHERE id = $1", [id]);
  if (!r.rows[0]) return undefined;
  await pool.query("UPDATE subscribers SET status = $1 WHERE id = $2", [status, id]);
  const upd = await pool.query<SubscriberRow>("SELECT * FROM subscribers WHERE id = $1", [id]);
  return rowToSubscriber(upd.rows[0]);
}

export async function updateSubscriberStatusByName(
  name: string,
  status: Subscriber["status"],
): Promise<Subscriber | null> {
  const pool = getPool();
  const r = await pool.query<SubscriberRow>("SELECT * FROM subscribers WHERE name = $1", [name]);
  if (!r.rows[0]) return null;
  await pool.query("UPDATE subscribers SET status = $1 WHERE id = $2", [status, r.rows[0].id]);
  const upd = await pool.query<SubscriberRow>("SELECT * FROM subscribers WHERE id = $1", [
    r.rows[0].id,
  ]);
  return rowToSubscriber(upd.rows[0]);
}

export async function incrementKwhByName(name: string, delta: number): Promise<Subscriber | null> {
  const pool = getPool();
  const r = await pool.query<SubscriberRow>("SELECT * FROM subscribers WHERE name = $1", [name]);
  if (!r.rows[0]) return null;
  const next = Math.max(0, Math.round(r.rows[0].kwh30d + delta));
  await pool.query("UPDATE subscribers SET kwh30d = $1 WHERE id = $2", [
    next,
    r.rows[0].id,
  ]);
  const upd = await pool.query<SubscriberRow>("SELECT * FROM subscribers WHERE id = $1", [
    r.rows[0].id,
  ]);
  return rowToSubscriber(upd.rows[0]);
}

export async function updateConnectorStatus(
  connectorId: string,
  status: PointStatus,
): Promise<boolean> {
  const pool = getPool();
  const r = await pool.query("UPDATE connectors SET status = $1 WHERE id = $2", [
    status,
    connectorId,
  ]);
  return (r.rowCount ?? 0) > 0;
}

export async function createPoint(input: {
  name: string;
  neighborhood: string;
  lat: number;
  lon: number;
  kind: ChargerKind;
  powerKw: number;
  partner: string;
}): Promise<Point> {
  const pool = getPool();
  const id = `hub-${Date.now().toString(36)}`;
  const connectorId = `${id}-c1`;
  await pool.query(
    `INSERT INTO points (id,name,neighborhood,focus,address,lat,lon,open_hours,partner)
     VALUES ($1,$2,$3,'motoristas',$4,$5,$6,'24 horas',$7)`,
    [id, input.name, input.neighborhood, input.neighborhood, input.lat, input.lon, input.partner],
  );
  await pool.query(
    `INSERT INTO connectors (id,point_id,kind,power_kw,status)
     VALUES ($1,$2,$3,$4,'free')`,
    [connectorId, id, input.kind, input.powerKw],
  );
  return (await listPoints()).find((p) => p.id === id)!;
}

export async function getSetting(key: string): Promise<string | null> {
  const r = await getPool().query<{ value: string }>(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return r.rows[0]?.value ?? null;
}

export async function getSettingNumber(key: string): Promise<number | null> {
  const v = await getSetting(key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function setSetting(key: string, value: string | number): Promise<void> {
  await getPool().query(
    `INSERT INTO settings (key,value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, String(value)],
  );
}

export async function startCharge(input: {
  userId: string;
  bookingId: string;
}): Promise<
  | { ok: true; booking: Booking; charge: Charge }
  | { ok: false; error: string }
> {
  const pool = getPool();
  const r = await pool.query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [
    input.bookingId,
  ]);
  if (!r.rows[0]) return { ok: false, error: "Reserva não encontrada." };
  if (r.rows[0].user_id && r.rows[0].user_id !== input.userId) {
    return { ok: false, error: "Esta reserva não pertence a você." };
  }
  await pool.query("UPDATE bookings SET status = 'pending' WHERE id = $1", [input.bookingId]);
  await pool.query("UPDATE connectors SET status = 'in_use' WHERE id = $1", [
    r.rows[0].connector_id,
  ]);
  const chargeId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const startedAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO charges (id,booking_id,user_id,connector_id,point_id,started_at,ended_at,kwh,amount_brl)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,0,0)`,
    [chargeId, input.bookingId, input.userId, r.rows[0].connector_id, r.rows[0].point_id, startedAt],
  );
  const booking = await getBooking(input.bookingId);
  const charge = await getCharge(input.bookingId);
  return { ok: true, booking: booking!, charge: charge! };
}

export async function createReservation(input: {
  userId: string;
  pointId: string;
  connectorId: string;
  planId: PlanId;
  start: number;
  durationMin: number;
}): Promise<Booking> {
  return createBooking({
    userId: input.userId,
    connectorId: input.connectorId,
    plan: input.planId,
    startHour: input.start,
    durationMin: input.durationMin,
  });
}

/** Le o userId do cookie de sessao (raw, sem verificar HMAC — usado server-side). */
export function getUserIdFromHeaders(headers: Headers): string {
  const cookieHeader = headers.get("cookie") ?? "";
  const raw = (headers as Headers).get?.("cookie") ?? cookieHeader;
  const m = raw.match(/voltrio_session=([^;]+)/);
  if (!m) return "";
  try {
    const token = decodeURIComponent(m[1]);
    const dot = token.indexOf(".");
    if (dot <= 0) return "";
    const body = token.slice(0, dot);
    const padded = body + "===".slice((body.length + 3) % 4);
    const json = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    const payload = JSON.parse(json) as { userId?: string };
    return payload.userId ?? "";
  } catch {
    return "";
  }
}

export type { Point, Connector, Booking, Subscriber, Subscription, DayPoint };
