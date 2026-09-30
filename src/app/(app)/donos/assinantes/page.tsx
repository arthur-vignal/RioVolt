// Server Component — fonte de verdade dos dados de assinantes.
import { listAllSubscribers } from "@/lib/ops-db";
import { AssinantesClient } from "./AssinantesClient";

export const dynamic = "force-dynamic";

export default async function AssinantesPage() {
  const subscribers = await listAllSubscribers();
  return <AssinantesClient initialSubscribers={subscribers} />;
}
