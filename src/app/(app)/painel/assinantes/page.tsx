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
    chip: "border-free/30 bg-free/10 text-free",
    dot: "bg-free",
    label: "Ativo",
  },
  inadimplente: {
    chip: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
    label: "Inadimplente",
  },
  cancelado: {
    chip: "border-border bg-muted text-muted-foreground/60",
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
    <Shell scope="painel">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            Painel da empresa
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Assinantes</h1>
          <p className="mt-1 text-[13px] text-muted-foreground/70">
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
              tone: "text-free",
              ring: "ring-free/25 bg-free/10",
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
              ring: "ring-border bg-muted",
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
              <div key={k.label} className="ev-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
                    {k.label}
                  </p>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md ring-1",
                      k.ring,
                      k.tone,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{k.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">{k.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="ev-card overflow-hidden rounded-xl border border-border">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar assinante"
                className="h-9 w-full rounded-md border border-border bg-background/40 pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-foreground/25"
              />
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border p-0.5">
              {(["todos", "ativo", "inadimplente", "cancelado"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[12px] font-medium capitalize transition-colors",
                    filter === f ? "bg-foreground text-background" : "text-muted-foreground",
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
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
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
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-foreground/[0.02]"
                    >
                      <td className="px-4 py-3 text-[13px] font-medium">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/85">
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
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            st.chip,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground/70">
                        {s.since}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex items-baseline justify-between text-[12px]">
                            <span className="tabular-nums">{s.kwh30d} kWh</span>
                            <span className="text-[10px] text-muted-foreground/50">
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
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-muted-foreground/70">
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
