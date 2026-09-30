"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BatteryCharging,
  MapPin,
  Plug,
  Calendar,
  CircleDollarSign,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Charge } from "@/lib/db";

type BookingLite = {
  id: string;
  pointId: string;
  connectorId: string;
  planId: string;
};

type PointLite = {
  id: string;
  name: string;
  neighborhood: string;
};

type ConnectorLite = {
  id: string;
  kind: "AC" | "DC";
  powerKw: number;
};

type ApiListResponse = {
  bookings: BookingLite[];
  charges: Charge[];
};

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function withinMonths(iso: string, months: number) {
  const d = new Date(iso).getTime();
  const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  return d >= cutoff;
}

export type ChargeHistoryProps = {
  /** se true, mostra botão "Iniciar carga" nas reservas confirmadas */
  showStartAction?: boolean;
  /** cabeçalho opcional */
  title?: string;
};

export function ChargeHistory({ showStartAction, title }: ChargeHistoryProps) {
  const [data, setData] = useState<ApiListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"1m" | "3m" | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bookings", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiListResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "erro");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.charges.filter((c) => {
      if (filter === "all") return true;
      return withinMonths(c.startedAt, filter === "1m" ? 1 : 3);
    });
  }, [data, filter]);

  const totals = useMemo(() => {
    const kwh = filtered.reduce((acc, c) => acc + c.kwh, 0);
    const amount = filtered.reduce((acc, c) => acc + c.amount, 0);
    return { kwh: Math.round(kwh * 10) / 10, amount };
  }, [filtered]);

  // Constrói mapa rápido pointId → Point pra nome do ponto.
  const pointLookup = useMemo(() => {
    const m = new Map<string, PointLite>();
    if (data?.charges) {
      // busca preguiçosa — só guardamos ids aqui, mas no histórico a gente
      // também puxa nomes via connectorId quando o backend retornar.
      for (const c of data.charges) {
        m.set(c.pointId, { id: c.pointId, name: c.pointId, neighborhood: "" });
      }
    }
    return m;
  }, [data]);

  // Lista reservas confirmadas (ainda não iniciadas) pra mostrar bloco separado.
  const upcoming = useMemo(() => {
    if (!data || !showStartAction) return [];
    const usedBookingIds = new Set(
      data.charges.map((c) => c.bookingId),
    );
    return data.bookings
      .filter((b) => !usedBookingIds.has(b.id))
      .slice(0, 4);
  }, [data, showStartAction]);

  if (loading) {
    return (
      <div className="rounded-[6px] border border-black/10 bg-white p-6 text-[13px] text-black/60">
        Carregando histórico…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-[6px] border border-busy/30 bg-busy/10 p-6 text-[13px] text-busy">
        Erro ao carregar histórico: {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[6px] border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/70">
              {title ?? "Histórico de recargas"}
            </p>
            <h2 className="mt-1.5 text-[15px] font-semibold">
              {filtered.length} carga{filtered.length === 1 ? "" : "s"} no período
            </h2>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-[6px] border border-black/10 p-0.5">
            {(
              [
                ["1m", "Último mês"],
                ["3m", "Últimos 3 meses"],
                ["all", "Todos"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors",
                  filter === k
                    ? "bg-black text-white"
                    : "text-black/70 hover:bg-black/5",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="kWh consumidos" value={`${totals.kwh}`} icon={<BatteryCharging className="h-3.5 w-3.5" />} />
          <Stat label="Total gasto" value={brl(totals.amount)} icon={<CircleDollarSign className="h-3.5 w-3.5" />} />
          <Stat label="Cargas" value={`${filtered.length}`} icon={<Calendar className="h-3.5 w-3.5" />} />
        </div>
      </section>

      <section className="overflow-hidden rounded-[6px] border border-black/10 bg-white">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-[#f7f8f6] text-[11px] font-medium uppercase tracking-[0.16em] text-black/70">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Ponto</th>
              <th className="px-4 py-3 font-medium">Conector</th>
              <th className="px-4 py-3 text-right font-medium">kWh</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[13px] text-black/60">
                  Nenhuma carga no período selecionado.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const point = pointLookup.get(c.pointId);
                return (
                  <tr
                    key={c.id}
                    className="border-t border-black/10 transition-colors hover:bg-black/[0.02]"
                  >
                    <td className="px-4 py-3 align-middle font-mono text-[12px] text-black/80">
                      {fmtDate(c.startedAt)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-black/55" />
                        <span className="font-medium text-black">
                          {point?.name ?? c.pointId}
                        </span>
                      </div>
                      {point?.neighborhood ? (
                        <div className="mt-0.5 text-[11px] text-black/60">
                          {point.neighborhood}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <Plug className="h-3.5 w-3.5 text-black/55" />
                        <span className="font-mono text-[12px]">{c.connectorId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-middle tabular-nums">
                      {c.kwh.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right align-middle tabular-nums font-medium">
                      {brl(c.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {showStartAction && upcoming.length > 0 ? (
        <section className="rounded-[6px] border border-black/10 bg-white p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/70">
            Reservas confirmadas
          </p>
          <h2 className="mt-1.5 text-[15px] font-semibold">
            Prontas pra iniciar carga
          </h2>
          <ul className="mt-4 divide-y divide-black/10">
            {upcoming.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[12px] text-black/80">
                    {b.id} · conector {b.connectorId}
                  </p>
                  <p className="mt-0.5 text-[11px] text-black/60">
                    Plano {b.planId} · ponto {b.pointId}
                  </p>
                </div>
                <Link
                  href={`/motorista/iniciar/${b.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/10 px-3 text-[12px] font-semibold text-[#16a34a] transition-colors hover:bg-[#16a34a]/15"
                >
                  Iniciar carga
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-black/10 bg-[#f7f8f6] p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-black/60">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-[18px] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}
