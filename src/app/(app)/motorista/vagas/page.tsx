"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { POINTS, type Point, isNight } from "@/lib/mock-data";
import { StatusPill, KindBadge } from "@/components/status";
import { cn } from "@/lib/utils";
import { ArrowRight, BatteryCharging, Info, Moon, Sun } from "lucide-react";

const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 0, 2, 4, 6];

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
  tight: { cell: "border-busy/30 bg-busy/10 text-busy", label: "Última vaga" },
  full: { cell: "border-black/10 bg-[#f2f3f2]/40 text-black/50", label: "Ocupado" },
  offline: { cell: "border-dashed border-black/10 bg-transparent text-black/35", label: "Fora da janela" },
};

function PointRow({
  point,
  selectedHour,
  onPickHour,
}: {
  point: Point;
  selectedHour: number;
  onPickHour: (h: number) => void;
}) {
  return (
    <div className="ev-card rounded-[6px] border border-black/10 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold">{point.name}</h3>
          <p className="mt-0.5 text-[12px] text-black/70">{point.neighborhood}</p>
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
            const st = slotState(point, hour);
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
  const [pointId, setPointId] = useState<string | null>(preset);
  const [hour, setHour] = useState(22);

  const points = useMemo(
    () => (pointId ? POINTS.filter((p) => p.id === pointId) : POINTS),
    [pointId],
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">
          Ver vaga pra carregar
        </h1>
        <p className="mt-1.5 text-[13px] text-black/70">
          Vagas livres nos hubs. Toque num horário pra abrir a reserva.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPointId(null)}
          className={cn(
            "h-8 rounded-[6px] border px-3 text-[12px] font-medium transition-colors",
            pointId === null
              ? "border-black/20 bg-black/[0.08] text-black"
              : "border-black/10 text-black hover:text-black",
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
                ? "border-black/20 bg-black/[0.08] text-black"
                : "border-black/10 text-black hover:text-black",
            )}
          >
            {p.neighborhood}
          </button>
        ))}
        <span className="ml-auto font-mono text-[12px] text-black/70">
          horário: {String(hour % 24).padStart(2, "0")}h
        </span>
      </div>

      <div className="grid gap-3">
        {points.map((p) => (
          <PointRow key={p.id} point={p} selectedHour={hour} onPickHour={setHour} />
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[6px] border border-black/10 bg-[#ffffff]/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-[12px] text-black/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-taken" />
          <p>
            Você tem <span className="font-medium text-black">15 min de tolerância</span>{" "}
            depois do horário reservado. Passou disso sem iniciar a carga, a vaga
            volta pra rede e pode gerar taxa de no-show.
          </p>
        </div>
        <Link
          href={pointId ? `/motorista/reservar?ponto=${pointId}` : "/motorista/reservar"}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#15803d]"
        >
          <BatteryCharging className="h-4 w-4" />
          Reservar neste ponto
          <ArrowRight className="h-3.5 w-3.5" />
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