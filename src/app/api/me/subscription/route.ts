import { cookies } from "next/headers";
import { getSubscriberById } from "@/lib/auth-db";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getSubscriptionByUserId } from "@/lib/db";
import { type PlanId } from "@/lib/mock-data";

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

  const sub = await getSubscriptionByUserId(user.id);
  if (!sub) {
    return Response.json({ ok: true, subscription: null });
  }
  // Plano legado "noturno" foi descontinuado — alias pra Pro 150.
  const rawPlanId =
    (sub as { planId?: string }).planId ??
    (sub as { plan?: string }).plan ??
    "pro";
  const planId: PlanId = rawPlanId === "noturno" ? "pro" : (rawPlanId as PlanId);
  return Response.json({
    ok: true,
    subscription: {
      id: sub.id,
      planId,
      kwhUsed: sub.kwhUsed,
      monthlyFee: sub.monthlyFee,
      since: sub.since,
      nextRenewal: sub.nextRenewal,
      paymentOk: sub.paymentOk,
    },
  });
}
