/**
 * /api/points — Lista todos os hubs + conectores + sessões ativas (com estimativa
 * de tempo livre).
 *
 * Retorno:
 *   {
 *     points: Point[] — com connectors inclusos
 *     activeCharges: Record<connectorId, { startedAt: epochMs, kwhTarget: number }>
 *   }
 */
import { NextResponse } from "next/server";
import { listPoints } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const points = (await listPoints()) as unknown as Array<{
      id: string;
      name: string;
      neighborhood: string;
      focus: string;
      address: string;
      lat: number;
      lon: number;
      openHours: string;
      partner: string;
      connectors: Array<{
        id: string;
        pointId: string;
        kind: "AC" | "DC";
        powerKw: number;
        status: "free" | "reserved" | "in_use" | "offline";
        note?: string | null;
      }>;
    }>;

    // Carrega charges ativas (startedAt e kwh planejado) para enriquecer o mapa
    // com estimativa de tempo livre.
    const activeCharges: Record<string, { startedAt: number; kwhTarget: number }> = {};
    try {
      const { getPool } = await import("@/lib/db-pg");
      const pool = getPool();
      const r = await pool.query<{
        booking_id: string;
        connector_id: string;
        started_at: Date;
        duration_min: number;
        connector_power_kw: number;
      }>(
        `SELECT b.id AS booking_id, b.connector_id, c.started_at, b.duration_min,
                cn.power_kw AS connector_power_kw
         FROM bookings b
         LEFT JOIN charges c ON c.booking_id = b.id
         LEFT JOIN connectors cn ON cn.id = b.connector_id
         WHERE b.status = 'in_use' AND c.ended_at IS NULL`,
      );
      for (const row of r.rows) {
        if (!row.started_at) continue;
        // kwh target: estimativa baseada no plano de carga médio de 22 kWh por
        // hora de sessão. Para simplificar usamos duration_min * power_kW / 60.
        const kwhTarget =
          (row.duration_min * Number(row.connector_power_kw ?? 22)) / 60;
        activeCharges[row.connector_id] = {
          startedAt: new Date(row.started_at).getTime(),
          kwhTarget,
        };
      }
    } catch {
      // pode falhar em SQLite dev (tabela charge não existe ainda). não crítico.
    }

    return NextResponse.json({ points, activeCharges });
  } catch (err) {
    console.error("[voltrio/api/points] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "erro" },
      { status: 500 },
    );
  }
}