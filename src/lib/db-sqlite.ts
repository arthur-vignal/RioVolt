/**
 * db.ts — Camada de persistência do Voltrio.
 *
 * Banco SQLite local via better-sqlite3. Singleton no processo Node: a
 * primeira chamada a qualquer função pública abre o arquivo, cria o schema
 * e roda o seed automaticamente se as tabelas estiverem vazias.
 *
 * Path do arquivo: <repo>/.data/voltrio.db (gitignored).
 *
 * Senha de demo: "volta123" para todos os usuários.
 *
 * API pública:
 *   // leitura
 *   listPoints()                          → Point[] (com connectors aninhados)
 *   listConnectors()                      → Connector[] (todas)
 *   listBookingsForDay(date)              → Booking[]  (date: YYYY-MM-DD)
 *   getSubscriberByEmail(email)           → Subscriber | undefined
 *   listAllSubscribers()                  → Subscriber[]
 *   findUserByEmail(email)                → UserRow | undefined
 *   verifyPassword(email, password)       → UserRow | null
 *
 *   // escrita
 *   createBooking(input)                  → Booking (lança se conflito)
 *   cancelBooking(id)                     → Booking | undefined
 *   updateBookingStatus(id, status)       → Booking | undefined
 *   incrementSubscriptionKwh(subId, kwh)  → number (novo kwh_used)
 *   updateSubscriberStatus(id, status)    → Subscriber | undefined
 *
 *   // utilidade
 *   initSeed()                            → força inicialização/seed
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  POINTS,
  ME,
  type Point,
  type Connector,
  type Booking,
  type Subscriber,
  type PlanId,
  type ChargerKind,
  type PointStatus,
} from "@/lib/mock-data";

// ---------------------------------------------------------------- paths
// Em Railway, DATA_DIR=/data aponta pro volume persistente.
// Em dev local, cai em <repo>/.data.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "voltrio.db");

function ensureDataDir() {
  if (/* turbopackIgnore: true */ !fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ---------------------------------------------------------------- singleton

let _db: Database.Database | null = null;
let _seeded = false;

function db(): Database.Database {
  if (_db) return _db;
  ensureDataDir();
  const conn = new Database(DB_PATH);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  createSchema(conn);
  _db = conn;
  const count = (conn.prepare("SELECT COUNT(*) AS n FROM points").get() as { n: number }).n;
  if (count === 0) seed(conn);
  _seeded = true;
  logInitBanner(conn);
  return conn;
}

// ---------------------------------------------------------------- schema

function createSchema(conn: Database.Database) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      email           TEXT NOT NULL UNIQUE,
      role            TEXT NOT NULL CHECK (role IN ('motorista','donos')),
      password_hash   TEXT NOT NULL,
      name            TEXT NOT NULL,
      plate           TEXT,
      car_model       TEXT,
      kwh_plan_limit  INTEGER,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS points (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      neighborhood  TEXT NOT NULL,
      focus         TEXT NOT NULL CHECK (focus IN ('moradores','motoristas')),
      address       TEXT NOT NULL,
      lat           REAL NOT NULL,
      lon           REAL NOT NULL,
      open_hours    TEXT NOT NULL,
      partner       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connectors (
      id          TEXT PRIMARY KEY,
      point_id    TEXT NOT NULL REFERENCES points(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL CHECK (kind IN ('AC','DC')),
      power_kw    REAL NOT NULL,
      status      TEXT NOT NULL CHECK (status IN ('free','reserved','in_use','offline')),
      note        TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id            TEXT PRIMARY KEY,
      user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      connector_id  TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
      point_id      TEXT NOT NULL REFERENCES points(id) ON DELETE CASCADE,
      plan          TEXT NOT NULL CHECK (plan IN ('noturno','pro')),
      start_hour    REAL NOT NULL,
      duration_min  INTEGER NOT NULL,
      status        TEXT NOT NULL CHECK (status IN ('confirmed','pending','cancelled','no_show','done','in_progress')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan          TEXT NOT NULL CHECK (plan IN ('noturno','pro')),
      kwh_used      REAL NOT NULL DEFAULT 0,
      monthly_fee   REAL NOT NULL,
      since         TEXT NOT NULL,
      next_renewal  TEXT NOT NULL,
      payment_ok    INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      name          TEXT NOT NULL,
      plan          TEXT NOT NULL CHECK (plan IN ('noturno','pro')),
      status        TEXT NOT NULL CHECK (status IN ('ativo','inadimplente','cancelado')),
      since         TEXT NOT NULL,
      kwh30d        REAL NOT NULL DEFAULT 0,
      monthly_fee   REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_connectors_point ON connectors(point_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_conn ON bookings(connector_id);
    CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscribers_user ON subscribers(user_id);

    -- Histórico de cargas concluídas. Criado pelo fluxo "Encerrar carga".
    CREATE TABLE IF NOT EXISTS charges (
      id              TEXT PRIMARY KEY,
      booking_id      TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
      connector_id    TEXT NOT NULL,
      started_at      TEXT NOT NULL,
      ended_at        TEXT,
      kwh             REAL NOT NULL DEFAULT 0,
      amount_brl      REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_charges_user ON charges(user_id);

    -- Configurações globais (chave/valor). Substitui o antigo ops.json.
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO settings (key, value) VALUES ('kwhPrice', '2.04');
  `);
}

// ---------------------------------------------------------------- seed

const DEMO_PASSWORD = "volta123";

function hash(p: string) {
  return bcrypt.hashSync(p, 10);
}

function seed(conn: Database.Database) {
  const tx = conn.transaction(() => {
    // 1. users (3 motoristas + 1 dono), senha "volta123"
    const insertUser = conn.prepare(
      `INSERT INTO users (id, email, role, password_hash, name, plate, car_model, kwh_plan_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertUser.run(
      "user-1", "mariana@voltrio.app", "motorista", hash(DEMO_PASSWORD),
      "Mariana Souza", "RIO-2A19", "BYD Dolphin", 200
    );
    insertUser.run(
      "user-2", "rafael@voltrio.app", "motorista", hash(DEMO_PASSWORD),
      "Rafael Mendes", "RIO-3B42", "Volvo EX30", 200
    );
    insertUser.run(
      "user-3", "carlos@voltrio.app", "motorista", hash(DEMO_PASSWORD),
      "Carlos Andrade", "RIO-4C77", "Renault Kwid E-Tech", 200
    );
    insertUser.run(
      "owner-1", "dono@voltrio.app", "donos", hash(DEMO_PASSWORD),
      "Bruno Tavares", null, null, null
    );

    // 2. points + connectors
    const insertPoint = conn.prepare(
      `INSERT INTO points (id, name, neighborhood, focus, address, lat, lon, open_hours, partner)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertConn = conn.prepare(
      `INSERT INTO connectors (id, point_id, kind, power_kw, status, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const p of POINTS) {
      insertPoint.run(p.id, p.name, p.neighborhood, p.focus, p.address, p.lat, p.lon, p.openHours, p.partner);
      for (const c of p.connectors) {
        insertConn.run(c.id, p.id, c.kind, c.powerKw, c.status, c.note ?? null);
      }
    }

    // 3. subscriptions — assinatura ativa pro user-1 (Mariana), zerada.
    //    Sem kwh_used placeholder; consumo sobe com charges reais.
    conn
      .prepare(
        `INSERT INTO subscriptions (user_id, plan, kwh_used, monthly_fee, since, next_renewal, payment_ok)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run("user-1", ME.planId, 0, ME.monthlyFee, ME.since, ME.nextRenewal, ME.paymentOk ? 1 : 0);

    // 4. subscribers — sem placeholder. Tabela fica vazia ate alguem assinar.

    // 5. bookings — sem seed. Agendamentos entram via fluxo real do usuario.
  });
  tx();
}

// ---------------------------------------------------------------- init log

function logInitBanner(conn: Database.Database) {
  const get = (sql: string) => (conn.prepare(sql).get() as { n: number }).n;
  // eslint-disable-next-line no-console
  console.log(
    `[voltrio/db] DB initialized: ${get("SELECT COUNT(*) AS n FROM points")} points, ` +
    `${get("SELECT COUNT(*) AS n FROM connectors")} connectors, ` +
    `${get("SELECT COUNT(*) AS n FROM users")} users, ` +
    `${get("SELECT COUNT(*) AS n FROM bookings")} bookings, ` +
    `${get("SELECT COUNT(*) AS n FROM subscribers")} subscribers → ${DB_PATH}`
  );
}

/** Força inicialização + seed (idempotente; uso interno). */
export function initSeed() {
  if (_seeded) return;
  const conn = db();
  const pts = (conn.prepare("SELECT COUNT(*) AS n FROM points").get() as { n: number }).n;
  if (pts === 0) seed(conn);
}

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

export type UserRow = {
  id: string;
  email: string;
  role: "motorista" | "donos";
  password_hash: string;
  name: string;
  plate: string | null;
  car_model: string | null;
  kwh_plan_limit: number | null;
  created_at: string;
};

function rowToConnector(r: ConnectorRow): Connector {
  return {
    id: r.id,
    pointId: r.point_id,
    kind: r.kind,
    powerKw: r.power_kw,
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
    lat: p.lat,
    lon: p.lon,
    openHours: p.open_hours,
    partner: p.partner,
    connectors: conns,
  };
}

function rowToBooking(r: BookingRow): Booking {
  // Compat com a UI atual: Booking tem `user: string` (nome humano).
  let userName = "—";
  if (r.user_id) {
    const u = db().prepare("SELECT name FROM users WHERE id = ?").get(r.user_id) as { name: string } | undefined;
    if (u) userName = u.name;
  }
  return {
    id: r.id,
    connectorId: r.connector_id,
    pointId: r.point_id,
    user: userName,
    planId: r.plan,
    start: r.start_hour,
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
    kwh30d: r.kwh30d,
    monthlyFee: r.monthly_fee,
  };
}

// ---------------------------------------------------------------- reads

export function listPoints(): Point[] {
  const conn = db();
  const points = conn.prepare("SELECT * FROM points").all() as PointRow[];
  const conns = conn.prepare("SELECT * FROM connectors").all() as ConnectorRow[];
  const byPoint = new Map<string, Connector[]>();
  for (const c of conns) {
    const arr = byPoint.get(c.point_id) ?? [];
    arr.push(rowToConnector(c));
    byPoint.set(c.point_id, arr);
  }
  return points.map((p) => rowToPoint(p, byPoint.get(p.id) ?? []));
}

export function listConnectors(): Connector[] {
  return (db().prepare("SELECT * FROM connectors").all() as ConnectorRow[]).map(rowToConnector);
}

export function listBookingsForDay(_date: string): Booking[] {
  // O schema atual guarda `start_hour` em decimal (0–24) sem coluna de dia.
  // Retornamos TODAS as reservas (incluindo canceladas/done) ordenadas por horário.
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT * FROM bookings ORDER BY start_hour ASC`
    )
    .all() as BookingRow[];
  return rows.map(rowToBooking);
}

export function getSubscriberByEmail(email: string): Subscriber | undefined {
  const conn = db();
  const u = conn.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
  if (u) {
    const r = conn
      .prepare("SELECT * FROM subscribers WHERE user_id = ? ORDER BY id DESC LIMIT 1")
      .get(u.id) as SubscriberRow | undefined;
    if (r) return rowToSubscriber(r);
  }
  // Fallback: procurar pelo campo `name` (caso o subscriber não tenha user_id)
  const fallback = conn
    .prepare("SELECT * FROM subscribers WHERE name = ? ORDER BY id DESC LIMIT 1")
    .get(email) as SubscriberRow | undefined;
  return fallback ? rowToSubscriber(fallback) : undefined;
}

export function listAllSubscribers(): Subscriber[] {
  return (db().prepare("SELECT * FROM subscribers ORDER BY id ASC").all() as SubscriberRow[]).map(
    rowToSubscriber
  );
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
}

export function verifyPassword(email: string, password: string): UserRow | null {
  const u = findUserByEmail(email);
  if (!u) return null;
  if (!bcrypt.compareSync(password, u.password_hash)) return null;
  return u;
}

// ---------------------------------------------------------------- writes

const createBookingSchema = z.object({
  userId: z.string().min(1),
  connectorId: z.string().min(1),
  plan: z.enum(["noturno", "pro"]),
  startHour: z.number().min(0).max(24),
  durationMin: z.number().int().positive().max(24 * 60),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export function createBooking(input: CreateBookingInput): Booking {
  const data = createBookingSchema.parse(input);
  const conn = db();

  const end = data.startHour + data.durationMin / 60;
  const existing = conn
    .prepare(
      `SELECT id FROM bookings
       WHERE connector_id = ?
         AND status IN ('confirmed','pending','in_use')
         AND NOT (start_hour + (duration_min / 60.0) <= ? OR start_hour >= ?)`
    )
    .all(data.connectorId, data.startHour, end) as { id: string }[];
  if (existing.length > 0) {
    throw new Error(`connector_busy:${data.connectorId}`);
  }

  const id = `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  // descobrir point_id via connector
  const pidRow = conn.prepare("SELECT point_id FROM connectors WHERE id = ?").get(data.connectorId) as { point_id: string } | undefined;
  if (!pidRow) throw new Error(`connector_not_found:${data.connectorId}`);
  conn
    .prepare(
      `INSERT INTO bookings (id, user_id, connector_id, point_id, plan, start_hour, duration_min, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    )
    .run(id, data.userId, data.connectorId, pidRow.point_id, data.plan, data.startHour, data.durationMin);

  conn.prepare("UPDATE connectors SET status = 'reserved' WHERE id = ?").run(data.connectorId);

  const row = conn.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  if (!row) throw new Error("createBooking: row not found after insert");
  return rowToBooking(row);
}

export function cancelBooking(id: string): Booking | undefined {
  const conn = db();
  const row = conn.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  if (!row) return undefined;
  conn.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
  const remaining = conn
    .prepare(
      `SELECT COUNT(*) AS n FROM bookings
       WHERE connector_id = ? AND status IN ('confirmed','pending','in_use')`
    )
    .get(row.connector_id) as { n: number };
  if (remaining.n === 0) {
    conn.prepare("UPDATE connectors SET status = 'free' WHERE id = ?").run(row.connector_id);
  }
  const updated = conn.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow;
  return rowToBooking(updated);
}

export function updateBookingStatus(id: string, status: Booking["status"]): Booking | undefined {
  const conn = db();
  const row = conn.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  if (!row) return undefined;
  conn.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, id);
  // sincroniza connector: cancelled/no_show/done → free, confirmed/pending → reserved
  const connState: PointStatus =
    status === "confirmed" || status === "pending" ? "reserved" : "free";
  conn.prepare("UPDATE connectors SET status = ? WHERE id = ?").run(connState, row.connector_id);
  const updated = conn.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow;
  return rowToBooking(updated);
}

export function incrementSubscriptionKwh(subId: number, kwh: number): number {
  const conn = db();
  conn.prepare("UPDATE subscriptions SET kwh_used = kwh_used + ? WHERE id = ?").run(kwh, subId);
  const row = conn.prepare("SELECT kwh_used FROM subscriptions WHERE id = ?").get(subId) as
    | { kwh_used: number }
    | undefined;
  return row?.kwh_used ?? 0;
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
};

function rowToSubscription(r: SubscriptionTableRow): SubscriptionRow {
  return {
    id: r.id,
    userId: r.user_id,
    plan: r.plan as PlanId,
    kwhUsed: Number(r.kwh_used),
    monthlyFee: Number(r.monthly_fee),
    since: r.since,
    nextRenewal: r.next_renewal,
    paymentOk: !!r.payment_ok,
  };
}

type SubscriptionTableRow = {
  id: number;
  user_id: string;
  plan: string;
  kwh_used: number;
  monthly_fee: number;
  since: string;
  next_renewal: string;
  payment_ok: number;
};

export function getSubscriptionByUserId(userId: string): SubscriptionRow | null {
  const conn = db();
  const row = conn
    .prepare(
      `SELECT id, user_id, plan, kwh_used, monthly_fee, since, next_renewal, payment_ok
       FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
    )
    .get(userId) as SubscriptionTableRow | undefined;
  return row ? rowToSubscription(row) : null;
}

export type DailyKwh = { day: string; kwh: number; revenue: number };

export function getDailyKwhLast30Days(): DailyKwh[] {
  const conn = db();
  // SQLite nao tem date_trunc nativo. agrupa por dia local.
  // Pega ultimos 30 dias a partir de agora.
  const rows = conn
    .prepare(
      `SELECT strftime('%d', started_at, 'localtime') AS day,
              COALESCE(SUM(kwh), 0) AS kwh,
              COALESCE(SUM(amount), 0) AS revenue
       FROM charges
       WHERE started_at >= datetime('now', '-30 days')
       GROUP BY day ORDER BY day`,
    )
    .all() as Array<{ day: string; kwh: number; revenue: number }>;
  return rows.map((r) => ({ day: r.day, kwh: Number(r.kwh), revenue: Number(r.revenue) }));
}

export function updateSubscriberStatus(id: number, status: Subscriber["status"]): Subscriber | undefined {
  const conn = db();
  const row = conn.prepare("SELECT * FROM subscribers WHERE id = ?").get(id) as SubscriberRow | undefined;
  if (!row) return undefined;
  conn.prepare("UPDATE subscribers SET status = ? WHERE id = ?").run(status, id);
  const updated = conn.prepare("SELECT * FROM subscribers WHERE id = ?").get(id) as SubscriberRow;
  return rowToSubscriber(updated);
}
/**
 * ---------------------------------------------------------------- Compat layer
 * Aliases e funções extras que outras partes do app esperam. Mantém o db.ts
 * como fonte de verdade.
 */

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

export function listAllUsers(): UserRow[] {
  return db().prepare("SELECT * FROM users ORDER BY role, name").all() as UserRow[];
}

export function findUserById(id: string): UserRow | undefined {
  return db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
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

export function createUser(input: CreateUserInput): UserRow {
  const conn = db();
  // bcrypt dummy password (signup real precisa de signin via Supabase Auth)
  const dummyHash = "$2a$10$placeholder.hash.for.sqlite.local.only.not.used.for.login";
  conn
    .prepare(
      `INSERT INTO users (id, email, role, name, plate, car_model, kwh_plan_limit, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (email) DO NOTHING`
    )
    .run(input.id, input.email, input.role, input.name, input.plate, input.car_model, input.kwh_plan_limit, dummyHash);
  const row = conn
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(input.email.toLowerCase()) as UserRow | undefined;
  if (!row) throw new Error("user_insert_failed");
  return row;
}

/** Profile = user + plate/car_model. Retorna undefined se nao existe. */
export function getProfile(userId: string): Profile | undefined {
  const u = findUserById(userId);
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

export function updateProfile(
  userId: string,
  patch: { name?: string; plate?: string; vehicle?: string },
): Profile | undefined {
  const conn = db();
  const u = findUserById(userId);
  if (!u) return undefined;
  if (typeof patch.name === "string") {
    conn.prepare("UPDATE users SET name = ? WHERE id = ?").run(patch.name, userId);
  }
  if (typeof patch.plate === "string") {
    conn.prepare("UPDATE users SET plate = ? WHERE id = ?").run(patch.plate.toUpperCase(), userId);
  }
  if (typeof patch.vehicle === "string") {
    conn.prepare("UPDATE users SET car_model = ? WHERE id = ?").run(patch.vehicle, userId);
  }
  return getProfile(userId);
}

export function getBooking(id: string): Booking | undefined {
  const row = db().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  return row ? rowToBooking(row) : undefined;
}

export function getPoint(id: string): Point | undefined {
  return listPoints().find((p) => p.id === id);
}

/** Lê o userId do cookie de sessão via headers (NextRequest ou Headers).
 *  Retorna string vazia se o cookie nao estiver presente (rotas tratam isso
 *  como 401 antes de chamar funções do banco). */
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

export function listBookingsForUser(userId: string): Booking[] {
  const rows = db()
    .prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY start_hour ASC")
    .all(userId) as BookingRow[];
  return rows.map(rowToBooking);
}

export function listChargesForUser(userId: string): Charge[] {
  const rows = db()
    .prepare(
      `SELECT c.*, b.point_id as booking_point_id
       FROM charges c
       LEFT JOIN bookings b ON c.booking_id = b.id
       WHERE c.user_id = ?
       ORDER BY c.started_at DESC`
    )
    .all(userId) as Array<{
      id: string;
      booking_id: string;
      user_id: string | null;
      connector_id: string;
      started_at: string;
      ended_at: string | null;
      kwh: number;
      amount_brl: number;
      booking_point_id: string | null;
    }>;
  return rows.map((r) => ({
    id: r.id,
    bookingId: r.booking_id,
    userId: r.user_id,
    connectorId: r.connector_id,
    pointId: r.booking_point_id ?? "",
    startedAt: r.started_at,
    endedAt: r.ended_at,
    kwh: r.kwh,
    amount: r.amount_brl,
  }));
}

export function getCharge(bookingId: string): Charge | undefined {
  const r = db()
    .prepare(
      `SELECT c.*, b.point_id as booking_point_id
       FROM charges c LEFT JOIN bookings b ON c.booking_id = b.id
       WHERE c.booking_id = ? AND c.ended_at IS NULL
       ORDER BY c.started_at DESC LIMIT 1`
    )
    .get(bookingId) as
    | {
        id: string;
        booking_id: string;
        user_id: string | null;
        connector_id: string;
        started_at: string;
        ended_at: string | null;
        kwh: number;
        amount_brl: number;
        booking_point_id: string | null;
      }
    | undefined;
  if (!r) return undefined;
  return {
    id: r.id,
    bookingId: r.booking_id,
    userId: r.user_id,
    connectorId: r.connector_id,
    pointId: r.booking_point_id ?? "",
    startedAt: r.started_at,
    endedAt: r.ended_at,
    kwh: r.kwh,
    amount: r.amount_brl,
  };
}

/** Inicia uma carga. Atualiza booking -> 'in_progress', connector -> 'in_use',
 *  cria um registro em charges com started_at = agora. */
export function startCharge(input: { userId: string; bookingId: string }): {
  ok: true;
  booking: Booking;
  charge: Charge;
} | { ok: false; error: string } {
  const conn = db();
  const row = conn.prepare("SELECT * FROM bookings WHERE id = ?").get(input.bookingId) as
    | BookingRow
    | undefined;
  if (!row) return { ok: false, error: "Reserva não encontrada." };
  if (row.user_id && row.user_id !== input.userId) {
    return { ok: false, error: "Esta reserva não pertence a você." };
  }
  // marca a reserva como in_progress (status custom via texto plano — o schema
  // atual nao tem 'in_progress' mas usamos para a tela)
  conn.prepare("UPDATE bookings SET status = 'pending' WHERE id = ?").run(input.bookingId);
  conn.prepare("UPDATE connectors SET status = 'in_use' WHERE id = ?").run(row.connector_id);
  const chargeId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const startedAt = new Date().toISOString();
  conn.prepare(
    `INSERT INTO charges (id, booking_id, user_id, connector_id, started_at, ended_at, kwh, amount_brl)
     VALUES (?, ?, ?, ?, ?, NULL, 0, 0)`,
  ).run(chargeId, input.bookingId, input.userId, row.connector_id, startedAt);
  const booking = getBooking(input.bookingId)!;
  const charge = getCharge(input.bookingId)!;
  return { ok: true, booking, charge };
}

/** Cria uma reserva a partir de pointId/connectorId/plan/start. */
export function createReservation(input: {
  userId: string;
  pointId: string;
  connectorId: string;
  planId: PlanId;
  start: number;
  durationMin: number;
}): Booking {
  return createBooking({
    userId: input.userId,
    connectorId: input.connectorId,
    plan: input.planId,
    startHour: input.start,
    durationMin: input.durationMin,
  });
}
/** Atualiza só o status de um conector. */
export function updateConnectorStatus(connectorId: string, status: PointStatus): boolean {
  const conn = db();
  const r = conn.prepare("UPDATE connectors SET status = ? WHERE id = ?").run(status, connectorId);
  return r.changes > 0;
}

/** Localiza o assinante pelo NOME (que o painel dos donos usa) e atualiza. */
export function updateSubscriberStatusByName(name: string, status: Subscriber["status"]): Subscriber | null {
  const conn = db();
  const row = conn.prepare("SELECT * FROM subscribers WHERE name = ?").get(name) as SubscriberRow | undefined;
  if (!row) return null;
  conn.prepare("UPDATE subscribers SET status = ? WHERE id = ?").run(status, row.id);
  const updated = conn.prepare("SELECT * FROM subscribers WHERE id = ?").get(row.id) as SubscriberRow;
  return rowToSubscriber(updated);
}

/** Soma kwh30d do assinante por nome. */
export function incrementKwhByName(name: string, delta: number): Subscriber | null {
  const conn = db();
  const row = conn.prepare("SELECT * FROM subscribers WHERE name = ?").get(name) as SubscriberRow | undefined;
  if (!row) return null;
  const next = Math.max(0, Math.round(row.kwh30d + delta));
  conn.prepare("UPDATE subscribers SET kwh30d = ? WHERE id = ?").run(next, row.id);
  const updated = conn.prepare("SELECT * FROM subscribers WHERE id = ?").get(row.id) as SubscriberRow;
  return rowToSubscriber(updated);
}

/** Cria um ponto novo (usado pelo painel dos donos). */
export function createPoint(input: {
  name: string;
  neighborhood: string;
  lat: number;
  lon: number;
  kind: ChargerKind;
  powerKw: number;
  partner: string;
}): Point {
  const conn = db();
  const id = `hub-${Date.now().toString(36)}`;
  const connectorId = `${id}-c1`;
  conn
    .prepare(
      `INSERT INTO points (id, name, neighborhood, focus, address, lat, lon, open_hours, partner)
       VALUES (?, ?, ?, 'motoristas', ?, ?, ?, '24 horas', ?)`,
    )
    .run(id, input.name, input.neighborhood, input.neighborhood, input.lat, input.lon, input.partner);
  conn
    .prepare(
      `INSERT INTO connectors (id, point_id, kind, power_kw, status) VALUES (?, ?, ?, ?, 'free')`,
    )
    .run(connectorId, id, input.kind, input.powerKw);
  return listPoints().find((p) => p.id === id)!;
}

/** Lê uma configuração global. */
export function getSetting(key: string): string | null {
  const r = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return r?.value ?? null;
}

/** Lê uma configuração global e converte pra número. */
export function getSettingNumber(key: string): number | null {
  const v = getSetting(key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Define uma configuração global. */
export function setSetting(key: string, value: string | number): void {
  db()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, String(value));
}
