import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createPoint, listPoints } from "@/lib/ops-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChargerKind = "AC" | "DC";

// POST /api/points — cria novo ponto de recarga.
// body: { name, neighborhood, lat, lon, kind: 'AC'|'DC', powerKw, partner }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    neighborhood?: string;
    lat?: number;
    lon?: number;
    kind?: ChargerKind;
    powerKw?: number;
    partner?: string;
  };

  const { name, neighborhood, kind, partner } = body;
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  const powerKw = Number(body.powerKw);

  if (!name || !neighborhood || !partner) {
    return NextResponse.json(
      {
        ok: false,
        error: "Campos obrigatórios: name, neighborhood, partner.",
      },
      { status: 400 },
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { ok: false, error: "Latitude/longitude inválidas." },
      { status: 400 },
    );
  }
  if (kind !== "AC" && kind !== "DC") {
    return NextResponse.json(
      { ok: false, error: "Tipo do conector deve ser 'AC' ou 'DC'." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(powerKw) || powerKw <= 0) {
    return NextResponse.json(
      { ok: false, error: "Potência (kW) inválida." },
      { status: 400 },
    );
  }

  const point = await createPoint({
    name,
    neighborhood,
    lat,
    lon,
    kind,
    powerKw,
    partner,
  });
  revalidatePath("/donos/telemetria");
  revalidatePath("/motorista/pontos");
  return NextResponse.json({ ok: true, point });
}

// GET /api/points — lista pontos (debug).
export async function GET() {
  const points = await listPoints();
  return NextResponse.json({ ok: true, points });
}
