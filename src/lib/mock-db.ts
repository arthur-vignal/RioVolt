// mock-db.ts — wrapper de compatibilidade.
//
// A fonte da verdade agora é src/lib/db.ts (SQLite persistente). Este
// arquivo mantém `getSnapshot()` para os pontos do código que ainda
// importam daqui, mas delega tudo para o banco real.

import {
  PLANS,
  ME,
  TELEMETRY_30D,
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
} from "@/lib/db";

export type DbSnapshot = {
  points: Point[];
  plans: Plan[];
  subscribers: Subscriber[];
  bookings: Booking[];
  me: Subscription;
  telemetry: DayPoint[];
};

/**
 * Retorna um snapshot do estado atual do banco. Lê do SQLite (dados reais).
 * Para campos que ainda não foram migrados (telemetria, ME de exemplo),
 * mantemos o mock estático — em produção ME virá de subscriptions WHERE
 * user_id = session.
 */
export function getSnapshot(): DbSnapshot {
  return {
    points: listPoints(),
    plans: PLANS,
    subscribers: listAllSubscribers(),
    bookings: listBookingsForDay("today"),
    me: ME,
    telemetry: TELEMETRY_30D,
  };
}
