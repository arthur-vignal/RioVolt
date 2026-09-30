/**
 * /api/admin/force-seed — força re-seed do Postgres. Pra debugar quando
 * o boot instrumentation não rodou ou a migration não aplicou.
 *
 * Acesse: https://<host>/api/admin/force-seed?token=<ADMIN_TOKEN>
 *
 * ADMIN_TOKEN é uma env var que você define temporariamente, depois remove.
 */
import { NextResponse } from "next/server";
import { initSchema, seedIfEmpty } from "@/lib/db-pg";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    await initSchema();
    await seedIfEmpty();
    return NextResponse.json({
      ok: true,
      message: "schema + seedIfEmpty executados",
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