"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import {
  POINTS,
  PLAN_BY_ID,
  PLAN_WINDOW_LABEL,
  BUFFER_MIN,
  isNight,
  type PlanId,
  type Point,
} from "@/lib/mock-data";
import { StatusPill, KindBadge } from "@/components/status";
import { cn } from "@/lib/utils";
import { ArrowRight, BatteryCharging, Info, Moon, Sun } from "lucide-react";

const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 0, 2, 4, 6];

type SlotState = "free" | "tight" | "full" | "offline";

function slotState(point: Point, plan: PlanId, hour: number): SlotState {
  const connectors = point.connectors;
  if (connectors.every((c) => c.status === "offline")) return "offline";
  const inWindow =
    plan === "noturno" ? isNight(hour) : hour >= 6 && hour < 20;
  if (!inWindow) return "offline";

  const free = connectors.filter((c) => c.status === "free").length;
  const busy = connectors.filter((c) => c.status === "in_use").length;

  //charges noturnas ocupam quase toda a noite; de dia o AC fica ocioso
  const usable = plan === "noturno" ? 1 : 2;
  if (free >= usable) return "free";
  if (busy > 0 && free === 0) return "full";
  if (free > 0) return "tight";
  return "full";
}

const SLOT_STYLE: Record<SlotState, { cell: string; label: string }> = {
  free: { cell: "#16a34a/30 #16a34a/10 #16a34a", label: "Livre" },
  tight: { cell: "border-busy/30 bg-busy/10 text-busy", label: "Última vaga" },
  full: { cell: "border-black/10 #f2f3f2/40 #000000/50", label: "Ocupado" },
  offline: { cell: "border-dashed border-black/10 bg-transparent #000000/35", label: "Fora da janela" },
};

function PointRow({
  point,
  plan,
  selectedHour,
  onPickHour,
}: {
  point: Point;
  plan: PlanId;
  selectedHour: number;
  onPickHour: (h: number) => void;
}) {
  return (
    <div className="ev-card rounded-[6px] border border-black/10 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold">{point.name}</h3>
          <p className="mt-0.5 text-[12px] #000000/70">{point.neighborhood}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {point.connectors.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5">
              <StatusPill status={c.status} className="px-2 py-0.5 text-[10px]" />
              <KindBadge kind={c.kind} powerKw={c.powerKw} />
            </span>
          ))}
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {HOURS.map((hour, i) => {
            const st = slotState(point, plan, hour);
            const s = SLOT_STYLE[st];
            const night = isNight(hour);
            return (
              <button
                key={`${hour}-${i}`}
                type="button"
                onClick={() => onPickHour(hour)}
                disabled={st === "offline"}
                className={cn(
                  "group flex w-[54px] shrink-0 flex-col items-center gap-1 rounded-[6px] border py-2 transition-all",
                  s.cell,
                  selectedHour === hour && "ring-2 ring-foreground/70 ring-offset-1 ring-offset-background",
                  st !== "offline" && "hover:brightness-125 cursor-pointer",
                  st === "offline" && "cursor-not-allowed",
                )}
              >
                <span className="flex items-center gap-0.5 text-[10px] font-medium tabular-nums">
                  {night ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
                  {String(hour).padStart(2, "0")}h
                </span>
                <span className="h-1 w-1 rounded-[6px] bg-current opacity-70" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VagasContent() {
  const params = useSearchParams();
  const preset = params.get("ponto");
  const [plan, setPlan] = useState<PlanId>("noturno");
  const [pointId, setPointId] = useState<string | null>(preset);
  const [hour, setHour] = useState(22);

  const points = useMemo(() => (pointId ? POINTS.filter((p) => p.id === pointId) : POINTS), [pointId]);
  const current = PLAN_BY_ID[plan];

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] #000000/70">
          Disponibilidade
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Ver vaga pra carregar</h1>
        <p className="mt-1 text-[13px] #000000/70">
          Janelas do plano {current.name} · {PLAN_WINDOW_LABEL[plan]} · buffer de {BUFFER_MIN} min entre reservas
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {(["noturno", "pro"] as PlanId[]).map((id) => {
          const p = PLAN_BY_ID[id];
          const on = plan === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPlan(id)}
              className={cn(
                "ev-card rounded-[6px] border p-4 text-left transition-colors",
                on ? "#16a34a/40" : "border-black/10 hover:border-foreground/20",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-[6px]",
                      id === "noturno" ? "bg-ac" : "bg-dc",
                    )}
                  />
                  <span className="text-[14px] font-semibold">{p.name}</span>
                </div>
                {on && <span className="text-[10px] uppercase tracking-[0.14em] #16a34a">Ativo</span>}
              </div>
              <p className="mt-1 text-[12px] #000000/70">{p.tagline}</p>
              <p className="mt-2 font-mono text-[12px] #000000/80">
                Janela {PLAN_WINDOW_LABEL[id]} · {p.connectorKind} {id === "noturno" ? "7–22 kW" : "30–60 kW"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPointId(null)}
          className={cn(
            "h-8 rounded-[6px] border px-3 text-[12px] font-medium transition-colors",
            pointId === null
              ? "border-foreground/25 bg-foreground/[0.08] #000000"
              : "border-black/10 #000000 hover:#000000",
          )}
        >
          Todos os pontos
        </button>
        {POINTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPointId(p.id)}
            className={cn(
              "h-8 rounded-[6px] border px-3 text-[12px] font-medium transition-colors",
              pointId === p.id
                ? "border-foreground/25 bg-foreground/[0.08] #000000"
                : "border-black/10 #000000 hover:#000000",
            )}
          >
            {p.neighborhood}
          </button>
        ))}
        <span className="ml-auto font-mono text-[12px] #000000/70">
          horário: {String(hour).padStart(2, "0")}h
        </span>
      </div>

      <div className="grid gap-3">
        {points.map((p) => (
          <PointRow key={p.id} point={p} plan={plan} selectedHour={hour} onPickHour={setHour} />
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[6px] border border-black/10 #ffffff/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-[12px] #000000/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-taken" />
          <p>
            Você tem <span className="font-medium #000000">15 min de tolerância</span> depois do horário
            reservado. Passou disso sem iniciar a carga, a vaga volta pra rede e pode gerar taxa de no-show.
          </p>
        </div>
        <Link
          href={pointId ? `/motorista/reservar?ponto=${pointId}&hora=${hour}` : "/motorista/reservar"}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[6px] border #16a34a/30 #16a34a/10 px-4 text-[13px] font-medium #16a34a transition-colors hover:#16a34a/15"
        >
          <BatteryCharging className="h-4 w-4" />
          Reservar neste horário
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function VagasPage() {
  return (
    <Shell scope="motorista">
      <Suspense fallback={<div className="text-sm #000000">Carregando…</div>}>
        <VagasContent />
      </Suspense>
    </Shell>
  );
}
