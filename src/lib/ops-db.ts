// ops-db.ts — Wrapper síncrono sobre src/lib/db.ts (SQLite). Mantém a API
// async que o painel dos donos espera, mas persiste no mesmo banco SQLite
// que o resto do app. Substitui a versão anterior (JSON file).
//
// API exposta:
//   listPoints / listConnectors
//   listAllBookings / listAllSubscribers
//   updateBookingStatus(id, status)
//   updateConnectorStatus(id, status)
//   updateSubscriberStatus(name, status)
//   incrementKwh(subscriberName, kwh)
//   createPoint(input)
//   getSettings / setSetting(key, value)

import type {
  Point,
  Connector,
  Booking,
  Subscriber,
  PointStatus,
  ChargerKind,
} from "@/lib/mock-data";

export type SubscriberStatus = Subscriber["status"];
export type BookingStatus = Booking["status"];

export type Settings = {
  kwhPrice: number;
};

const DEFAULT_SETTINGS: Settings = { kwhPrice: 2.04 };

export async function listPoints(): Promise<Point[]> {
  const { listPoints: sqlListPoints } = await import("@/lib/db");
  return sqlListPoints();
}

export async function listConnectors(): Promise<
  Array<Connector & { pointName: string; neighborhood: string }>
> {
  const { listPoints } = await import("@/lib/db");
  const flat: Array<Connector & { pointName: string; neighborhood: string }> = [];
  for (const p of listPoints()) {
    for (const c of p.connectors) {
      flat.push({ ...c, pointName: p.name, neighborhood: p.neighborhood });
    }
  }
  return flat;
}

export async function listAllBookings(): Promise<Booking[]> {
  const { listBookingsForDay } = await import("@/lib/db");
  return listBookingsForDay("");
}

export async function listAllSubscribers(): Promise<Subscriber[]> {
  const { listAllSubscribers: sqlListAllSubscribers } = await import("@/lib/db");
  return sqlListAllSubscribers();
}

export async function readSettings(): Promise<Settings> {
  const { getSettingNumber } = await import("@/lib/db");
  const v = getSettingNumber("kwhPrice");
  return { kwhPrice: v ?? DEFAULT_SETTINGS.kwhPrice };
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<Booking | null> {
  const { updateBookingStatus: sqlUpdate } = await import("@/lib/db");
  return sqlUpdate(id, status) ?? null;
}

export async function updateConnectorStatus(
  connectorId: string,
  status: PointStatus,
): Promise<{ connectorId: string; status: PointStatus } | null> {
  const { updateConnectorStatus: sqlUpdate } = await import("@/lib/db");
  const ok = sqlUpdate(connectorId, status);
  return ok ? { connectorId, status } : null;
}

export async function updateSubscriberStatus(
  name: string,
  status: SubscriberStatus,
): Promise<Subscriber | null> {
  const { updateSubscriberStatusByName } = await import("@/lib/db");
  return updateSubscriberStatusByName(name, status);
}

export async function incrementKwh(
  subscriberName: string,
  deltaKwh: number,
): Promise<Subscriber | null> {
  const { incrementKwhByName } = await import("@/lib/db");
  return incrementKwhByName(subscriberName, deltaKwh);
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
  const { createPoint: sqlCreatePoint } = await import("@/lib/db");
  return sqlCreatePoint(input);
}

export async function getSetting<K extends keyof Settings>(
  key: K,
): Promise<Settings[K]> {
  const { getSetting } = await import("@/lib/db");
  const v = await getSetting(key);
  if (v == null) return DEFAULT_SETTINGS[key] as Settings[K];
  if (key === "kwhPrice") return Number(v) as Settings[K];
  return v as Settings[K];
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<Settings> {
  const { setSetting } = await import("@/lib/db");
  setSetting(key, value as unknown as string | number);
  return readSettings();
}
