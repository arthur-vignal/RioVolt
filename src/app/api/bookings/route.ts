import { NextResponse, type NextRequest } from "next/server";
import {
  createBooking,
  getUserIdFromHeaders,
  listBookingsForUser,
  listChargesForUser,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = getUserIdFromHeaders(request.headers);
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const bookings = await listBookingsForUser(userId);
  const charges = await listChargesForUser(userId);
  return NextResponse.json({ bookings, charges });
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromHeaders(request.headers);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const pointId = typeof b.pointId === "string" ? b.pointId : "";
  const connectorId = typeof b.connectorId === "string" ? b.connectorId : "";
  const planId = typeof b.planId === "string" ? b.planId : "noturno";
  const start = typeof b.start === "number" ? b.start : Number(b.start);
  const durationMin = typeof b.durationMin === "number" ? b.durationMin : Number(b.durationMin);
  if (!pointId || !connectorId || !Number.isFinite(start) || !Number.isFinite(durationMin)) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  let booking;
    try {
      booking = await createBooking({
        userId,
        connectorId,
        plan: planId as "noturno" | "pro",
        startHour: start,
        durationMin,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "cupons_ac_esgotados") {
        return NextResponse.json(
          {
            error:
              "Você atingiu os 6 cupons de R$20 grátis em vagas AC deste ciclo. Próxima reserva AC será tarifada.",
            code: "CUPONS_AC_ESGOTADOS",
          },
          { status: 402 },
        );
      }
      if (msg === "cupons_no_subscription") {
        return NextResponse.json(
          {
            error: "Você precisa de uma assinatura Pro Plus 150 ativa.",
            code: "NO_SUBSCRIPTION",
          },
          { status: 402 },
        );
      }
      if (msg.startsWith("connector_busy:")) {
        return NextResponse.json(
          { error: "Esse conector já está reservado nesse horário." },
          { status: 409 },
        );
      }
      if (msg.startsWith("connector_not_found:")) {
        return NextResponse.json(
          { error: "Conector não encontrado." },
          { status: 404 },
        );
      }
      // Re-throw pro handler global de erro do Next registrar (mantém 500 com stack).
      throw err;
    }
    return NextResponse.json({ booking });
  }
