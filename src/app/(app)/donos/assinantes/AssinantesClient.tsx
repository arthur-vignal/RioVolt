"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/app/(app)/layout-client";
import { PLAN_BY_ID, type Subscriber } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Users,
  AlertTriangle,
  UserMinus,
  TrendingUp,
  Zap,
  Moon,
  Loader2,
} from "lucide-react";

const STATUS: Record<
  Subscriber["status"],
  { chip: string; dot: string; label: string }
> = {
  ativo: {
    chip: "bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/30",
    dot: "text-[#16a34a]",
    label: "Ativo",
  },
  inadimplente: {
    chip: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
    label: "Inadimplente",
  },
  cancelado: {
    chip: "border-black/10 #f2f3f2 text-black/60",
    dot: "bg-offline",
    label: "Cancelado",
  },
};

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

type Props = { initialSubscribers: Subscriber[] };

export function AssinantesClient({ initialSubscribers }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Subscriber["status"] | "todos">("todos");
  const [busyName, setBusyName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    { type: "ok" | "err"; msg: string } | null
  >(null);
  const [, startTransition] = useTransition();

  const rows = useMemo(
    () =>
      initialSubscribers.filter((s) => {
        if (filter !== "todos" && s.status !== filter) return false;
        if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [q, filter, initialSubscribers],
  );

  const ativos = initialSubscribers.filter((s) => s.status === "ativo");
  const mrr = ativos.reduce((a, s) => a + s.monthlyFee, 0);
  const inad = initialSubscribers.filter((s) => s.status === "inadimplente");
  const canc = initialSubscribers.filter((s) => s.status === "cancelado");
  const kwhMes = ativos.reduce((a, s) => a + s.kwh30d, 0);
  const churn = ((canc.length + inad.length) / initialSubscribers.length) * 100;

  async function setStatus(
    name: string,
    status: Subscriber["status"],
    isPermanent?: boolean,
  ) {
    if (isPermanent) {
      if (
        !confirm(
          `Cancelar definitivamente a assinatura de ${name}? Esta ação não pode ser desfeita pela UI.`,
        )
      )
        return;
    }
    setBusyName(name);
    setFeedback(null);
    try {
      const r = await fetch(
        `/api/subscribers/${encodeURIComponent(name)}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await r.json();
      if (!r.ok || !data.ok)
        throw new Error(data.error || "Falha ao atualizar status.");
      setFeedback({
        type: "ok",
        msg: `${name}: ${STATUS[status].label}.`,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setFeedback({
        type: "err",
        msg: e instanceof Error ? e.message : "Erro ao atualizar.",
      });
    } finally {
      setBusyName(null);
    }
  }

  return (
    <Shell scope="donos">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Assinantes
          </h1>
          <p className="mt-1 text-[13px] text-black/70">
            Planos ativos, inadimplência e cancelamentos
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Assinantes ativos",
              value: String(ativos.length),
              sub: `${brl(mrr)} de MRR`,
              icon: Users,
              tone: "text-[#16a34a]",
              ring: "ring-[#16a34a]/25 bg-[#16a34a]/10",
            },
            {
              label: "Inadimplentes",
              value: String(inad.length),
              sub: brl(inad.reduce((a, s) => a + s.monthlyFee, 0)) + " em atraso",
              icon: AlertTriangle,
              tone: "text-danger",
              ring: "ring-danger/25 bg-danger/10",
            },
            {
              label: "Cancelamentos",
              value: String(canc.length),
              sub: "últimos 30 dias",
              icon: UserMinus,
              tone: "text-offline",
              ring: "ring-border #f2f3f2",
            },
            {
              label: "Energia no mês",
              value: `${kwhMes} kWh`,
              sub: `churn ${churn.toFixed(0)}%`,
              icon: TrendingUp,
              tone: "text-taken",
              ring: "ring-taken/25 bg-taken/10",
            },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="ev-card rounded-[6px] border border-black/10 p-4"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[12px] font-medium text-black/70">
                    {k.label}
                  </p>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-[6px] ring-1",
                      k.ring,
                      k.tone,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {k.value}
                </p>
                <p className="mt-0.5 text-[11px] text-black/60">{k.sub}</p>
              </div>
            );
          })}
        </div>

        {feedback && (
          <div
            className={cn(
              "mb-4 rounded-[6px] border px-3 py-2 text-[12px]",
              feedback.type === "ok"
                ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]"
                : "border-danger/30 bg-danger/10 text-danger",
            )}
          >
            {feedback.msg}
          </div>
        )}

        <div className="ev-card overflow-hidden rounded-[6px] border border-black/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/50" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar assinante"
                className="h-9 w-full rounded-[6px] border border-black/10 #f7f8f6/40 pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:#000000/40 focus:border-black/20"
              />
            </div>
            <div className="inline-flex items-center gap-1 rounded-[6px] border border-black/10 p-0.5">
              {(["todos", "ativo", "inadimplente", "cancelado"] as const).map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-[6px] px-2.5 py-1 text-[12px] font-medium capitalize transition-colors",
                      filter === f ? "#000000 text-background" : "text-black",
                    )}
                  >
                    {f}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-black/10 text-[11px] font-medium text-black/70">
                  <th className="px-4 py-3 font-medium">Assinante</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Desde</th>
                  <th className="px-4 py-3 font-medium">Consumo 30d</th>
                  <th className="px-4 py-3 font-medium">Mensalidade</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  // Banco legado pode ter planId="noturno". Fallback pra Pro.
                  const plan =
                    PLAN_BY_ID[s.planId as keyof typeof PLAN_BY_ID] ?? PLAN_BY_ID.pro;
                  const quota = plan.includedKwh ?? 200;
                  const pct = Math.min(
                    100,
                    Math.round((s.kwh30d / quota) * 100),
                  );
                  const st = STATUS[s.status];
                  // Pro 150 nao diferencia por conectorKind (unificado). Icon generico.
                  const Icon = Zap;
                  const busy = busyName === s.name;
                  const isAtivo = s.status === "ativo";
                  const isInad = s.status === "inadimplente";
                  const isCanc = s.status === "cancelado";
                  return (
                    <tr
                      key={s.name}
                      className="border-b border-black/10 transition-colors last:border-0 hover:bg-[#f7f8f6]/40"
                    >
                      <td className="px-4 py-3 text-[13px] font-medium">
                        {s.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-black/85">
                          <Icon
                            className={cn("h-3.5 w-3.5", "text-ac")}
                          />
                          {plan.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5 text-[11px] font-medium",
                            st.chip,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-[6px]", st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-black/70">
                        {s.since}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex items-baseline justify-between text-[12px]">
                            <span className="tabular-nums">{s.kwh30d} kWh</span>
                            <span className="text-[10px] text-black/50">
                              /{quota}
                            </span>
                          </div>
                          <Progress
                            value={pct}
                            className={cn(
                              "mt-1 h-1.5",
                              pct > 100 ? "[&>div]:bg-busy" : "",
                            )}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums">
                        {brl(s.monthlyFee)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Toggle: bloqueia/desbloqueia (ativo ↔ inadimplente) */}
                          <button
                            type="button"
                            onClick={() =>
                              setStatus(
                                s.name,
                                isAtivo ? "inadimplente" : "ativo",
                              )
                            }
                            disabled={busy || isCanc}
                            aria-label={
                              isAtivo
                                ? `Bloquear ${s.name}`
                                : `Reativar ${s.name}`
                            }
                            className={cn(
                              "inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
                              isAtivo
                                ? "border-[#16a34a]/40 bg-[#16a34a] justify-end"
                                : "border-danger/40 bg-danger justify-start",
                            )}
                          >
                            <span className="block h-4 w-4 rounded-full bg-white shadow-sm" />
                          </button>
                          <span className="text-[11px] text-black/55">
                            {isAtivo ? "liberado" : isInad ? "bloqueado" : "—"}
                          </span>
                          {/* Cancelar definitivo */}
                          {!isCanc && (
                            <button
                              type="button"
                              onClick={() =>
                                setStatus(s.name, "cancelado", true)
                              }
                              disabled={busy}
                              aria-label={`Cancelar assinatura de ${s.name}`}
                              className="ml-auto inline-flex h-7 items-center gap-1 rounded-[6px] border border-black/10 px-2 text-[11px] font-medium text-black transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : null}
                              Cancelar
                            </button>
                          )}
                          {isCanc && (
                            <button
                              type="button"
                              onClick={() => setStatus(s.name, "ativo")}
                              disabled={busy}
                              className="ml-auto inline-flex h-7 items-center rounded-[6px] border border-[#16a34a]/30 px-2 text-[11px] font-medium text-[#16a34a] transition-colors hover:bg-[#16a34a]/10 disabled:opacity-50"
                            >
                              Reativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-[13px] text-black/70"
                    >
                      Nenhum assinante com esse filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
