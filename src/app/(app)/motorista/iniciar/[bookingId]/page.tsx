"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BatteryCharging,
  CheckCircle2,
  Clock,
  MapPin,
  Plug,
  Power,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QrCode } from "@/components/qr-code";
import { PLAN_BY_ID } from "@/lib/mock-data";

type Booking = {
  id: string;
  connectorId: string;
  pointId: string;
  user: string;
  planId: "noturno" | "pro";
  start: number;
  durationMin: number;
  status: "confirmed" | "in_progress" | "done" | "cancelled" | "pending" | "no_show";
};

type Point = {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  openHours: string;
};

type Charge = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  kwh: number;
  amount: number;
};

type ApiResponse = {
  booking: Booking;
  point: Point;
  charge: Charge | null;
};

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export default function IniciarCargaPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [phase, setPhase] = useState<"idle" | "charging" | "done">("idle");

  // métricas da carga em andamento (simuladas no client)
  const [liveKwh, setLiveKwh] = useState(0);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      setData(json);
      if (json.booking.status === "in_progress" && json.charge && !json.charge.endedAt) {
        setPhase("charging");
        const elapsed = Math.max(
          0,
          Math.round((Date.now() - Date.parse(json.charge.startedAt)) / 1000),
        );
        setLiveSeconds(elapsed);
        setLiveKwh(Math.round(((22 * 0.7 * elapsed) / 3600) * 10) / 10);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [bookingId]);

  // ticker simulando kWh em tempo real (~22kW × 70%)
  useEffect(() => {
    if (phase !== "charging") {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => {
      setLiveSeconds((s) => s + 1);
      setLiveKwh((k) => Math.round((k + 22 * 0.7 / 3600) * 100) / 100);
    }, 1000);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [phase]);

  async function startCharge() {
    if (!data) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { booking: Booking; charge: Charge };
      setData((d) => (d ? { ...d, booking: json.booking, charge: json.charge } : d));
      setPhase("charging");
      setLiveSeconds(0);
      setLiveKwh(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setStarting(false);
    }
  }

  async function endCharge() {
    setEnding(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/end`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kwh: Math.max(liveKwh, 0.1) }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { booking: Booking; charge: Charge };
      setData((d) => (d ? { ...d, booking: json.booking, charge: json.charge } : d));
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setEnding(false);
    }
  }

  const plan = useMemo(() => {
    if (!data) return null;
    return PLAN_BY_ID[data.booking.planId as keyof typeof PLAN_BY_ID] ?? PLAN_BY_ID.pro;
  }, [data]);

  const liveAmount = useMemo(() => {
    if (!plan) return 0;
    if (plan.includedKwhRate === null) return 0;
    return Math.round(liveKwh * plan.includedKwhRate * 100) / 100;
  }, [liveKwh, plan]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f8f6]">
        <p className="text-[13px] text-black/60">Carregando reserva…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f8f6] px-4">
        <div className="max-w-md rounded-[6px] border border-busy/30 bg-busy/10 p-5 text-center text-[13px] text-busy">
          {error ?? "Reserva não encontrada."}
          <div className="mt-4">
            <Link
              href="/motorista/historico"
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-black/10 bg-white px-3 text-[12px] font-medium text-black"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { booking, point, charge } = data;

  return (
    <div className="min-h-dvh bg-[#f7f8f6] text-black">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[820px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/motorista/historico"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-black/10 text-black/70 hover:bg-black/5 hover:text-black"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-[15px] font-semibold leading-tight tracking-tight">
                {point.name}
              </h1>
              <p className="text-[11px] text-black/60">{point.neighborhood}</p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-[6px] border px-2.5 py-1 text-[11px] font-semibold",
              booking.status === "in_progress"
                ? "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a]"
                : booking.status === "done"
                  ? "border-black/20 bg-black/5 text-black"
                  : "border-black/10 bg-white text-black/70",
            )}
          >
            {booking.status === "in_progress"
              ? "Em carga"
              : booking.status === "done"
                ? "Concluída"
                : "Reservada"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-4 py-6 sm:py-8">
        {/* Card info do ponto */}
        <section className="rounded-[6px] border border-black/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold tracking-tight">
                {point.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-black/70">
                <MapPin className="h-3 w-3" />
                {point.address}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-black/70">
                <Clock className="h-3 w-3" />
                {point.openHours}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[12px] text-black/60">{booking.id}</p>
              <p className="mt-1 flex items-center justify-end gap-1.5 text-[12px] text-black/80">
                <Plug className="h-3 w-3" />
                Conector {booking.connectorId}
              </p>
              {plan ? (
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-black/80">
                  <Zap className="h-3 w-3" /> {plan.name} · 150 kWh inclusos
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* Phase: idle — QR + botão ativar */}
        {phase === "idle" && booking.status !== "done" ? (
          <section className="mt-5 rounded-[6px] border border-black/10 bg-white p-6">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-[18px] font-semibold tracking-tight">
                Apresente este código no painel do conector
              </h2>
              <div className="mt-5">
                <QrCode value={booking.id} size={240} />
              </div>
              <p className="mt-4 max-w-md text-[12px] text-black/70">
                O conector só destrava com você a menos de 15 m do ponto.
                Depois de ativar, o kWh desconta da sua franquia e o
                excedente sai a {plan ? brl(plan.overageRate) : "—"}/kWh.
              </p>
              <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
                <button
                  type="button"
                  onClick={startCharge}
                  disabled={starting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-[#16a34a] text-[14px] font-semibold text-white transition-colors hover:bg-[#148c3f] disabled:opacity-60"
                >
                  <Power className="h-4 w-4" />
                  {starting ? "Ativando…" : "Ativar carga"}
                </button>
                <Link
                  href="/motorista/historico"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[6px] border border-black/10 bg-white text-[13px] font-medium text-black hover:bg-black/5"
                >
                  Voltar
                </Link>
              </div>
              {error ? (
                <p className="mt-3 text-[12px] text-busy">{error}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Phase: charging */}
        {phase === "charging" ? (
          <section className="mt-5 rounded-[6px] border border-black/10 bg-white p-6">
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/10 px-2.5 py-1 text-[11px] font-medium text-[#16a34a]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16a34a]" />
                </span>
                Carregando
              </span>

              <h2 className="mt-4 text-[44px] font-semibold leading-none tabular-nums tracking-tight">
                {liveKwh.toFixed(2)} <span className="text-[20px] text-black/55">kWh</span>
              </h2>
              <p className="mt-1 text-[12px] text-black/60">
                Potência estimada · 22 kW × 70% de utilização
              </p>

              <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2">
                <Metric label="Tempo" value={formatHMS(liveSeconds)} icon={<Timer className="h-3 w-3" />} />
                <Metric label="Início" value={charge ? fmtTime(charge.startedAt) : "—"} icon={<Clock className="h-3 w-3" />} />
                <Metric label="Valor" value={brl(liveAmount)} icon={<BatteryCharging className="h-3 w-3" />} />
              </div>

              <button
                type="button"
                onClick={endCharge}
                disabled={ending}
                className="mt-6 inline-flex h-11 w-full max-w-sm items-center justify-center gap-2 rounded-[6px] bg-black text-[14px] font-semibold text-white transition-colors hover:bg-black/85 disabled:opacity-60"
              >
                <Power className="h-4 w-4" />
                {ending ? "Encerrando…" : "Encerrar carga"}
              </button>

              {error ? (
                <p className="mt-3 text-[12px] text-busy">{error}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Phase: done */}
        {phase === "done" && charge ? (
          <section className="mt-5 rounded-[6px] border border-black/10 bg-white p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#16a34a]/15">
                <CheckCircle2 className="h-7 w-7 text-[#16a34a]" />
              </div>
              <h2 className="mt-4 text-[20px] font-semibold tracking-tight">
                Carga concluída
              </h2>
              <p className="mt-1 text-[12px] text-black/70">
                Desconecte o cabo e libere o conector para o próximo motorista.
              </p>

              <dl className="mt-5 grid w-full max-w-md grid-cols-2 gap-3 text-left">
                <Res label="Energia entregue" value={`${charge.kwh.toFixed(2)} kWh`} />
                <Res label="Valor cobrado" value={brl(charge.amount)} />
                <Res label="Início" value={fmtTime(charge.startedAt)} />
                <Res label="Fim" value={charge.endedAt ? fmtTime(charge.endedAt) : "—"} />
              </dl>

              <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
                <Link
                  href="/motorista/historico"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-[#16a34a] text-[14px] font-semibold text-white hover:bg-[#148c3f]"
                >
                  Ver histórico
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/motorista/pontos")}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[6px] border border-black/10 bg-white text-[13px] font-medium text-black hover:bg-black/5"
                >
                  Reservar outra vaga
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {/* Rodapé de segurança */}
        <section className="mt-5 flex items-start gap-2.5 rounded-[6px] border border-black/10 bg-white p-4 text-[12px] text-black/70">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
          <p>
            Carga em modo demo. Os valores de kWh e valor são simulados a partir
            de potência típica do conector e tempo decorrido — em produção
            viriam do medidor do hardware via OCPP.
          </p>
        </section>
      </main>
    </div>
  );
}

function formatHMS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-black/10 bg-[#f7f8f6] p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-black/70">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[14px] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Res({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-black/10 bg-[#f7f8f6] p-3">
      <dt className="text-[11px] font-medium text-black/70">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
