import { cookies } from "next/headers";
import { getSubscriberById } from "@/lib/auth-db";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getSubscriptionByUserId } from "@/lib/db";
import { type PlanId, FREE_PLAN_DTO } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(raw);

  if (!session) {
    // Sem sessão = mesmo status de "free" (visitante anônimo,
    // não autenticado). Devolve 200 pra UI não quebrar.
    return Response.json({ ok: false, subscription: null }, { status: 200 });
  }

  // Garante que o user existe (camada de segurança extra)
  const user = await getSubscriberById(session.userId);
  if (!user) {
    return Response.json({ ok: false, subscription: null }, { status: 200 });
  }

  const sub = await getSubscriptionByUserId(user.id);
  if (!sub) {
    // Sem assinatura ativa = usuario esta no plano Free.
    // Devolve um DTO Free explicito pra UI não cair no fallback
    // hardcoded "pro".
    return Response.json({
      ok: true,
      subscription: { ...FREE_PLAN_DTO, isFree: true },
    });
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