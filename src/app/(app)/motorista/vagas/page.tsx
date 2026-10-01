"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { POINTS, type Point, isNight } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ArrowRight, BatteryCharging, Info, Moon, Sun } from "lucide-react";

const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 0, 2, 4];

type SlotState = "free" | "tight" | "full" | "offline";

function slotState(point: Point, hour: number): SlotState {
  const connectors = point.connectors;
  if (connectors.every((c) => c.status === "offline")) return "offline";
  const inWindow = isNight(hour) || (hour >= 6 && hour < 20);
  if (!inWindow) return "offline";

  const free = connectors.filter((c) => c.status === "free").length;
  const busy = connectors.filter((c) => c.status === "in_use").length;

  if (free >= 2) return "free";
  if (busy > 0 && free === 0) return "full";
  if (free > 0) return "tight";
  return "full";
}

const SLOT_STYLE: Record<SlotState, { cell: string; label: string }> = {
  free: { cell: "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]", label: "Livre" },
  tight: { cell: "border-amber-300 bg-amber-50 text-amber-700", label: "Última vaga" },
  full: { cell: "border-black/10 bg-[#f2f3f2]/40 text-black/50", label: "Ocupado" },
  offline: { cell: "border-dashed border-black/10 bg-transparent text-black/35", label: "Fora da janela" },
};

function summarize(point: Point): {
  free: number;
  busy: number;
  offline: number;
  kind: string;
  powerKw: number;
} {
  const free = point.connectors.filter((c) => c.status === "free").length;
  const busy = point.connectors.filter((c) => c.status === "in_use").length;
  const offline = point.connectors.filter((c) => c.status === "offline").length;
  const first = point.connectors[0];
  return {
    free,
    busy,
    offline,
    kind: first?.kind ?? "AC",
    powerKw: first?.powerKw ?? 0,
  };
}

function PointRow({
  point,
  selectedHour,
  onPickHour,
}: {
  point: Point;
  selectedHour: number;
  onPickHour: (h: number) => void;
}) {
  const summary = summarize(point);
  return (
    <div className="min-w-0 rounded-[6px] border border-black/10 bg-white p-3.5">
      {/* Header: titulo + badges resumidos (compactos, sem overflow) */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold leading-tight">
            {point.name}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-black/70">
            {point.neighborhood}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              "inline-flex items-center rounded-[6px] border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              summary.free > 0
                ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]"
                : "border-black/10 bg-black/5 text-black/55",
            )}
          >
            {summary.free} livre{summary.free !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center rounded-[6px] border border-black/10 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-black/70">
            {summary.kind} {summary.powerKw}kW
          </span>
        </div>
      </div>

      {/* Linha de horarios — scroll horizontal deliberado, sem scroll vertical */}
      <div
        className="mt-3 -mx-1 overflow-x-auto overflow-y-hidden pb-1"
        style={{ WebkitOverflowScrolling: "touch", maxWidth: "100%" }}
      >
        <div className="flex gap-1 px-1">
          {HOURS.map((hour) => {
            const st = slotState(point, hour);
            const s = SLOT_STYLE[st];
            const night = isNight(hour);
            const display = hour % 24;
            return (
              <button
                key={hour}
                type="button"
                onClick={() => onPickHour(hour)}
                disabled={st === "offline"}
                aria-label={`${s.label} às ${String(display).padStart(2, "0")}h`}
                className={cn(
                  "group flex w-[44px] shrink-0 flex-col items-center gap-0.5 rounded-[6px] border py-1.5 transition-all",
                  s.cell,
                  selectedHour === hour && "ring-2 ring-black/50 ring-offset-1 ring-offset-white",
                  st !== "offline" && "cursor-pointer hover:brightness-110 active:scale-95",
                  st === "offline" && "cursor-not-allowed",
                )}
              >
                <span className="flex items-center gap-0.5 text-[10px] font-medium tabular-nums">
                  {night ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
                  {String(display).padStart(2, "0")}h
                </span>
                <span className="h-0.5 w-3 rounded-full bg-current opacity-70" />
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
  const [pointId, setPointId] = useState<string | null>(preset);
  const [hour, setHour] = useState(22);

  const points = useMemo(
    () => (pointId ? POINTS.filter((p) => p.id === pointId) : POINTS),
    [pointId],
  );

  return (
    <div className="mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold tracking-tight sm:text-2xl">
          Ver vaga pra carregar
        </h1>
        <p className="mt-1 text-[12px] text-black/70 sm:text-[13px]">
          Toque num horário pra abrir a reserva.
        </p>
      </div>

      {/* Filtro de pontos — scroll horizontal em mobile (chips muito mais faceis) */}
      <div
        className="mb-4 -mx-4 max-w-full overflow-x-auto overflow-y-hidden px-4 pb-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-1.5 min-w-min">
          <button
            type="button"
            onClick={() => setPointId(null)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3.5 text-[12px] font-medium transition-colors",
              pointId === null
                ? "border-black/30 bg-black text-white"
                : "border-black/10 bg-white text-black hover:border-black/20",
            )}
          >
            Todos
          </button>
          {POINTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPointId(p.id)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3.5 text-[12px] font-medium transition-colors",
                pointId === p.id
                  ? "border-black/30 bg-black text-white"
                  : "border-black/10 bg-white text-black hover:border-black/20",
              )}
            >
              {p.neighborhood}
            </button>
          ))}
        </div>
      </div>

      {/* Relogio atual + legenda compacta */}
      <div className="mb-3 flex items-center justify-between text-[11px] text-black/60">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#16a34a]/30" /> Livre
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-amber-300" /> Última
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-black/10" /> Ocupado
          </span>
        </div>
        <span className="font-mono">
          hora: {String(hour % 24).padStart(2, "0")}h
        </span>
      </div>

      <div className="grid gap-2.5">
        {points.map((p) => (
          <PointRow key={p.id} point={p} selectedHour={hour} onPickHour={setHour} />
        ))}
      </div>

      <div className="mt-5 rounded-[6px] border border-black/10 bg-white p-3.5">
        <div className="flex items-start gap-2 text-[12px] text-black/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Você tem <span className="font-medium text-black">15 min de tolerância</span> depois do horário reservado. Passou disso, a vaga volta pra rede e pode gerar taxa de no-show.
          </p>
        </div>
        <Link
          href={pointId ? `/motorista/reservar?ponto=${pointId}` : "/motorista/reservar"}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#15803d]"
        >
          <BatteryCharging className="h-4 w-4" />
          Reservar neste ponto
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function VagasPage() {
  return (
    <Shell scope="motorista">
      <Suspense fallback={<div className="text-sm text-black">Carregando…</div>}>
        <VagasContent />
      </Suspense>
    </Shell>
  );
}