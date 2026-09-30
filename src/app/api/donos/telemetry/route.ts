import { cookies } from "next/headers";
import { getSubscriberById } from "@/lib/auth-db";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getDailyKwhLast30Days } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(raw);

  if (!session) {
    return Response.json({ ok: false, series: [] }, { status: 200 });
  }
  const user = await getSubscriberById(session.userId);
  if (!user || user.role !== "donos") {
    return Response.json({ ok: false, series: [] }, { status: 200 });
  }

  const series = await getDailyKwhLast30Days();
  return Response.json({ ok: true, series });
}
