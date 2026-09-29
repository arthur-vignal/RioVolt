"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { POINTS, freeCount, type Point } from "@/lib/mock-data";
import { StatusPill, KindBadge, STATUS_STYLE } from "@/components/status";
import { cn } from "@/lib/utils";
import { Clock, MapPin, ArrowRight, Filter } from "lucide-react";

type FilterKind = "todos" | "AC" | "DC";
type FilterFocus = "todos" | "moradores" | "motoristas";

function MapPanel({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="ev-card ev-grid relative aspect-4/3 w-full overflow-hidden rounded-xl border border-border lg:aspect-auto lg:h-full lg:min-h-[420px]">
      {/* rio + referencias */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute left-0 top-[38%] h-[10%] w-full -skew-y-2 bg-ac/[0.06]"
          aria-hidden
        />
        <span className="absolute left-[42%] top-[40%] text-[10px] uppercase tracking-[0.2em] text-muted-foreground/45">
          Zona Sul
        </span>
        <span className="absolute left-[6%] top-[72%] text-[10px] uppercase tracking-[0.2em] text-muted-foreground/45">
          Barra
        </span>
        <span className="absolute left-[66%] top-[6%] text-[10px] uppercase tracking-[0.2em] text-muted-foreground/45">
          Maracanã
        </span>
        <span className="absolute left-[58%] top-[12%] text-[10px] uppercase tracking-[0.2em] text-muted-foreground/45">
          Centro
        </span>
      </div>

      {points.map((p) => {
        const worst =
          p.connectors.find((c) => c.status === "offline") ??
          p.connectors.find((c) => c.status === "in_use") ??
          p.connectors.find((c) => c.status === "reserved") ??
          p.connectors.find((c) => c.status === "free");
        const style = STATUS_STYLE[worst?.status ?? "free"];
        const active = hover === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(p.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-label={`${p.name}, ${freeCount(p)} vagas livres`}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full ring-4 transition-transform",
                style.bg,
                style.border.replace("/30", "/20"),
                "ring-background/60",
                active && "scale-110",
              )}
              style={{ width: 30, height: 30 }}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
            </span>
            <span
              className={cn(
                "absolute left-1/2 top-[calc(100%+4px)] -translate-x-1/2 whitespace-nowrap text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground/70",
              )}
            >
              {p.neighborhood}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function PontosPage() {
  const [kind, setKind] = useState<FilterKind>("todos");
  const [focus, setFocus] = useState<FilterFocus>("todos");

  const points = useMemo(
    () =>
      POINTS.filter((p) => {
        if (focus !== "todos" && p.focus !== focus) return false;
        if (kind !== "todos" && !p.connectors.some((c) => c.kind === kind)) return false;
        return true;
      }),
    [kind, focus],
  );

  const totalFree = POINTS.reduce((a, p) => a + freeCount(p), 0);
  const totalConn = POINTS.reduce((a, p) => a + p.connectors.length, 0);

  return (
    <Shell scope="motorista">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              Rede EV Park
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
              Onde tem ponto de recarga
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground/70">
              {totalFree} de {totalConn} conectores livres agora · zona sul, barra e centro
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card p-0.5">
              <Filter className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/60" />
              {(["todos", "AC", "DC"] as FilterKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    kind === k
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "todos" ? "Todos" : k}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card p-0.5">
              {(["todos", "moradores", "motoristas"] as FilterFocus[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocus(f)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    focus === f
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "todos" ? "Todos" : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <MapPanel points={points} />

          <div className="flex flex-col gap-3">
            {points.map((p) => {
              const free = freeCount(p);
              return (
                <div
                  key={p.id}
                  className="ev-card rounded-xl border border-border p-4 transition-colors hover:border-foreground/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-[15px] font-semibold">{p.name}</h2>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            p.focus === "moradores"
                              ? "border-ac/30 bg-ac/10 text-ac"
                              : "border-dc/30 bg-dc/10 text-dc",
                          )}
                        >
                          {p.focus === "moradores" ? "Moradores" : "Motoristas"}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
                        <MapPin className="h-3 w-3" />
                        {p.address}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        {p.openHours} · {p.partner}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-semibold tabular-nums">
                        {free}
                        <span className="text-sm text-muted-foreground/60">/2</span>
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                        livres
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {p.connectors.map((c) => (
                      <span
                        key={c.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]",
                          STATUS_STYLE[c.status].bg,
                          STATUS_STYLE[c.status].border,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", STATUS_STYLE[c.status].dot)}
                        />
                        <KindBadge kind={c.kind} powerKw={c.powerKw} />
                        <span className={STATUS_STYLE[c.status].text}>
                          {STATUS_STYLE[c.status].label}
                        </span>
                        {c.note && (
                          <span className="text-offline/80">· {c.note}</span>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <Link
                      href={`/vagas?ponto=${p.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground/[0.05] px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-foreground/[0.09] hover:border-border"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      Ver vagas
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/reservar?ponto=${p.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-free/30 bg-free/10 px-3 text-[12px] font-medium text-free transition-colors hover:bg-free/15"
                    >
                      Reservar
                    </Link>
                  </div>
                </div>
              );
            })}

            {points.length === 0 && (
              <div className="ev-card rounded-xl border border-border p-8 text-center text-sm text-muted-foreground/70">
                Nenhum ponto com esse filtro.
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
