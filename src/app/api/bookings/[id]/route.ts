import { NextResponse, type NextRequest } from "next/server";
import {
  getBooking,
  getPoint,
  getCharge,
  getUserIdFromHeaders,
  listChargesForUser,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const booking = getBooking(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking não encontrado" }, { status: 404 });
  }
  const point = getPoint(booking.pointId);
  const charge = getCharge(booking.id) ?? null;
  return NextResponse.json({ booking, point, charge });
}

// Endpoint interno de conveniência: lista bookings + charges do usuário.
// Útil pra preencher a tela de histórico.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // /api/bookings/:id com POST = "listar charges deste booking (debug)"
  // Mantido pra simetria de rota; a listagem geral é via /api/bookings (root).
  await context.params;
  const userId = getUserIdFromHeaders(request.headers);
  const charges = listChargesForUser(userId);
  return NextResponse.json({ charges });
}
