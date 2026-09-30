import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readSettings as getSettings, setSetting } from "@/lib/ops-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/settings — devolve as configs atuais.
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ ok: true, settings });
}

// PUT /api/settings — atualiza preço de kWh (chave: kwhPrice).
// body: { kwhPrice: number }
export async function PUT(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    kwhPrice?: number;
  };
  const value = Number(body.kwhPrice);
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json(
      { ok: false, error: "Preço por kWh inválido." },
      { status: 400 },
    );
  }
  const settings = await setSetting("kwhPrice", +value.toFixed(2));
  revalidatePath("/donos/telemetria");
  return NextResponse.json({ ok: true, settings });
}
