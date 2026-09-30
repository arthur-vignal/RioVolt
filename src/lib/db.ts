/**
 * db.ts — Fachada única de persistência do Voltrio.
 *
 * Em dev local (sem DATABASE_URL), usa SQLite (better-sqlite3) com arquivo
 * em .data/voltrio.db.
 *
 * Em produção (DATABASE_URL presente, ex: Postgres no Railway), delega
 * para o módulo db-pg via namespace import.
 */

import * as pgMod from "./db-pg";
import type {
  Booking,
  Subscriber,
  Connector,
  Point,
  Subscription,
  DayPoint,
} from "@/lib/mock-data";

type PgModule = typeof pgMod;
type SqliteModule = typeof import("./db-sqlite");

// Avalia DATABASE_URL em CADA chamada — não em build-time.
// (Turbopack faria inlining se fosse const, quebrando prod sem env em build.)
function hasPg(): boolean {
  return !!process.env.DATABASE_URL;
}

function pg(): PgModule {
  return pgMod;
}

function sqlite(): SqliteModule {
  // Lazy load via require (string direta) pra tree-shaking compatível com
  // Turbopack standalone. Em prod sem sqlite, devolve stub vazio.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("./db-sqlite") as SqliteModule;
  } catch (err) {
    console.error(
      "[voltrio/db] better-sqlite3 não disponível. Voltando para stubs vazios.",
      err instanceof Error ? err.message : err,
    );
    return createEmptySqliteStub();
  }
}

/** Stub vazio pra SQLite. Em prod sem sqlite, todas as funções retornam
 *  undefined/vazio — as páginas continuam abrindo. */
const emptyStub: SqliteModule = new Proxy({} as SqliteModule, {
  get(_target, prop: string) {
    if (prop === "initSeed") return () => undefined;
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

// Re-exports de tipos
export type { Point, Connector, Booking, Subscriber, Subscription, DayPoint };

// ----- init -----
export async function initSeed(): Promise<void> {
  if (hasPg()) {
    await pgMod.initSchema();
    await pgMod.seedIfEmpty();
  } else {
    sqlite().initSeed();
  }
}

// ----- reads -----
export function listPoints() {
  return hasPg() ? pgMod.listPoints() : Promise.resolve(sqlite().listPoints());
}
export function listConnectors() {
  return hasPg() ? pgMod.listConnectors() : Promise.resolve(sqlite().listConnectors());
}
export function listBookingsForDay(date: string) {
  return hasPg() ? pgMod.listBookingsForDay(date) : Promise.resolve(sqlite().listBookingsForDay(date));
}
export function getSubscriberByEmail(email: string) {
  return hasPg() ? pgMod.getSubscriberByEmail(email) : Promise.resolve(sqlite().getSubscriberByEmail(email));
}
export function listAllSubscribers() {
  return hasPg() ? pgMod.listAllSubscribers() : Promise.resolve(sqlite().listAllSubscribers());
}
export function listAllUsers() {
  return hasPg() ? pgMod.listAllUsers() : Promise.resolve(sqlite().listAllUsers());
}
export function findUserByEmail(email: string) {
  return hasPg() ? pgMod.findUserByEmail(email) : Promise.resolve(sqlite().findUserByEmail(email));
}
export function findUserById(id: string) {
  return hasPg() ? pgMod.findUserById(id) : Promise.resolve(sqlite().findUserById(id));
}
export function verifyPassword(email: string, password: string) {
  return hasPg() ? pgMod.verifyPassword(email, password) : Promise.resolve(sqlite().verifyPassword(email, password));
}
export function getProfile(userId: string) {
  return hasPg() ? pgMod.getProfile(userId) : Promise.resolve(sqlite().getProfile(userId));
}
export function updateProfile(userId: string, patch: { name?: string; plate?: string; vehicle?: string }) {
  return hasPg() ? pgMod.updateProfile(userId, patch) : sqlite().updateProfile(userId, patch);
}
export function getBooking(id: string) {
  return hasPg() ? pgMod.getBooking(id) : Promise.resolve(sqlite().getBooking(id));
}
export function getPoint(id: string) {
  return hasPg() ? pgMod.getPoint(id) : Promise.resolve(sqlite().getPoint(id));
}
export function listBookingsForUser(userId: string) {
  return hasPg() ? pgMod.listBookingsForUser(userId) : Promise.resolve(sqlite().listBookingsForUser(userId));
}
export function listChargesForUser(userId: string) {
  return hasPg() ? pgMod.listChargesForUser(userId) : Promise.resolve(sqlite().listChargesForUser(userId));
}
export function getCharge(bookingId: string) {
  return hasPg() ? pgMod.getCharge(bookingId) : Promise.resolve(sqlite().getCharge(bookingId));
}

// ----- writes -----
export function createBooking(input: {
  userId: string;
  connectorId: string;
  plan: "noturno" | "pro";
  startHour: number;
  durationMin: number;
}) {
  return hasPg() ? pgMod.createBooking(input) : sqlite().createBooking(input);
}
export function cancelBooking(id: string) {
  return hasPg() ? pgMod.cancelBooking(id) : sqlite().cancelBooking(id);
}
export function updateBookingStatus(id: string, status: Booking["status"]) {
  return hasPg() ? pgMod.updateBookingStatus(id, status) : sqlite().updateBookingStatus(id, status);
}
export function incrementSubscriptionKwh(subId: number, kwh: number) {
  return hasPg() ? pgMod.incrementSubscriptionKwh(subId, kwh) : sqlite().incrementSubscriptionKwh(subId, kwh);
}
export function updateSubscriberStatus(id: number, status: Subscriber["status"]) {
  return hasPg() ? pgMod.updateSubscriberStatus(id, status) : sqlite().updateSubscriberStatus(id, status);
}
export function updateSubscriberStatusByName(name: string, status: Subscriber["status"]) {
  return hasPg() ? pgMod.updateSubscriberStatusByName(name, status) : sqlite().updateSubscriberStatusByName(name, status);
}
export function incrementKwhByName(name: string, delta: number) {
  return hasPg() ? pgMod.incrementKwhByName(name, delta) : sqlite().incrementKwhByName(name, delta);
}
export function updateConnectorStatus(connectorId: string, status: Connector["status"]) {
  return hasPg() ? pgMod.updateConnectorStatus(connectorId, status) : sqlite().updateConnectorStatus(connectorId, status);
}
export function createPoint(input: {
  name: string;
  neighborhood: string;
  lat: number;
  lon: number;
  kind: Connector["kind"];
  powerKw: number;
  partner: string;
}) {
  return hasPg() ? pgMod.createPoint(input) : sqlite().createPoint(input);
}
export function getSetting(key: string) {
  return hasPg() ? pgMod.getSetting(key) : Promise.resolve(sqlite().getSetting(key));
}
export function getSettingNumber(key: string) {
  return hasPg() ? pgMod.getSettingNumber(key) : Promise.resolve(sqlite().getSettingNumber(key));
}
export function setSetting(key: string, value: string | number) {
  return hasPg() ? pgMod.setSetting(key, value) : sqlite().setSetting(key, value);
}
export function startCharge(input: { userId: string; bookingId: string }) {
  return hasPg() ? pgMod.startCharge(input) : sqlite().startCharge(input);
}
export function createReservation(input: {
  userId: string;
  pointId: string;
  connectorId: string;
  planId: "noturno" | "pro";
  start: number;
  durationMin: number;
}) {
  return hasPg() ? pgMod.createReservation(input) : sqlite().createReservation(input);
}

// ----- headers util (sync, não passa pelo banco) -----
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