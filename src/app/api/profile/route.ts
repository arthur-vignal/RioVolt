import { NextResponse, type NextRequest } from "next/server";
import { getProfile, updateProfile, getUserIdFromHeaders } from "@/lib/db";

// Garante que o handler seja sempre executado no servidor.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = getUserIdFromHeaders(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
  const userId = getUserIdFromHeaders(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
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
  const patch: {
    name?: string;
    plate?: string;
    vehicle?: string;
    carModelId?: string | null;
    batteryKwh?: number | null;
  } = {};
  if (typeof b.name === "string") patch.name = b.name.trim().slice(0, 80);
  if (typeof b.plate === "string") patch.plate = b.plate.trim().slice(0, 16);
  if (typeof b.vehicle === "string") patch.vehicle = b.vehicle.trim().slice(0, 80);
  if (typeof b.carModelId === "string") patch.carModelId = b.carModelId.slice(0, 64);
  if (b.batteryKwh === null) patch.batteryKwh = null;
  if (typeof b.batteryKwh === "number" && Number.isFinite(b.batteryKwh)) {
    patch.batteryKwh = Math.max(0, Math.min(200, b.batteryKwh));
  }

  const profile = await updateProfile(userId, patch);
  return NextResponse.json({ profile });
}
