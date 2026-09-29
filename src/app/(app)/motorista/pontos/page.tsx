"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { POINTS, freeCount, type Point } from "@/lib/mock-data";
import { StatusPill, KindBadge, STATUS_STYLE } from "@/components/status";
import { RealMap } from "@/components/real-map";
import { cn } from "@/lib/utils";
import { Clock, MapPin, ArrowRight, Filter } from "lucide-react";

type FilterKind = "todos" | "AC" | "DC";
type FilterFocus = "todos" | "moradores" | "motoristas";

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/55">Rede Voltrio</p>
            <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em]">Onde tem ponto de recarga</h1>
            <p className="mt-1 text-[14px] text-black/70">
              {totalFree} de {totalConn} conectores livres agora · zona sul, barra e centro
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-[6px] border border-black/10 bg-white p-0.5">
              <Filter className="ml-1.5 h-3.5 w-3.5 text-black/55" />
              {(["todos", "AC", "DC"] as FilterKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[12px] font-semibold transition-colors",
                    kind === k ? "bg-black text-white" : "text-black/70 hover:bg-black/5 hover:text-black",
                  )}
                >
                  {k === "todos" ? "Todos" : k}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-[6px] border border-black/10 bg-white p-0.5">
              {(["todos", "moradores", "motoristas"] as FilterFocus[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocus(f)}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[12px] font-semibold capitalize transition-colors",
                    focus === f ? "bg-black text-white" : "text-black/70 hover:bg-black/5 hover:text-black",
                  )}
                >
                  {f === "todos" ? "Todos" : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <RealMap points={points} />

          <div className="flex flex-col gap-3">
            {points.map((p) => {
              const free = freeCount(p);
              return (
                <div key={p.id} className="rounded-[6px] border border-black/10 bg-white p-4 transition-colors hover:border-black/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-[15px] font-semibold">{p.name}</h2>
                        <span className={cn("rounded-[6px] border px-2 py-0.5 text-[11px] font-semibold", p.focus === "moradores" ? "border-black/10 text-black" : "border-black/20 text-black")}>
                          {p.focus === "moradores" ? "Moradores" : "Motoristas"}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-black/70">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {p.address}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-black/70">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {p.openHours} · {p.partner}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[22px] font-semibold tabular-nums leading-none">
                        {free}
                        <span className="text-[14px] text-black/55">/2</span>
                      </div>
                      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/55">livres</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {p.connectors.map((c) => (
                      <span
                        key={c.id}
                        className={cn("inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-1 text-[11px]", STATUS_STYLE[c.status].chip, STATUS_STYLE[c.status].border)}
                      >
                        <KindBadge kind={c.kind} powerKw={c.powerKw} />
                        <span className={STATUS_STYLE[c.status].text}>{STATUS_STYLE[c.status].label}</span>
                        {c.note ? <span className="text-black/55">· {c.note}</span> : null}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-black/10 pt-3">
                    <Link
                      href={`/motorista/vagas?ponto=${p.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-black/10 bg-black/5 px-3 text-[12px] font-semibold text-black transition-colors hover:bg-black/10"
                    >
                      Ver vagas
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <Link
                      href={`/motorista/reservar?ponto=${p.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-[#16a34a]/20 bg-[#16a34a]/10 px-3 text-[12px] font-semibold text-[#16a34a] transition-colors hover:bg-[#16a34a]/15"
                    >
                      Reservar
                    </Link>
                  </div>
                </div>
              );
            })}

            {points.length === 0 && (
              <div className="rounded-[6px] border border-black/10 bg-white p-8 text-center text-[14px] text-black/70">
                Nenhum ponto com esse filtro.
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
