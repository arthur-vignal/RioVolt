import { cookies } from "next/headers";
import { getSubscriberById } from "@/lib/auth-db";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getSubscriptionByUserId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(raw);

  if (!session) {
    return Response.json({ ok: false, subscription: null }, { status: 200 });
  }

  // Garante que o user existe (camada de seguranca extra)
  const user = await getSubscriberById(session.userId);
  if (!user) {
    return Response.json({ ok: false, subscription: null }, { status: 200 });
  }

  const subscription = await getSubscriptionByUserId(user.id);
  return Response.json({ ok: true, subscription });
}
