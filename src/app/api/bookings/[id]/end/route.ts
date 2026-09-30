import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listAllBookings,
  listAllSubscribers,
  listPoints,
  updateBookingStatus,
  updateConnectorStatus,
  incrementKwh,
} from "@/lib/ops-db";

// POST /api/bookings/:id/end — encerra a carga em andamento.
// Calcula kWh consumido = horas decorridas × potencia do conector × 0.9 (perdas).
// Status: in_progress -> done, conector -> free, soma kwh30d do assinante.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  // kWh opcional do front (medidor reportando).
  let reportedKwh: number | undefined = undefined;
  try {
    const body = (await req.json()) as { kwh?: unknown };
    const n = Number(body?.kwh);
    if (Number.isFinite(n) && n >= 0) reportedKwh = n;
  } catch {
    // sem body é ok
  }

  const bookings = await listAllBookings();
  const existing = bookings.find((b) => b.id === id);
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Reserva não encontrada." },
      { status: 404 },
    );
  }
  if (existing.status !== "in_progress") {
    return NextResponse.json(
      {
        ok: false,
        error: `Reserva está '${existing.status}'. Só é possível encerrar reservas 'in_progress'.`,
      },
      { status: 409 },
    );
  }

  const points = await listPoints();
  const point = points.find((p) => p.id === existing.pointId);
  const connector = point?.connectors.find((c) => c.id === existing.connectorId);
  if (!connector) {
    return NextResponse.json(
      { ok: false, error: "Conector não encontrado." },
      { status: 500 },
    );
  }

  // kWh consumido: usa medidor reportado se vier, senão estimativa por duração.
  const duracaoHoras = existing.durationMin / 60;
  const kwhConsumido =
    reportedKwh !== undefined
      ? +reportedKwh.toFixed(2)
      : +(duracaoHoras * connector.powerKw * 0.9).toFixed(2);

  // Atualiza reserva -> done, libera conector, soma kwh do assinante.
  const updated = await updateBookingStatus(id, "done");
  await updateConnectorStatus(existing.connectorId, "free");

  // O 'user' da reserva bate com o 'name' do assinante (mesma fonte: mock-data).
  const subscribers = await listAllSubscribers();
  const sub = subscribers.find((s) => s.name === existing.user);
  let subAfter = null as Awaited<ReturnType<typeof incrementKwh>> | null;
  if (sub) {
    subAfter = await incrementKwh(sub.name, kwhConsumido);
  }

  revalidatePath("/donos/agendamentos");
  revalidatePath("/donos/assinantes");
  return NextResponse.json({
    ok: true,
    booking: updated,
    kwhConsumido,
    potencia: connector.powerKw,
    duracaoHoras,
    assinante: subAfter,
  });
}
