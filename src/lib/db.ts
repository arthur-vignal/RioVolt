/**
 * db.ts — Fachada única de persistência do Voltrio.
 *
 * Em dev local (sem DATABASE_URL), usa SQLite (better-sqlite3) com arquivo
 * em .data/voltrio.db.
 *
 * Em produção (DATABASE_URL presente, ex: Postgres no Railway/Supabase),
 * delega para o módulo pg e usa Postgres.
 *
 * A API pública abaixo é a MESMA nos dois backends — as páginas /api/*
 * consomem isso sem saber qual banco está ativo.
 *
 * Senha de demo (todos os usuários): "volta123"
 *
 * API:
 *   listPoints, listConnectors, listBookingsForDay
 *   getSubscriberByEmail, listAllSubscribers, listAllUsers
 *   findUserByEmail, findUserById, verifyPassword
 *   createBooking, cancelBooking, updateBookingStatus
 *   incrementSubscriptionKwh, updateSubscriberStatus
 *   updateSubscriberStatusByName, incrementKwhByName
 *   updateConnectorStatus, createPoint
 *   getSetting, getSettingNumber, setSetting
 *   getProfile, updateProfile
 *   getBooking, getPoint
 *   listBookingsForUser, listChargesForUser
 *   startCharge, createReservation
 *   initSeed
 */

const HAS_PG = !!process.env.DATABASE_URL;

type PgModule = typeof import("./db-pg");
type SqliteModule = typeof import("./db-sqlite");

let _pg: PgModule | null = null;
let _sqlite: SqliteModule | null = null;

function pg(): PgModule {
  if (!_pg) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _pg = require("./db-pg") as PgModule;
  }
  return _pg;
}

function sqlite(): SqliteModule {
  if (_sqlite !== null) return _sqlite;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _sqlite = require("./db-sqlite") as SqliteModule;
    return _sqlite;
  } catch (err) {
    // Em produção sem DATABASE_URL, better-sqlite3 (optional) não está
    // instalado. Em vez de crashar o app, devolve stubs que retornam
    // vazio/zero — assim as telas (Páginas) abrem mesmo sem backend.
    console.error(
      "[voltrio/db] better-sqlite3 não disponível (production sem DATABASE_URL). " +
      "Voltando para stubs vazios.",
      err instanceof Error ? err.message : err,
    );
    _sqlite = createEmptySqliteStub();
    return _sqlite;
  }
}

// ---------------------------------------------------------------- delegates
// Cada função abaixo delega pro backend certo, normalizando a Promise
// (sqlite já é síncrono, então empacotamos em Promise.resolve quando necessário).

/**
 * Stub vazio pra SQLite. Usado em prod quando DATABASE_URL não está setada
 * e better-sqlite3 (optional) não foi instalado. Tudo retorna vazio/undefined,
 * exceto initSeed (no-op). As páginas do app continuam abrindo em modo leitura
 * — sem dados persistentes — em vez de crashar.
 */
const emptyStub: SqliteModule = new Proxy({} as SqliteModule, {
  get(_target, prop: string) {
    if (prop === "initSeed") return () => undefined;
    // Qualquer função chamada devolve o "empty default" adequado ao tipo dela.
    return (..._args: unknown[]) => undefined;
  },
}) as SqliteModule;

function createEmptySqliteStub(): SqliteModule {
  return emptyStub;
}

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

// Re-exports para tipos públicos
export type { Point, Connector, Booking, Subscriber, Subscription, DayPoint } from "@/lib/mock-data";

// ----- init -----
export async function initSeed(): Promise<void> {
  if (HAS_PG) {
    await pg().initSchema();
    await pg().seedIfEmpty();
  } else {
    sqlite().initSeed();
  }
}

// ----- reads -----
export async function listPoints() {
  return HAS_PG ? pg().listPoints() : Promise.resolve(sqlite().listPoints());
}
export async function listConnectors() {
  return HAS_PG ? pg().listConnectors() : Promise.resolve(sqlite().listConnectors());
}
export async function listBookingsForDay(date: string) {
  return HAS_PG ? pg().listBookingsForDay(date) : Promise.resolve(sqlite().listBookingsForDay(date));
}
export async function getSubscriberByEmail(email: string) {
  return HAS_PG ? pg().getSubscriberByEmail(email) : Promise.resolve(sqlite().getSubscriberByEmail(email));
}
export async function listAllSubscribers() {
  return HAS_PG ? pg().listAllSubscribers() : Promise.resolve(sqlite().listAllSubscribers());
}
export async function listAllUsers() {
  return HAS_PG ? pg().listAllUsers() : Promise.resolve(sqlite().listAllUsers());
}
export async function findUserByEmail(email: string) {
  return HAS_PG ? pg().findUserByEmail(email) : Promise.resolve(sqlite().findUserByEmail(email));
}
export async function findUserById(id: string) {
  return HAS_PG ? pg().findUserById(id) : Promise.resolve(sqlite().findUserById(id));
}
export async function verifyPassword(email: string, password: string) {
  return HAS_PG ? pg().verifyPassword(email, password) : Promise.resolve(sqlite().verifyPassword(email, password));
}
export async function getProfile(userId: string) {
  return HAS_PG ? pg().getProfile(userId) : Promise.resolve(sqlite().getProfile(userId));
}
export async function updateProfile(userId: string, patch: { name?: string; plate?: string; vehicle?: string }) {
  return HAS_PG ? pg().updateProfile(userId, patch) : sqlite().updateProfile(userId, patch);
}
export async function getBooking(id: string) {
  return HAS_PG ? pg().getBooking(id) : Promise.resolve(sqlite().getBooking(id));
}
export async function getPoint(id: string) {
  return HAS_PG ? pg().getPoint(id) : Promise.resolve(sqlite().getPoint(id));
}
export async function listBookingsForUser(userId: string) {
  return HAS_PG ? pg().listBookingsForUser(userId) : Promise.resolve(sqlite().listBookingsForUser(userId));
}
export async function listChargesForUser(userId: string) {
  return HAS_PG ? pg().listChargesForUser(userId) : Promise.resolve(sqlite().listChargesForUser(userId));
}
export async function getCharge(bookingId: string) {
  return HAS_PG ? pg().getCharge(bookingId) : Promise.resolve(sqlite().getCharge(bookingId));
}

// ----- writes -----
export async function createBooking(input: {
  userId: string;
  connectorId: string;
  plan: "noturno" | "pro";
  startHour: number;
  durationMin: number;
}) {
  return HAS_PG ? pg().createBooking(input) : sqlite().createBooking(input);
}
export async function cancelBooking(id: string) {
  return HAS_PG ? pg().cancelBooking(id) : sqlite().cancelBooking(id);
}
export async function updateBookingStatus(id: string, status: Booking["status"]) {
  return HAS_PG ? pg().updateBookingStatus(id, status) : sqlite().updateBookingStatus(id, status);
}
export async function incrementSubscriptionKwh(subId: number, kwh: number) {
  return HAS_PG ? pg().incrementSubscriptionKwh(subId, kwh) : sqlite().incrementSubscriptionKwh(subId, kwh);
}
export async function updateSubscriberStatus(id: number, status: Subscriber["status"]) {
  return HAS_PG ? pg().updateSubscriberStatus(id, status) : sqlite().updateSubscriberStatus(id, status);
}
export async function updateSubscriberStatusByName(name: string, status: Subscriber["status"]) {
  return HAS_PG ? pg().updateSubscriberStatusByName(name, status) : sqlite().updateSubscriberStatusByName(name, status);
}
export async function incrementKwhByName(name: string, delta: number) {
  return HAS_PG ? pg().incrementKwhByName(name, delta) : sqlite().incrementKwhByName(name, delta);
}
export async function updateConnectorStatus(connectorId: string, status: Connector["status"]) {
  return HAS_PG ? pg().updateConnectorStatus(connectorId, status) : sqlite().updateConnectorStatus(connectorId, status);
}
export async function createPoint(input: {
  name: string;
  neighborhood: string;
  lat: number;
  lon: number;
  kind: Connector["kind"];
  powerKw: number;
  partner: string;
}) {
  return HAS_PG ? pg().createPoint(input) : sqlite().createPoint(input);
}
export async function getSetting(key: string) {
  return HAS_PG ? pg().getSetting(key) : Promise.resolve(sqlite().getSetting(key));
}
export async function getSettingNumber(key: string) {
  return HAS_PG ? pg().getSettingNumber(key) : Promise.resolve(sqlite().getSettingNumber(key));
}
export async function setSetting(key: string, value: string | number) {
  return HAS_PG ? pg().setSetting(key, value) : sqlite().setSetting(key, value);
}
export async function startCharge(input: { userId: string; bookingId: string }) {
  return HAS_PG ? pg().startCharge(input) : sqlite().startCharge(input);
}
export async function createReservation(input: {
  userId: string;
  pointId: string;
  connectorId: string;
  planId: "noturno" | "pro";
  start: number;
  durationMin: number;
}) {
  return HAS_PG ? pg().createReservation(input) : sqlite().createReservation(input);
}



// ----- headers util (sync, nao passa pelo banco) -----
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
// Re-import dos tipos para que o resto do app continue funcionando
import type { Booking, Subscriber, Connector, Point } from "@/lib/mock-data";
