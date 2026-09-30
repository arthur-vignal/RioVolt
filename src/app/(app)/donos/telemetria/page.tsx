// Server Component — fonte de verdade dos dados de telemetria/config.
import {
  listAllSubscribers,
  listPoints,
  readSettings,
} from "@/lib/ops-db";
import { getDailyKwhLast30Days } from "@/lib/db";
import { totalConnectors as seedTotalConnectors } from "@/lib/mock-data";
import { TelemetriaClient } from "./TelemetriaClient";
import type { DayPoint } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function TelemetriaPage() {
  const [subscribers, points, settings, dailySeries] = await Promise.all([
    listAllSubscribers(),
    listPoints(),
    readSettings(),
    getDailyKwhLast30Days(),
  ]);

  const totalConnectors = points.reduce(
    (acc, p) => acc + p.connectors.length,
    0,
  );

  // Sem charges reais: mostra chart vazio (sem fakear numeros).
  // Mantem shape DayPoint pra nao mexer no client component.
  const data: DayPoint[] = dailySeries.length > 0
    ? dailySeries.map((d) => ({ day: d.day, kwh: d.kwh, revenue: d.revenue }))
    : [];

  return (
    <TelemetriaClient
      data={data}
      subscribers={subscribers}
      points={points}
      initialKwhPrice={settings.kwhPrice}
      totalConnectors={totalConnectors || seedTotalConnectors()}
    />
  );
}
