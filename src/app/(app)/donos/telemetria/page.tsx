// Server Component — fonte de verdade dos dados de telemetria/config.
import {
  listAllSubscribers,
  listPoints,
  readSettings,
} from "@/lib/ops-db";
import { TELEMETRY_30D, totalConnectors as seedTotalConnectors } from "@/lib/mock-data";
import { TelemetriaClient } from "./TelemetriaClient";

export const dynamic = "force-dynamic";

export default async function TelemetriaPage() {
  const [subscribers, points, settings] = await Promise.all([
    listAllSubscribers(),
    listPoints(),
    readSettings(),
  ]);
  const totalConnectors = points.reduce(
    (acc, p) => acc + p.connectors.length,
    0,
  );
  return (
    <TelemetriaClient
      data={TELEMETRY_30D}
      subscribers={subscribers}
      points={points}
      initialKwhPrice={settings.kwhPrice}
      totalConnectors={totalConnectors || seedTotalConnectors()}
    />
  );
}
