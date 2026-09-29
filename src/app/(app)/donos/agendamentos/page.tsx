"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/app/(app)/layout-client";
import { POINTS, BOOKINGS, fmtHour, type Booking } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { KindBadge } from "@/components/status";
import { CalendarDays, ChevronLeft, ChevronRight, Ban, Clock3 } from "lucide-react";

const GRID_START = 6;
const GRID_END = 24;
const H_PX = 46; // altura de cada hora

const STATUS_CELL: Record<
  Booking["status"],
  { bar: string; chip: string; label: string }
> = {
  confirmed: {
    bar: "bg-free/22 border-free/45",
    chip: "bg-free/15 text-free border-free/30",
    label: "Confirmado",
  },
  pending: {
    bar: "bg-busy/22 border-busy/45",
    chip: "bg-busy/15 text-busy border-busy/30",
    label: "Aguardando check-in",
  },
  cancelled: {
    bar: "bg-muted/30 border-border",
    chip: "bg-muted text-muted-foreground/70 border-border",
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
};

const endOf = (b: Booking) => b.start + b.durationMin / 60;

export default function AgendamentosPage() {
  const [pointId, setPointId] = useState<string>("all");
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());

  const point = pointId === "all" ? null : POINTS.find((p) => p.id === pointId);
  const connectors = useMemo(
    () => (point ? point.connectors : POINTS.flatMap((p) => p.connectors)),
    [point],
  );

  const bookings = useMemo(
    () => BOOKINGS.filter((b) => !cancelled.has(b.id)),
    [cancelled],
  );

  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <Shell scope="donos">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              Sistema de donos
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Grade de agendamentos</h1>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] capitalize text-muted-foreground/70">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateLabel} · {bookings.length} reservas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setPointId("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                  pointId === "all" ? "bg-foreground text-background" : "text-muted-foreground",
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
                    "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                    pointId === p.id ? "bg-foreground text-background" : "text-muted-foreground",
                  )}
                >
                  {p.neighborhood}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center rounded-lg border border-border bg-card">
              <button
                type="button"
                aria-label="Dia anterior"
                className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="border-x border-border px-3 text-[12px] font-medium">Hoje</span>
              <button
                type="button"
                aria-label="Próximo dia"
                className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 text-[11px]">
          {(["confirmed", "no_show", "cancelled"] as Booking["status"][]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className={cn("h-2.5 w-2.5 rounded-sm border", STATUS_CELL[s].bar)}
                aria-hidden
              />
              <span className="text-muted-foreground/70">{STATUS_CELL[s].label}</span>
            </span>
          ))}
        </div>

        <div className="ev-card overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <div className="min-w-[880px]">
              {/* header */}
              <div
                className="grid border-b border-border"
                style={{ gridTemplateColumns: `72px repeat(${connectors.length}, minmax(0,1fr))` }}
              >
                <div className="px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                  Hora
                </div>
                {connectors.map((c) => {
                  const p = POINTS.find((pp) => pp.id === c.pointId)!;
                  return (
                    <div key={c.id} className="border-l border-border px-3 py-2">
                      <p className="truncate text-[12px] font-medium">{p.neighborhood}</p>
                      <p className="mt-1 flex items-center gap-1.5">
                        <KindBadge kind={c.kind} powerKw={c.powerKw} />
                        <span className="font-mono text-[10px] text-muted-foreground/60">
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
                      <span className="font-mono text-[10px] text-muted-foreground/50">
                        {String(h).padStart(2, "0")}h
                      </span>
                    </div>
                  ))}
                </div>

                {/* colunas de conector */}
                {connectors.map((c) => {
                  const colBookings = bookings.filter((b) => b.connectorId === c.id);
                  return (
                    <div
                      key={c.id}
                      className="relative border-l border-border"
                      style={{ height: hours.length * H_PX }}
                    >
                      {hours.map((h, i) => (
                        <div
                          key={h}
                          className="absolute left-0 w-full border-t border-border/50"
                          style={{ top: i * H_PX }}
                        />
                      ))}

                      {colBookings.map((b) => {
                        const top = (b.start - GRID_START) * H_PX;
                        const height = Math.max(22, (b.durationMin / 60) * H_PX - 2);
                        const st = STATUS_CELL[b.status];
                        return (
                          <div
                            key={b.id}
                            className={cn(
                              "absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1",
                              st.bar,
                            )}
                            style={{ top: Math.max(0, top), height }}
                          >
                            <p className="truncate text-[11px] font-medium text-foreground">
                              {b.user}
                            </p>
                            {height > 34 && (
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/80">
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

        <div className="mt-4 ev-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold">Ajuste manual</h2>
            <p className="text-[11px] text-muted-foreground/60">
              clique numa reserva pra liberar ou cancelar o conector
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bookings.map((b) => {
              const p = POINTS.find((pp) => pp.id === b.pointId)!;
              const st = STATUS_CELL[b.status];
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{b.user}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
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
                  <button
                    type="button"
                    onClick={() =>
                      setCancelled((prev) => {
                        const next = new Set(prev);
                        next.add(b.id);
                        return next;
                      })
                    }
                    aria-label={`Cancelar reserva de ${b.user}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
