import { cookies } from "next/headers";
import { getSubscriberById } from "@/lib/auth-db";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(raw);

  if (!session) {
    return Response.json({ ok: false, user: null }, { status: 200 });
  }

  const user = getSubscriberById(session.userId);
  if (!user) {
    return Response.json({ ok: false, user: null }, { status: 200 });
  }

  return Response.json({ ok: true, user });
}