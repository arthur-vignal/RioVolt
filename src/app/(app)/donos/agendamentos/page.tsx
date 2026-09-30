// Server Component — fonte de verdade dos dados do painel.
// Lê do ops-db (persistência real em JSON), revalida a cada request via revalidatePath.
import {
  listAllBookings,
  listPoints,
} from "@/lib/ops-db";
import { AgendamentosClient } from "./AgendamentosClient";

export const dynamic = "force-dynamic";

export default async function AgendamentosPage() {
  const [bookings, points] = await Promise.all([
    listAllBookings(),
    listPoints(),
  ]);
  return (
    <AgendamentosClient initialBookings={bookings} initialPoints={points} />
  );
}
