import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listAllBookings,
  updateBookingStatus,
  updateConnectorStatus,
} from "@/lib/ops-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/bookings/:id/cancel — marca reserva como 'cancelled' e libera o conector.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const all = await listAllBookings();
  const existing = all.find((b) => b.id === id);
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Reserva não encontrada." },
      { status: 404 },
    );
  }
  if (existing.status === "cancelled") {
    return NextResponse.json(
      { ok: false, error: "Reserva já está cancelada." },
      { status: 409 },
    );
  }
  if (existing.status === "done") {
    return NextResponse.json(
      { ok: false, error: "Reserva já foi concluída — não pode cancelar." },
      { status: 409 },
    );
  }

  const updated = await updateBookingStatus(id, "cancelled");
  await updateConnectorStatus(existing.connectorId, "free");

  revalidatePath("/donos/agendamentos");
  return NextResponse.json({ ok: true, booking: updated });
}
