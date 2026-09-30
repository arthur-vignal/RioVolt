/**
 * /api/admin/force-seed — Trunca TUDO e recria o schema + seed do zero.
 *
 * Acesse: https://<host>/api/admin/force-seed?token=<ADMIN_TOKEN>
 *
 * ADMIN_TOKEN é uma env var que você define temporariamente, depois remove.
 */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db-pg";
import { POINTS, ME } from "@/lib/mock-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const pool = getPool();
    // 1. Trunca tudo
    const tx = await pool.connect();
    try {
      await tx.query("BEGIN");
      await tx.query("DELETE FROM charges");
      await tx.query("DELETE FROM bookings");
      await tx.query("DELETE FROM subscribers");
      await tx.query("DELETE FROM connectors");
      await tx.query("DELETE FROM points");
      await tx.query("DELETE FROM settings");
      await tx.query("DELETE FROM subscriptions");
      await tx.query("DELETE FROM users");
      await tx.query("COMMIT");
    } catch (err) {
      await tx.query("ROLLBACK");
      throw err;
    } finally {
      tx.release();
    }

    // 2. Re-seed
    const tx2 = await pool.connect();
    try {
      await tx2.query("BEGIN");
      const users = [
        { id: "user-1", email: "mariana@voltrio.app", role: "motorista", name: "Mariana Souza", plate: "RIO-2A19", car: "BYD Dolphin", plan: 200 },
        { id: "user-2", email: "rafael@voltrio.app", role: "motorista", name: "Rafael Mendes", plate: "RIO-3B42", car: "Volvo EX30", plan: 200 },
        { id: "user-3", email: "carlos@voltrio.app", role: "motorista", name: "Carlos Andrade", plate: "RIO-4C77", car: "Renault Kwid E-Tech", plan: 200 },
        { id: "owner-1", email: "dono@voltrio.app", role: "donos", name: "Bruno Tavares", plate: null, car: null, plan: null },
      ];
      for (const u of users) {
        await tx2.query(
          `INSERT INTO users (id,email,role,name,plate,car_model,kwh_plan_limit)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [u.id, u.email, u.role, u.name, u.plate, u.car, u.plan],
        );
      }
      for (const p of POINTS) {
        await tx2.query(
          `INSERT INTO points (id,name,neighborhood,focus,address,lat,lon,open_hours,partner)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [p.id, p.name, p.neighborhood, p.focus, p.address, p.lat, p.lon, p.openHours, p.partner],
        );
        for (const c of p.connectors) {
          await tx2.query(
            `INSERT INTO connectors (id,point_id,kind,power_kw,status,note)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [c.id, p.id, c.kind, c.powerKw, c.status, c.note ?? null],
          );
        }
      }
      await tx2.query(
        `INSERT INTO subscriptions (user_id,plan,kwh_used,monthly_fee,since,next_renewal,payment_ok)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        ["user-1", ME.planId, ME.kwhUsed, ME.monthlyFee, ME.since, ME.nextRenewal, ME.paymentOk],
      );
      await tx2.query(
        `INSERT INTO settings (key, value) VALUES ('kwhPrice', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ["2.04"],
      );
      await tx2.query("COMMIT");
    } catch (err) {
      await tx2.query("ROLLBACK");
      throw err;
    } finally {
      tx2.release();
    }

    return NextResponse.json({
      ok: true,
      points: POINTS.length,
      connectors: POINTS.reduce((acc, p) => acc + p.connectors.length, 0),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}