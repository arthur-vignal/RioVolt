"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { freeCount, type Point } from "@/lib/mock-data";
import { StatusPill, KindBadge, STATUS_STYLE } from "@/components/status";
import { RealMap } from "@/components/real-map";
import { cn } from "@/lib/utils";
import { Clock, MapPin, ArrowRight } from "lucide-react";

type ActiveCharge = { startedAt: number; kwhTarget: number };

export default function PontosPage() {
  const [points, setPoints] = useState<Point[]>([]);
  const [activeCharges, setActiveCharges] = useState<Record<string, ActiveCharge>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/points")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setPoints(data.points ?? []);
        setActiveCharges(data.activeCharges ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell scope="motorista">
      <div className="mx-auto max-w-3xl">
        {/* Mapa no topo */}
        <div className="sticky top-0 z-10 -mx-4 mb-3 bg-white/85 px-4 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:-mx-6 sm:px-6">
          <RealMap points={points} chargeByConnector={activeCharges} />
        </div>

        {/* Carrossel vertical: lista rola */}
        <div className="grid gap-3 pb-12">
          {points.map((p) => {
            const free = freeCount(p);
            return (
              <div
                key={p.id}
                className="rounded-[6px] border border-black/10 bg-white p-4 transition-colors hover:border-black/20 sm:p-5"
              >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 sm:flex-1">
                <h2 className="truncate text-[15px] font-semibold sm:text-base">{p.name}</h2>
                <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-black/70 sm:text-[13px]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{p.address}</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-black/55 sm:text-[13px]">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {p.openHours}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:shrink-0 sm:flex-col sm:items-end sm:gap-0.5">
                <div className="text-[22px] font-semibold tabular-nums leading-none sm:text-[24px]">
                  {free}
                  <span className="text-[13px] text-black/55">
                    /{p.connectors.length}
                  </span>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-black/55">
                  livres
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {p.connectors.map((c) => (
                    <span
                      key={c.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-1 text-[11px]",
                        STATUS_STYLE[c.status].chip,
                        STATUS_STYLE[c.status].border,
                      )}
                    >
                      <KindBadge kind={c.kind} powerKw={c.powerKw} />
                      <span className={STATUS_STYLE[c.status].text}>
                        {STATUS_STYLE[c.status].label}
                      </span>
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-black/10 pt-3">
                  <Link
                    href={`/motorista/vagas?ponto=${p.id}`}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[6px] border border-black/10 bg-black/5 px-4 text-[13px] font-semibold text-black transition-colors hover:bg-black/10"
                  >
                    Ver vagas
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/motorista/reservar?ponto=${p.id}`}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#15803d]"
                  >
                    Reservar
                  </Link>
                </div>
              </div>
            );
          })}

          {points.length === 0 && (
            <div className="rounded-[6px] border border-black/10 bg-white p-8 text-center text-[14px] text-black/70">
              Carregando pontos…
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}