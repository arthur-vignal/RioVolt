"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import {
  POINTS,
  PLAN_BY_ID,
  PLAN_WINDOW_LABEL,
  BUFFER_MIN,
  TOLERANCE_MIN,
  IDLE_FEE_PER_MIN,
  ME,
  type PlanId,
} from "@/lib/mock-data";
import { KindBadge } from "@/components/status";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  QrCode,
  ShieldCheck,
  Timer,
  AlertTriangle,
} from "lucide-react";

const NIGHT_HOURS = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];
const DAY_HOURS = [6, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const fmt = (h: number) => `${String(h).padStart(2, "0")}h`;

type Step = "escolher" | "confirmar" | "feito";

function ReservarContent() {
  const params = useSearchParams();
  const [pointId, setPointId] = useState<string>(params.get("ponto") ?? "hub-1");
  const [plan, setPlan] = useState<PlanId>(ME.planId);
  const [hour, setHour] = useState<number>(
    params.get("hora") ? Number(params.get("hora")) : 22,
  );
  const [step, setStep] = useState<Step>("escolher");
  const [weekday, setWeekday] = useState(1); // recorrente semanal

  const point = useMemo(() => POINTS.find((p) => p.id === pointId) ?? POINTS[0], [pointId]);
  const current = PLAN_BY_ID[plan];
  const hours = plan === "noturno" ? NIGHT_HOURS : DAY_HOURS;
  const duration = plan === "noturno" ? 480 : 60;

  const estimateKwh = plan === "noturno" ? 200 : 42;
  const overEstimate = Math.max(0, estimateKwh - current.includedKwh!);
  const overCost = overEstimate * current.overageRate;
  const totalToday = current.monthlyFee + overCost;

  if (step === "feito") {
    return (
      <div className="mx-auto flex max-w-[620px] flex-col items-center py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-free/15 ring-1 ring-free/30">
          <Check className="h-8 w-8 text-free" strokeWidth={2.5} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Vaga reservada</h1>
        <p className="mt-2 text-[13px] text-muted-foreground/80">
          {point.name} · {fmt(hour)} · connector liberado no seu nome
        </p>

        <div className="ev-card mt-6 w-full rounded-xl border border-border p-5 text-left">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            Como ativar
          </p>
          <ol className="mt-3 space-y-3">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold">1</span>
              <p className="text-[13px] text-foreground/90">
                Chegue no local dentro da janela. A trava só libera com você a menos de{" "}
                <span className="text-foreground">{TOLERANCE_MIN} m</span> do ponto.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold">2</span>
              <p className="text-[13px] text-foreground/90">
                Escaneie o QR Code do painel do carregador ou aproxime o celular.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold">3</span>
              <p className="text-[13px] text-foreground/90">
                A carga começa e o kWh desconta da sua franquia. Excedente sai a{" "}
                <span className="text-foreground">R$ {current.overageRate.toFixed(2).replace(".", ",")}/kWh</span>.
              </p>
            </li>
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/motorista/pontos"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-foreground/[0.04] px-4 text-[13px] font-medium transition-colors hover:bg-foreground/[0.08]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ver pontos
          </Link>
          <Link
            href="/motorista/assinatura"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-free/30 bg-free/10 px-4 text-[13px] font-medium text-free transition-colors hover:bg-free/15"
          >
            Ver minha assinatura
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          Agendamento
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Reservar vaga</h1>
      </div>

      <ol className="mb-6 flex items-center gap-2 text-[12px]">
        {[
          { k: "escolher", label: "Escolher ponto e horário" },
          { k: "confirmar", label: "Confirmar" },
          { k: "feito", label: "Reservado" },
        ].map((s, i) => {
          const order = ["escolher", "confirmar", "feito"];
          const cur = order.indexOf(step);
          const done = i <= cur;
          return (
            <li key={s.k} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold",
                  done ? "bg-free/15 text-free" : "bg-muted text-muted-foreground/60",
                )}
              >
                {i + 1}
              </span>
              <span className={done ? "text-foreground" : "text-muted-foreground/60"}>{s.label}</span>
              {i < 2 && <span className="mx-1 h-px w-8 bg-border" />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="ev-card rounded-xl border border-border p-5">
            <h2 className="text-[13px] font-semibold">1. Ponto de recarga</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {POINTS.map((p) => {
                const on = p.id === pointId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPointId(p.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      on ? "border-free/40 bg-free/[0.07]" : "border-border hover:border-foreground/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-medium">{p.name}</span>
                      {on && <Check className="h-3.5 w-3.5 shrink-0 text-free" />}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">{p.neighborhood}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.connectors.map((c) => (
                        <KindBadge key={c.id} kind={c.kind} powerKw={c.powerKw} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="ev-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">2. Janela de horário</h2>
              <div className="inline-flex rounded-md border border-border p-0.5">
                {(["noturno", "pro"] as PlanId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setPlan(id);
                      if (id === "noturno" && hour < 6) setHour(22);
                      if (id === "pro" && (hour >= 20 || hour < 6)) setHour(12);
                    }}
                    className={cn(
                      "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                      plan === id ? "bg-foreground text-background" : "text-muted-foreground",
                    )}
                  >
                    {PLAN_BY_ID[id].name}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-1.5 text-[12px] text-muted-foreground/70">
              Janela permitida: {PLAN_WINDOW_LABEL[plan]} · duração {duration >= 60 ? `${duration / 60}h` : `${duration} min`}
            </p>

            <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour(h)}
                  className={cn(
                    "rounded-md border py-2 font-mono text-[12px] transition-colors",
                    hour === h
                      ? "border-free/50 bg-free/15 text-free"
                      : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                  )}
                >
                  {fmt(h)}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-free" />
              <p className="text-[12px] text-muted-foreground/80">
                Reserva fixa semanal, no mesmo conector, com{" "}
                <span className="text-foreground">{BUFFER_MIN} min</span> de folga entre
                agendamentos. Sem recorrência, a reserva vale só para a noite escolhida.
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWeekday(i)}
                  className={cn(
                    "h-8 w-10 rounded-md border text-[11px] font-medium transition-colors",
                    weekday === i
                      ? "border-foreground/25 bg-foreground/[0.08] text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-muted-foreground/60">
                recorrência semanal
              </span>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="ev-card rounded-xl border border-border p-5">
            <h2 className="text-[13px] font-semibold">Resumo</h2>

            <dl className="mt-4 space-y-3 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground/70">
                  <MapPin className="h-3.5 w-3.5" /> Ponto
                </dt>
                <dd className="text-right font-medium">{point.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground/70">
                  <Clock className="h-3.5 w-3.5" /> Horário
                </dt>
                <dd className="text-right font-medium">
                  {fmt(hour)} · {duration >= 60 ? `${duration / 60}h` : `${duration} min`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground/70">
                  <Timer className="h-3.5 w-3.5" /> Tolerância
                </dt>
                <dd className="text-right font-medium">{TOLERANCE_MIN} min</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground/70">Plano</dt>
                <dd className="text-right font-medium">{current.name}</dd>
              </div>
            </dl>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-[12px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground/70">Mensalidade</span>
                <span className="tabular-nums">R$ {current.monthlyFee.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground/70">Franquia do plano</span>
                <span className="tabular-nums">{current.includedKwh} kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground/70">Carga estimada</span>
                <span className="tabular-nums">{estimateKwh} kWh</span>
              </div>
              {overEstimate > 0 && (
                <div className="flex justify-between text-busy">
                  <span>Excedente ({overEstimate} kWh)</span>
                  <span className="tabular-nums">
                    R$ {overCost.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-[13px] font-semibold">
                <span>Total do ciclo</span>
                <span className="tabular-nums">
                  R$ {totalToday.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(step === "escolher" ? "confirmar" : "feito")}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-free/15 text-[13px] font-semibold text-free ring-1 ring-free/30 transition-colors hover:bg-free/20"
            >
              {step === "escolher" ? "Revisar reserva" : "Confirmar reserva"}
              <Check className="h-4 w-4" />
            </button>

            <div className="mt-3 space-y-2">
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/70">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-busy" />
                Não iniciar a carga gera taxa de no-show. Passar do tempo gera multa de{" "}
                {IDLE_FEE_PER_MIN.toFixed(2).replace(".", ",")} R$/min.
              </p>
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/70">
                <QrCode className="h-3 w-3 shrink-0 text-taken" />
                O conector só destrava com QR Code + GPS no local.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ReservarPage() {
  return (
    <Shell scope="motorista">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
        <ReservarContent />
      </Suspense>
    </Shell>
  );
}
