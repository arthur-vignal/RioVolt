/**
 * /api/debug/users — debug temporário. Remove depois.
 * Lista usuários no Postgres pra ver se seed/migration rodou.
 */
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db-pg";
import { listAllUsers } from "@/lib/db-pg";

export async function GET() {
  try {
    await ensureSchema();
    const users = await listAllUsers();
    return NextResponse.json({
      count: users.length,
      users: users.map((u: { id: string; email: string; role: string; name: string }) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}