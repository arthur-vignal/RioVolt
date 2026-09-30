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

// Avalia DATABASE_URL em CADA chamada — não em build-time.
// (Turbopack faria inlining se fosse const, quebrando prod sem env em build.)
function hasPg(): boolean {
  return !!process.env.DATABASE_URL;
}

import * as pgMod from "./db-pg";
  listConnectors as pg().listConnectors,
  listBookingsForDay as pg().listBookingsForDay,
  getSubscriberByEmail as pg().getSubscriberByEmail,
  listAllSubscribers as pg().listAllSubscribers,
  listAllUsers as pg().listAllUsers,
  findUserByEmail as pg().findUserByEmail,
  findUserById as pg().findUserById,
  verifyPassword as pg().verifyPassword,
  getProfile as pg().getProfile,
  updateProfile as pg().updateProfile,
  getBooking as pg().getBooking,
  getPoint as pg().getPoint,
  listBookingsForUser as pg().listBookingsForUser,
  listChargesForUser as pg().listChargesForUser,
  getCharge as pg().getCharge,
  createBooking as pg().createBooking,
  cancelBooking as pg().cancelBooking,
  updateBookingStatus as pg().updateBookingStatus,
  incrementSubscriptionKwh as pg().incrementSubscriptionKwh,
  updateSubscriberStatus as pg().updateSubscriberStatus,
  updateSubscriberStatusByName as pg().updateSubscriberStatusByName,
  incrementKwhByName as pg().incrementKwhByName,
  updateConnectorStatus as pg().updateConnectorStatus,
  createPoint as pg().createPoint,
  getSetting as pg().getSetting,
  getSettingNumber as pg().getSettingNumber,
  setSetting as pg().setSetting,
  startCharge as pg().startCharge,
  createReservation as pg().createReservation,
    ensureSchema as pgEnsureSchema,
    seedIfEmpty as pgSeedIfEmpty,
  } from "./db-pg";

type PgModule = typeof pgMod;
type SqliteModule = typeof import("./db-sqlite");

function pg(): PgModule {
  return pgMod;
}

// Type-only import for the SQLite fallback module signature.
// O sqlite nunca é executado em prod (HAS_PG é true), então é só type.
type SqliteModule = typeof import("./db-sqlite");

function sqlite(): SqliteModule {
  // Lazy load com require() pra não avaliar o módulo sqlite estaticamente
  // (better-sqlite3 não está instalado em prod). Usar string indireta
  // impede o Turbopack de fazer tree-shake agressivo e perder a referência.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = ["..", "lib", "db-sqlite"].join("/");
    const m = require(path) as SqliteModule;
    return m;
  } catch (err) {
    console.error(
      "[voltrio/db] better-sqlite3 não disponível (production sem DATABASE_URL). " +
      "Voltando para stubs vazios.",
      err instanceof Error ? err.message : err,
    );
    return createEmptySqliteStub();
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
  if (hasPg()) {
    await pg().initSchema();
    await pgSeedIfEmpty();
  } else {
    sqlite().initSeed();
  }
}

// ----- reads -----
export async function listPoints(): Promise<unknown> {
  return hasPg() ? pg().listPoints() : Promise.resolve(sqlite().listPoints());
}
export async function listConnectors(): Promise<unknown> {
  return hasPg() ? pg().listConnectors() : Promise.resolve(sqlite().listConnectors());
}
export async function listBookingsForDay(date: string): Promise<unknown> {
  return hasPg() ? pg().listBookingsForDay(date) : Promise.resolve(sqlite().listBookingsForDay(date));
}
export async function getSubscriberByEmail(email: string) {
  return hasPg() ? pg().getSubscriberByEmail(email) : Promise.resolve(sqlite().getSubscriberByEmail(email));
}
export async function listAllSubscribers(): Promise<unknown> {
  return hasPg() ? pg().listAllSubscribers() : Promise.resolve(sqlite().listAllSubscribers());
}
export async function listAllUsers(): Promise<unknown> {
  return hasPg() ? pg().listAllUsers() : Promise.resolve(sqlite().listAllUsers());
}
export async function findUserByEmail(email: string): Promise<unknown> {
  return hasPg() ? pg().findUserByEmail(email) : Promise.resolve(sqlite().findUserByEmail(email));
}
export async function findUserById(id: string): Promise<unknown> {
  return hasPg() ? pg().findUserById(id) : Promise.resolve(sqlite().findUserById(id));
}
export async function verifyPassword(email: string, password: string): Promise<unknown> {
  return hasPg() ? pg().verifyPassword(email, password) : Promise.resolve(sqlite().verifyPassword(email, password));
}
export async function getProfile(userId: string): Promise<unknown> {
  return hasPg() ? pg().getProfile(userId) : Promise.resolve(sqlite().getProfile(userId));
}
export async function updateProfile(userId: string, patch: { name?: string; plate?: string; vehicle?: string }): Promise<unknown> {
  return hasPg() ? pg().updateProfile(userId, patch) : sqlite().updateProfile(userId, patch);
}
export async function getBooking(id: string): Promise<unknown> {
  return hasPg() ? pg().getBooking(id) : Promise.resolve(sqlite().getBooking(id));
}
export async function getPoint(id: string): Promise<unknown> {
  return hasPg() ? pg().getPoint(id) : Promise.resolve(sqlite().getPoint(id));
}
export async function listBookingsForUser(userId: string): Promise<unknown> {
  return hasPg() ? pg().listBookingsForUser(userId) : Promise.resolve(sqlite().listBookingsForUser(userId));
}
export async function listChargesForUser(userId: string): Promise<unknown> {
  return hasPg() ? pg().listChargesForUser(userId) : Promise.resolve(sqlite().listChargesForUser(userId));
}
export async function getCharge(bookingId: string): Promise<unknown> {
  return hasPg() ? pg().getCharge(bookingId) : Promise.resolve(sqlite().getCharge(bookingId));
}

// ----- writes -----
export async function createBooking(input: {
  userId: string;
  connectorId: string;
  plan: "noturno" | "pro";
  startHour: number;
  durationMin: number;
}): Promise<unknown> {
  return hasPg() ? pg().createBooking(input) : sqlite().createBooking(input);
}
export async function cancelBooking(id: string): Promise<unknown> {
  return hasPg() ? pg().cancelBooking(id) : sqlite().cancelBooking(id);
}
export async function updateBookingStatus(id: string, status: Booking["status"]): Promise<unknown> {
  return hasPg() ? pg().updateBookingStatus(id, status) : sqlite().updateBookingStatus(id, status);
}
export async function incrementSubscriptionKwh(subId: number, kwh: number): Promise<unknown> {
  return hasPg() ? pg().incrementSubscriptionKwh(subId, kwh) : sqlite().incrementSubscriptionKwh(subId, kwh);
}
export async function updateSubscriberStatus(id: number, status: Subscriber["status"]): Promise<unknown> {
  return hasPg() ? pg().updateSubscriberStatus(id, status) : sqlite().updateSubscriberStatus(id, status);
}
export async function updateSubscriberStatusByName(name: string, status: Subscriber["status"]): Promise<unknown> {
  return hasPg() ? pg().updateSubscriberStatusByName(name, status) : sqlite().updateSubscriberStatusByName(name, status);
}
export async function incrementKwhByName(name: string, delta: number): Promise<unknown> {
  return hasPg() ? pg().incrementKwhByName(name, delta) : sqlite().incrementKwhByName(name, delta);
}
export async function updateConnectorStatus(connectorId: string, status: Connector["status"]): Promise<unknown> {
  return hasPg() ? pg().updateConnectorStatus(connectorId, status) : sqlite().updateConnectorStatus(connectorId, status);
}
export async function createPoint(input: {
  name: string;
  neighborhood: string;
  lat: number;
  lon: number;
  kind: Connector["kind"];
  powerKw: number;
  partner: string;
}): Promise<unknown> {
  return hasPg() ? pg().createPoint(input) : sqlite().createPoint(input);
}
export async function getSetting(key: string): Promise<string | null> {
  return hasPg() ? pg().getSetting(key) : Promise.resolve(sqlite().getSetting(key));
}
export async function getSettingNumber(key: string): Promise<number | null> {
  return hasPg() ? pg().getSettingNumber(key) : Promise.resolve(sqlite().getSettingNumber(key));
}
export async function setSetting(key: string, value: string | number): Promise<unknown> {
  return hasPg() ? pg().setSetting(key, value) : sqlite().setSetting(key, value);
}
export async function startCharge(input: { userId: string; bookingId: string }): Promise<unknown> {
  return hasPg() ? pg().startCharge(input) : sqlite().startCharge(input);
}
export async function createReservation(input: {
  userId: string;
  pointId: string;
  connectorId: string;
  planId: "noturno" | "pro";
  start: number;
  durationMin: number;
}): Promise<unknown> {
  return hasPg() ? pg().createReservation(input) : sqlite().createReservation(input);
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
