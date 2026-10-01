import { NextResponse, type NextRequest } from "next/server";
import {
  createBooking,
  getUserIdFromHeaders,
  listBookingsForUser,
  listChargesForUser,
} from "@/lib/db";
import { PRO_MIN_ADVANCE_HOURS } from "@/lib/mock-data";

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
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
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
  const connectorId = typeof b.connectorId === "string" ? b.connectorId : "";
  const plan = b.plan === "free" || b.plan === "pro" ? b.plan : null;
  const mode = b.mode === "noite" || b.mode === "dia" ? b.mode : null;
  const dropHour = Number(b.dropHour);
  const pickupHour = Number(b.pickupHour);
  if (!connectorId || !plan || !mode || !Number.isFinite(dropHour) || !Number.isFinite(pickupHour)) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  // Validacao de antecedência (Pro): precisa agendar com pelo menos 2h de antecedência.
  // Free nao tem regra de antecedência (chega e usa).
  if (plan === "pro") {
    // Converte dropHour (decimal) em timestamp absoluto, assumindo a próxima
    // ocorrência futura. Se dropHour > hora atual, é hoje; senão, amanhã.
    const now = new Date();
    const dropDate = new Date(now);
    dropDate.setHours(Math.floor(dropHour), Math.round((dropHour % 1) * 60), 0, 0);
    if (dropDate.getTime() < now.getTime()) {
      // Já passou da hora hoje — empurra pra amanhã.
      dropDate.setDate(dropDate.getDate() + 1);
    }
    const minAdvanceMs = PRO_MIN_ADVANCE_HOURS * 3600 * 1000;
    if (dropDate.getTime() < now.getTime() + minAdvanceMs) {
      return NextResponse.json(
        {
          error: `Reserva Pro precisa de pelo menos ${PRO_MIN_ADVANCE_HOURS}h de antecedência.`,
          code: "PRO_MIN_ADVANCE",
        },
        { status: 400 },
      );
    }
  }

  let booking;
  try {
    booking = await createBooking({
      userId,
      connectorId,
      plan,
      mode,
      dropHour,
      pickupHour,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const map: Record<string, { status: number; code?: string; error: string }> = {
      invalid_hours: { status: 400, error: "Horários inválidos." },
      pickup_before_drop: {
        status: 400,
        error: "Horário de retirada deve ser depois do horário de deixar.",
      },
      drop_out_of_night_window: {
        status: 400,
        error: "Deixar o carro à noite deve ser entre 18h e 6h.",
      },
      pickup_out_of_night_window: {
        status: 400,
        error: "Buscar o carro à noite deve ser entre 6h e 9h.",
      },
      night_duration_out_of_range: {
        status: 400,
        error: "Reserva noturna deve ter entre 1h e 15h de duração.",
      },
      drop_out_of_day_window: {
        status: 400,
        error: "Recarga diurna deve começar entre 6h e 18h.",
      },
      day_duration_out_of_range: {
        status: 400,
        error: "Duração da reserva diurna fora do permitido (AC 30min-4h, DC 15min-2h).",
      },
    };
    if (msg.startsWith("connector_busy:")) {
      return NextResponse.json(
        { error: "Esse conector já está reservado nesse horário." },
        { status: 409 },
      );
    }
    if (msg.startsWith("connector_not_found:")) {
      return NextResponse.json({ error: "Conector não encontrado." }, { status: 404 });
    }
    if (msg.startsWith("mode_not_supported")) {
      return NextResponse.json(
        {
          error: "Esse conector não aceita esse tipo de reserva.",
          code: "mode_not_supported",
        },
        { status: 409 },
      );
    }
    const known = map[msg];
    if (known) return NextResponse.json({ error: known.error, code: msg }, { status: known.status });
    throw err;
  }
  return NextResponse.json({ booking });
}