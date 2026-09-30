// ops-db.ts — Wrapper async sobre src/lib/db.ts (SQLite ou Postgres).
// Mantém a API async que o painel dos donos espera. Todas as funções aqui
// simplesmente delegam para a fachada central do Voltrio.

import type {
  Point,
  Connector,
  Booking,
  Subscriber,
  PointStatus,
  ChargerKind,
} from "@/lib/mock-data";
import * as db from "@/lib/db";

export type SubscriberStatus = Subscriber["status"];
export type BookingStatus = Booking["status"];

export type Settings = {
  kwhPrice: number;
};

const DEFAULT_SETTINGS: Settings = { kwhPrice: 2.04 };

export async function listPoints(): Promise<Point[]> {
  return db.listPoints();
}

export async function listConnectors(): Promise<
  Array<Connector & { pointName: string; neighborhood: string }>
> {
  const points = await db.listPoints();
  const flat: Array<Connector & { pointName: string; neighborhood: string }> = [];
  for (const p of points) {
    for (const c of p.connectors) {
      flat.push({ ...c, pointName: p.name, neighborhood: p.neighborhood });
    }
  }
  return flat;
}

export async function listAllBookings(): Promise<Booking[]> {
  return db.listBookingsForDay("");
}

export async function listAllSubscribers(): Promise<Subscriber[]> {
  return db.listAllSubscribers();
}

export async function readSettings(): Promise<Settings> {
  const v = await db.getSettingNumber("kwhPrice");
  return { kwhPrice: v ?? DEFAULT_SETTINGS.kwhPrice };
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<Booking | null> {
  const b = await db.updateBookingStatus(id, status);
  return b ?? null;
}

export async function updateConnectorStatus(
  connectorId: string,
  status: PointStatus,
): Promise<{ connectorId: string; status: PointStatus } | null> {
  const ok = await db.updateConnectorStatus(connectorId, status);
  return ok ? { connectorId, status } : null;
}

export async function updateSubscriberStatus(
  name: string,
  status: SubscriberStatus,
): Promise<Subscriber | null> {
  return db.updateSubscriberStatusByName(name, status);
}

export async function incrementKwh(
  subscriberName: string,
  deltaKwh: number,
): Promise<Subscriber | null> {
  return db.incrementKwhByName(subscriberName, deltaKwh);
}

export type CreatePointInput = {
  name: string;
  neighborhood: string;
  lat: number;
  lon: number;
  kind: ChargerKind;
  powerKw: number;
  partner: string;
};

export async function createPoint(input: CreatePointInput): Promise<Point> {
  return db.createPoint(input);
}

export async function getSetting<K extends keyof Settings>(
  key: K,
): Promise<Settings[K]> {
  const v = await db.getSetting(key);
  if (v == null) return DEFAULT_SETTINGS[key] as Settings[K];
  if (key === "kwhPrice") return Number(v) as Settings[K];
  return v as unknown as Settings[K];
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<Settings> {
  await db.setSetting(key, value as unknown as string | number);
  return readSettings();
}
