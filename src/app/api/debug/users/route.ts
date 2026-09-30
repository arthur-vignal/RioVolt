/**
 * /api/debug/users — debug temporário. Remove depois.
 * Lista usuários no Postgres pra ver se seed/migration rodou.
 */
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db-pg";
import { getPool } from "@/lib/db-pg";

export async function GET() {
  try {
    await ensureSchema();
    const r = await getPool().query(
      "SELECT id, email, role, name FROM users ORDER BY id",
    );
    return NextResponse.json({
      count: r.rows.length,
      users: r.rows,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}