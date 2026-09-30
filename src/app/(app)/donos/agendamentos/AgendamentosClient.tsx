"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/app/(app)/layout-client";
import {
  POINTS,
  fmtHour,
  type Booking,
  type Point,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { KindBadge } from "@/components/status";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Ban,
  Clock3,
  Loader2,
  PowerOff,
} from "lucide-react";

const GRID_START = 6;
const GRID_END = 24;
const H_PX = 46; // altura de cada hora

const STATUS_CELL: Record<
  Booking["status"],
  { bar: string; chip: string; label: string }
> = {
  confirmed: {
    bar: "bg-[#16a34a]/22 border-[#16a34a]/45",
    chip: "bg-[#16a34a]/15 text-[#16a34a] border-[#16a34a]/30",
    label: "Confirmado",
  },
  pending: {
    bar: "bg-busy/22 border-busy/45",
    chip: "bg-busy/15 text-busy border-busy/30",
    label: "Aguardando check-in",
  },
  cancelled: {
    bar: "#f2f3f2/30 border-black/10",
    chip: "#f2f3f2 text-black/70 border-black/10",
    label: "Cancelado",
  },
  no_show: {
    bar: "bg-danger/22 border-danger/45",
    chip: "bg-danger/15 text-danger border-danger/30",
    label: "No-show",
  },
  done: {
    bar: "bg-taken/18 border-taken/40",
    chip: "bg-taken/12 text-taken border-taken/30",
    label: "Concluído",
  },
  in_progress: {
    bar: "bg-dc/22 border-dc/45",
    chip: "bg-dc/15 text-dc border-dc/30",
    label: "Em carga",
  },
};

const endOf = (b: Booking) => b.start + b.durationMin / 60;

type Props = {
  initialBookings: Booking[];
  initialPoints: Point[];
};

export function AgendamentosClient({
  initialBookings,
  initialPoints,
}: Props) {
  const router = useRouter();
  const [pointId, setPointId] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    { type: "ok" | "err"; msg: string } | null
  >(null);
  const [, startTransition] = useTransition();

  const point =
    pointId === "all" ? null : initialPoints.find((p) => p.id === pointId);
  const connectors = useMemo(
    () => (point ? point.connectors : initialPoints.flatMap((p) => p.connectors)),
    [point, initialPoints],
  );

  const bookings = initialBookings;

  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  async function cancelBooking(b: Booking) {
    if (
      !confirm(
        `Cancelar a reserva de ${b.user} em ${fmtHour(b.start)}? Essa ação libera o conector ${b.connectorId}.`,
      )
    )
      return;
    setBusyId(b.id);
    setFeedback(null);
    try {
      const r = await fetch(`/api/bookings/${b.id}/cancel`, { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Falha ao cancelar.");
      setFeedback({ type: "ok", msg: `Reserva de ${b.user} cancelada.` });
      startTransition(() => router.refresh());
    } catch (e) {
      setFeedback({
        type: "err",
        msg: e instanceof Error ? e.message : "Erro ao cancelar.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function endCharge(b: Booking) {
    if (
      !confirm(
        `Encerrar a carga em andamento de ${b.user}? kWh consumido será calculado automaticamente.`,
      )
    )
      return;
    setBusyId(b.id);
    setFeedback(null);
    try {
      const r = await fetch(`/api/bookings/${b.id}/end`, { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.ok)
        throw new Error(data.error || "Falha ao encerrar carga.");
      setFeedback({
        type: "ok",
        msg: `Carga de ${b.user} encerrada · ${data.kwhConsumido.toFixed(2)} kWh · R$ ${(data.kwhConsumido * 2.04).toFixed(2)}`,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setFeedback({
        type: "err",
        msg: e instanceof Error ? e.message : "Erro ao encerrar.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell scope="donos">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Grade de agendamentos
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] capitalize text-black/70">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateLabel} · {bookings.length} reservas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-[6px] border border-black/10 #ffffff p-0.5">
              <button
                type="button"
                onClick={() => setPointId("all")}
                className={cn(
                  "rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors",
                  pointId === "all" ? "#000000 text-background" : "text-black",
                )}
              >
                Todos
              </button>
              {initialPoints.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPointId(p.id)}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors",
                    pointId === p.id ? "#000000 text-background" : "text-black",
                  )}
                >
                  {p.neighborhood}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center rounded-[6px] border border-black/10 #ffffff">
              <button
                type="button"
                aria-label="Dia anterior"
                className="flex h-8 w-8 items-center justify-center text-black transition-colors hover:text-black"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="border-x border-black/10 px-3 text-[12px] font-medium">
                Hoje
              </span>
              <button
                type="button"
                aria-label="Próximo dia"
                className="flex h-8 w-8 items-center justify-center text-black transition-colors hover:text-black"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
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

        <div className="mb-4 flex flex-wrap gap-3 text-[11px]">
          {(
            ["confirmed", "no_show", "cancelled", "in_progress", "done"] as Booking["status"][]
          ).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className={cn("h-2.5 w-2.5 rounded-sm border", STATUS_CELL[s].bar)}
                aria-hidden
              />
              <span className="#000000/70">{STATUS_CELL[s].label}</span>
            </span>
          ))}
        </div>

        <div className="ev-card overflow-hidden rounded-[6px] border border-black/10">
          <div className="overflow-x-auto">
            <div className="min-w-[880px]">
              {/* header */}
              <div
                className="grid border-b border-black/10"
                style={{
                  gridTemplateColumns: `72px repeat(${connectors.length}, minmax(0,1fr))`,
                }}
              >
                <div className="px-3 py-2.5 text-[11px] font-medium text-black/70">
                  Hora
                </div>
                {connectors.map((c) => {
                  const p = initialPoints.find((pp) => pp.id === c.pointId)!;
                  return (
                    <div
                      key={c.id}
                      className="border-l border-black/10 px-3 py-2"
                    >
                      <p className="truncate text-[12px] font-medium">
                        {p.neighborhood}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5">
                        <KindBadge kind={c.kind} powerKw={c.powerKw} />
                        <span className="font-mono text-[10px] text-black/60">
                          {c.id}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* corpo */}
              <div
                className="relative grid"
                style={{
                  gridTemplateColumns: `72px repeat(${connectors.length}, minmax(0,1fr))`,
                  height: hours.length * H_PX,
                }}
              >
                {/* linhas de hora */}
                <div className="relative">
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 w-full px-3"
                      style={{ top: i * H_PX }}
                    >
                      <span className="font-mono text-[10px] text-black/50">
                        {String(h).padStart(2, "0")}h
                      </span>
                    </div>
                  ))}
                </div>

                {/* colunas de conector */}
                {connectors.map((c) => {
                  const colBookings = bookings.filter(
                    (b) => b.connectorId === c.id,
                  );
                  return (
                    <div
                      key={c.id}
                      className="relative border-l border-black/10"
                      style={{ height: hours.length * H_PX }}
                    >
                      {hours.map((h, i) => (
                        <div
                          key={h}
                          className="absolute left-0 w-full border-t border-black/10/50"
                          style={{ top: i * H_PX }}
                        />
                      ))}

                      {colBookings.map((b) => {
                        const top = (b.start - GRID_START) * H_PX;
                        const height = Math.max(
                          22,
                          (b.durationMin / 60) * H_PX - 2,
                        );
                        const st = STATUS_CELL[b.status];
                        return (
                          <div
                            key={b.id}
                            className={cn(
                              "absolute left-1 right-1 overflow-hidden rounded-[6px] border px-2 py-1",
                              st.bar,
                            )}
                            style={{ top: Math.max(0, top), height }}
                          >
                            <p className="truncate text-[11px] font-medium text-black">
                              {b.user}
                            </p>
                            {height > 34 && (
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-black/80">
                                <Clock3 className="h-2.5 w-2.5" />
                                {fmtHour(b.start)}–{fmtHour(endOf(b))}
                              </p>
                            )}
                            {height > 52 && (
                              <span
                                className={cn(
                                  "mt-1 inline-block rounded border px-1 py-0.5 text-[9px] font-medium",
                                  st.chip,
                                )}
                              >
                                {st.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 ev-card rounded-[6px] border border-black/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold">Ajuste manual</h2>
            <p className="text-[11px] text-black/60">
              clique numa reserva pra cancelar ou encerrar carga em andamento
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bookings.map((b) => {
              const p = initialPoints.find((pp) => pp.id === b.pointId)!;
              const st = STATUS_CELL[b.status];
              const isBusy = busyId === b.id;
              const canCancel =
                b.status === "confirmed" || b.status === "pending";
              const canEnd = b.status === "in_progress";
              const locked = b.status === "cancelled" || b.status === "done";
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-[6px] border border-black/10 #f7f8f6/40 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{b.user}</p>
                    <p className="mt-0.5 truncate text-[11px] text-black/70">
                      {p.neighborhood} · {b.connectorId} · {fmtHour(b.start)}
                    </p>
                    <span
                      className={cn(
                        "mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium",
                        st.chip,
                      )}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canEnd && (
                      <button
                        type="button"
                        onClick={() => endCharge(b)}
                        disabled={isBusy}
                        aria-label={`Encerrar carga de ${b.user}`}
                        className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-black/10 px-2 text-[11px] font-medium text-black transition-colors hover:border-dc/40 hover:bg-dc/10 hover:text-dc disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <PowerOff className="h-3 w-3" />
                        )}
                        Encerrar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => cancelBooking(b)}
                        disabled={isBusy}
                        aria-label={`Cancelar reserva de ${b.user}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-black/10 text-black transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {locked && (
                      <span
                        aria-label="Reserva finalizada"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-black/10 text-black/30"
                      >
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
