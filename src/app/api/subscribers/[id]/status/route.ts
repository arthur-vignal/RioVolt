import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listAllSubscribers,
  updateSubscriberStatus,
} from "@/lib/ops-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriberStatus = "ativo" | "inadimplente" | "cancelado";

// POST /api/subscribers/:id/status
// body: { status: 'ativo' | 'inadimplente' | 'cancelado' }
// :id é o nome do assinante (slug amigável vindo da tabela).
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: SubscriberStatus;
  };
  const status = body.status;

  if (
    status !== "ativo" &&
    status !== "inadimplente" &&
    status !== "cancelado"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Status inválido. Use 'ativo', 'inadimplente' ou 'cancelado'.",
      },
      { status: 400 },
    );
  }

  const all = await listAllSubscribers();
  const existing = all.find((s) => s.name === id);
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Assinante não encontrado." },
      { status: 404 },
    );
  }

  const updated = await updateSubscriberStatus(id, status);
  revalidatePath("/donos/assinantes");
  return NextResponse.json({ ok: true, subscriber: updated });
}
