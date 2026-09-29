"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/app/(app)/layout-client";
import { SUBSCRIBERS, PLAN_BY_ID, type Subscriber } from "@/lib/mock-data";
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
} from "lucide-react";

const STATUS: Record<
  Subscriber["status"],
  { chip: string; dot: string; label: string }
> = {
  ativo: {
    chip: "#16a34a/30 #16a34a/10 #16a34a",
    dot: "#16a34a",
    label: "Ativo",
  },
  inadimplente: {
    chip: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
    label: "Inadimplente",
  },
  cancelado: {
    chip: "border-black/10 #f2f3f2 #000000/60",
    dot: "bg-offline",
    label: "Cancelado",
  },
};

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

export default function AssinantesPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Subscriber["status"] | "todos">("todos");

  const rows = useMemo(
    () =>
      SUBSCRIBERS.filter((s) => {
        if (filter !== "todos" && s.status !== filter) return false;
        if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [q, filter],
  );

  const ativos = SUBSCRIBERS.filter((s) => s.status === "ativo");
  const mrr = ativos.reduce((a, s) => a + s.monthlyFee, 0);
  const inad = SUBSCRIBERS.filter((s) => s.status === "inadimplente");
  const canc = SUBSCRIBERS.filter((s) => s.status === "cancelado");
  const kwhMes = ativos.reduce((a, s) => a + s.kwh30d, 0);
  const churn = ((canc.length + inad.length) / SUBSCRIBERS.length) * 100;

  return (
    <Shell scope="donos">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] #000000/70">
            Sistema de donos
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Assinantes</h1>
          <p className="mt-1 text-[13px] #000000/70">
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
              tone: "#16a34a",
              ring: "#16a34a/25 #16a34a/10",
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
              <div key={k.label} className="ev-card rounded-[6px] border border-black/10 p-4">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] uppercase tracking-[0.16em] #000000/70">
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
                <p className="mt-2 text-2xl font-semibold tabular-nums">{k.value}</p>
                <p className="mt-0.5 text-[11px] #000000/60">{k.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="ev-card overflow-hidden rounded-[6px] border border-black/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 #000000/50" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar assinante"
                className="h-9 w-full rounded-[6px] border border-black/10 #f7f8f6/40 pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:#000000/40 focus:border-foreground/25"
              />
            </div>
            <div className="inline-flex items-center gap-1 rounded-[6px] border border-black/10 p-0.5">
              {(["todos", "ativo", "inadimplente", "cancelado"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[12px] font-medium capitalize transition-colors",
                    filter === f ? "bg-foreground text-background" : "#000000",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-black/10 text-[10px] uppercase tracking-[0.16em] #000000/60">
                  <th className="px-4 py-3 font-medium">Assinante</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Desde</th>
                  <th className="px-4 py-3 font-medium">Consumo 30d</th>
                  <th className="px-4 py-3 font-medium">Mensalidade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const plan = PLAN_BY_ID[s.planId];
                  const quota = plan.includedKwh ?? 200;
                  const pct = Math.min(100, Math.round((s.kwh30d / quota) * 100));
                  const st = STATUS[s.status];
                  const Icon = plan.connectorKind === "DC" ? Zap : Moon;
                  return (
                    <tr
                      key={s.name}
                      className="border-b border-black/10 transition-colors last:border-0 hover:bg-foreground/[0.02]"
                    >
                      <td className="px-4 py-3 text-[13px] font-medium">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] #000000/85">
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5",
                              plan.connectorKind === "DC" ? "text-dc" : "text-ac",
                            )}
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
                      <td className="px-4 py-3 font-mono text-[12px] #000000/70">
                        {s.since}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex items-baseline justify-between text-[12px]">
                            <span className="tabular-nums">{s.kwh30d} kWh</span>
                            <span className="text-[10px] #000000/50">
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
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] #000000/70">
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
