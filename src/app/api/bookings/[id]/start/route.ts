import { NextResponse, type NextRequest } from "next/server";
import { startCharge, getUserIdFromHeaders } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const userId = getUserIdFromHeaders(request.headers);
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const result = await startCharge({ userId, bookingId: id });
  if (!result.ok) {
    const status = /não encontrado|inválido/i.test(result.error) ? 400 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ booking: result.booking, charge: result.charge });
}
