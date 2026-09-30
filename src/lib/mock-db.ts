import {
  POINTS,
  PLANS,
  SUBSCRIBERS,
  BOOKINGS,
  ME,
  TELEMETRY_30D,
  type Point,
  type Plan,
  type Subscriber,
  type Booking,
  type Subscription,
  type DayPoint,
} from "@/lib/mock-data";

export type DbSnapshot = {
  points: Point[];
  plans: Plan[];
  subscribers: Subscriber[];
  bookings: Booking[];
  me: Subscription;
  telemetry: DayPoint[];
};

export function getSnapshot(): DbSnapshot {
  return {
    points: POINTS,
    plans: PLANS,
    subscribers: SUBSCRIBERS,
    bookings: BOOKINGS,
    me: ME,
    telemetry: TELEMETRY_30D,
  };
}
