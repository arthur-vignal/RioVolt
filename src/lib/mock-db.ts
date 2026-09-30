// mock-db.ts — wrapper de compatibilidade.
//
// A fonte da verdade agora é src/lib/db.ts (fachada SQLite/Postgres).
// Este arquivo mantém `getSnapshot()` para os pontos do código que ainda
// importam daqui. `getSnapshot` agora é async porque a fachada retorna Promises.

import {
  PLANS,
  ME,
  type Plan,
  type Point,
  type Booking,
  type Subscriber,
  type Subscription,
  type DayPoint,
} from "@/lib/mock-data";
import {
  listPoints,
  listAllSubscribers,
  listBookingsForDay,
  getDailyKwhLast30Days,
} from "@/lib/db";

export type DbSnapshot = {
  points: Point[];
  plans: Plan[];
  subscribers: Subscriber[];
  bookings: Booking[];
  me: Subscription;
  telemetry: DayPoint[];
};

export async function getSnapshot(): Promise<DbSnapshot> {
  const [points, subscribers, bookings, telemetry] = await Promise.all([
    listPoints(),
    listAllSubscribers(),
    listBookingsForDay("today"),
    getDailyKwhLast30Days(),
  ]);
  return {
    points: points as unknown as Point[],
    plans: PLANS,
    subscribers: subscribers as unknown as Subscriber[],
    bookings: bookings as unknown as Booking[],
    me: ME,
    telemetry: telemetry as unknown as DayPoint[],
  };
}
