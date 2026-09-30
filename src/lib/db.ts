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

import {
  initSchema as pgInitSchema,
  listPoints as pgListPoints,
  listConnectors as pgListConnectors,
  listBookingsForDay as pgListBookingsForDay,
  getSubscriberByEmail as pgGetSubscriberByEmail,
  listAllSubscribers as pgListAllSubscribers,
  listAllUsers as pgListAllUsers,
  findUserByEmail as pgFindUserByEmail,
  findUserById as pgFindUserById,
  verifyPassword as pgVerifyPassword,
  getProfile as pgGetProfile,
  updateProfile as pgUpdateProfile,
  getBooking as pgGetBooking,
  getPoint as pgGetPoint,
  listBookingsForUser as pgListBookingsForUser,
  listChargesForUser as pgListChargesForUser,
  getCharge as pgGetCharge,
  createBooking as pgCreateBooking,
  cancelBooking as pgCancelBooking,
  updateBookingStatus as pgUpdateBookingStatus,
  incrementSubscriptionKwh as pgIncrementSubscriptionKwh,
  updateSubscriberStatus as pgUpdateSubscriberStatus,
  updateSubscriberStatusByName as pgUpdateSubscriberStatusByName,
  incrementKwhByName as pgIncrementKwhByName,
  updateConnectorStatus as pgUpdateConnectorStatus,
  createPoint as pgCreatePoint,
  getSetting as pgGetSetting,
  getSettingNumber as pgGetSettingNumber,
  setSetting as pgSetSetting,
  startCharge as pgStartCharge,
  createReservation as pgCreateReservation,
    ensureSchema as pgEnsureSchema,
    seedIfEmpty as pgSeedIfEmpty,
  } from "./db-pg";

type PgModule = {
  pgInitSchema: typeof pgInitSchema;
  pgListPoints: typeof pgListPoints;
  pgListConnectors: typeof pgListConnectors;
  pgListBookingsForDay: typeof pgListBookingsForDay;
  pgGetSubscriberByEmail: typeof pgGetSubscriberByEmail;
  pgListAllSubscribers: typeof pgListAllSubscribers;
  pgListAllUsers: typeof pgListAllUsers;
  pgFindUserByEmail: typeof pgFindUserByEmail;
  pgFindUserById: typeof pgFindUserById;
  pgVerifyPassword: typeof pgVerifyPassword;
  pgGetProfile: typeof pgGetProfile;
  pgUpdateProfile: typeof pgUpdateProfile;
  pgGetBooking: typeof pgGetBooking;
  pgGetPoint: typeof pgGetPoint;
  pgListBookingsForUser: typeof pgListBookingsForUser;
  pgListChargesForUser: typeof pgListChargesForUser;
  pgGetCharge: typeof pgGetCharge;
  pgCreateBooking: typeof pgCreateBooking;
  pgCancelBooking: typeof pgCancelBooking;
  pgUpdateBookingStatus: typeof pgUpdateBookingStatus;
  pgIncrementSubscriptionKwh: typeof pgIncrementSubscriptionKwh;
  pgUpdateSubscriberStatus: typeof pgUpdateSubscriberStatus;
  pgUpdateSubscriberStatusByName: typeof pgUpdateSubscriberStatusByName;
  pgIncrementKwhByName: typeof pgIncrementKwhByName;
  pgUpdateConnectorStatus: typeof pgUpdateConnectorStatus;
  pgCreatePoint: typeof pgCreatePoint;
  pgGetSetting: typeof pgGetSetting;
  pgGetSettingNumber: typeof pgGetSettingNumber;
  pgSetSetting: typeof pgSetSetting;
  pgStartCharge: typeof pgStartCharge;
  pgCreateReservation: typeof pgCreateReservation;
};

function pg(): PgModule {
  return {
    pgInitSchema,
    pgListPoints,
    pgListConnectors,
    pgListBookingsForDay,
    pgGetSubscriberByEmail,
    pgListAllSubscribers,
    pgListAllUsers,
    pgFindUserByEmail,
    pgFindUserById,
    pgVerifyPassword,
    pgGetProfile,
    pgUpdateProfile,
    pgGetBooking,
    pgGetPoint,
    pgListBookingsForUser,
    pgListChargesForUser,
    pgGetCharge,
    pgCreateBooking,
    pgCancelBooking,
    pgUpdateBookingStatus,
    pgIncrementSubscriptionKwh,
    pgUpdateSubscriberStatus,
    pgUpdateSubscriberStatusByName,
    pgIncrementKwhByName,
    pgUpdateConnectorStatus,
    pgCreatePoint,
    pgGetSetting,
    pgGetSettingNumber,
    pgSetSetting,
    pgStartCharge,
    pgCreateReservation,
  };
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
    await pgInitSchema();
    await pgSeedIfEmpty();
  } else {
    sqlite().initSeed();
  }
}

// ----- reads -----
export async function listPoints(): Promise<unknown> {
  return hasPg() ? pgListPoints() : Promise.resolve(sqlite().listPoints());
}
export async function listConnectors(): Promise<unknown> {
  return hasPg() ? pgListConnectors() : Promise.resolve(sqlite().listConnectors());
}
export async function listBookingsForDay(date: string): Promise<unknown> {
  return hasPg() ? pgListBookingsForDay(date) : Promise.resolve(sqlite().listBookingsForDay(date));
}
export async function getSubscriberByEmail(email: string) {
  return hasPg() ? pgGetSubscriberByEmail(email) : Promise.resolve(sqlite().getSubscriberByEmail(email));
}
export async function listAllSubscribers(): Promise<unknown> {
  return hasPg() ? pgListAllSubscribers() : Promise.resolve(sqlite().listAllSubscribers());
}
export async function listAllUsers(): Promise<unknown> {
  return hasPg() ? pgListAllUsers() : Promise.resolve(sqlite().listAllUsers());
}
export async function findUserByEmail(email: string): Promise<unknown> {
  return hasPg() ? pgFindUserByEmail(email) : Promise.resolve(sqlite().findUserByEmail(email));
}
export async function findUserById(id: string): Promise<unknown> {
  return hasPg() ? pgFindUserById(id) : Promise.resolve(sqlite().findUserById(id));
}
export async function verifyPassword(email: string, password: string): Promise<unknown> {
  return hasPg() ? pgVerifyPassword(email, password) : Promise.resolve(sqlite().verifyPassword(email, password));
}
export async function getProfile(userId: string): Promise<unknown> {
  return hasPg() ? pgGetProfile(userId) : Promise.resolve(sqlite().getProfile(userId));
}
export async function updateProfile(userId: string, patch: { name?: string; plate?: string; vehicle?: string }): Promise<unknown> {
  return hasPg() ? pgUpdateProfile(userId, patch) : sqlite().updateProfile(userId, patch);
}
export async function getBooking(id: string): Promise<unknown> {
  return hasPg() ? pgGetBooking(id) : Promise.resolve(sqlite().getBooking(id));
}
export async function getPoint(id: string): Promise<unknown> {
  return hasPg() ? pgGetPoint(id) : Promise.resolve(sqlite().getPoint(id));
}
export async function listBookingsForUser(userId: string): Promise<unknown> {
  return hasPg() ? pgListBookingsForUser(userId) : Promise.resolve(sqlite().listBookingsForUser(userId));
}
export async function listChargesForUser(userId: string): Promise<unknown> {
  return hasPg() ? pgListChargesForUser(userId) : Promise.resolve(sqlite().listChargesForUser(userId));
}
export async function getCharge(bookingId: string): Promise<unknown> {
  return hasPg() ? pgGetCharge(bookingId) : Promise.resolve(sqlite().getCharge(bookingId));
}

// ----- writes -----
export async function createBooking(input: {
  userId: string;
  connectorId: string;
  plan: "noturno" | "pro";
  startHour: number;
  durationMin: number;
}): Promise<unknown> {
  return hasPg() ? pgCreateBooking(input) : sqlite().createBooking(input);
}
export async function cancelBooking(id: string): Promise<unknown> {
  return hasPg() ? pgCancelBooking(id) : sqlite().cancelBooking(id);
}
export async function updateBookingStatus(id: string, status: Booking["status"]): Promise<unknown> {
  return hasPg() ? pgUpdateBookingStatus(id, status) : sqlite().updateBookingStatus(id, status);
}
export async function incrementSubscriptionKwh(subId: number, kwh: number): Promise<unknown> {
  return hasPg() ? pgIncrementSubscriptionKwh(subId, kwh) : sqlite().incrementSubscriptionKwh(subId, kwh);
}
export async function updateSubscriberStatus(id: number, status: Subscriber["status"]): Promise<unknown> {
  return hasPg() ? pgUpdateSubscriberStatus(id, status) : sqlite().updateSubscriberStatus(id, status);
}
export async function updateSubscriberStatusByName(name: string, status: Subscriber["status"]): Promise<unknown> {
  return hasPg() ? pgUpdateSubscriberStatusByName(name, status) : sqlite().updateSubscriberStatusByName(name, status);
}
export async function incrementKwhByName(name: string, delta: number): Promise<unknown> {
  return hasPg() ? pgIncrementKwhByName(name, delta) : sqlite().incrementKwhByName(name, delta);
}
export async function updateConnectorStatus(connectorId: string, status: Connector["status"]): Promise<unknown> {
  return hasPg() ? pgUpdateConnectorStatus(connectorId, status) : sqlite().updateConnectorStatus(connectorId, status);
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
  return hasPg() ? pgCreatePoint(input) : sqlite().createPoint(input);
}
export async function getSetting(key: string): Promise<string | null> {
  return hasPg() ? pgGetSetting(key) : Promise.resolve(sqlite().getSetting(key));
}
export async function getSettingNumber(key: string): Promise<number | null> {
  return hasPg() ? pgGetSettingNumber(key) : Promise.resolve(sqlite().getSettingNumber(key));
}
export async function setSetting(key: string, value: string | number): Promise<unknown> {
  return hasPg() ? pgSetSetting(key, value) : sqlite().setSetting(key, value);
}
export async function startCharge(input: { userId: string; bookingId: string }): Promise<unknown> {
  return hasPg() ? pgStartCharge(input) : sqlite().startCharge(input);
}
export async function createReservation(input: {
  userId: string;
  pointId: string;
  connectorId: string;
  planId: "noturno" | "pro";
  start: number;
  durationMin: number;
}): Promise<unknown> {
  return hasPg() ? pgCreateReservation(input) : sqlite().createReservation(input);
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
