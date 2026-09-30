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
                className="rounded-[6px] border border-black/10 bg-white p-4 transition-colors hover:border-black/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold">{p.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-black/70">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {p.address}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-black/55">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {p.openHours}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[20px] font-semibold tabular-nums leading-none">
                      {free}
                      <span className="text-[12px] text-black/55">
                        /{p.connectors.length}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/55">
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
              Carregando pontos…
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}