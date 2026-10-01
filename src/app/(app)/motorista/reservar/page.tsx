"use client";

import { useMemo, useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import {
  POINTS,
  PLAN_BY_ID,
  NIGHT_DROP_HOURS,
  DAY_DROP_HOURS,
  fmtHour,
  PRO_MIN_ADVANCE_HOURS,
  type PlanId,
  type Point,
  type ChargerKind,
  type ReservationMode,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  ShieldCheck,
  Timer,
  AlertTriangle,
  Moon,
  Sun,
  BatteryCharging,
  Wallet,
  Sparkles,
} from "lucide-react";

type Step = "escolher" | "confirmar" | "feito";

type ProfileLite = {
  batteryKwh: number | null;
  carModelId: string | null;
  /** Plano atual do usuário (vem da assinatura). Default: 'free'. */
  plan: PlanId;
};

function fmtNight(h: number): string {
  const norm = ((h % 24) + 24) % 24;
  return fmtHour(norm);
}

function ReservarContent() {
  const params = useSearchParams();
  // Modo escolhido pelo user (noite/dia). Pro e Free aceitam ambos,
  // mas Pro tem regra de antecedencia — server valida.
  const [mode, setMode] = useState<ReservationMode>("noite");
  const [pointId, setPointId] = useState<string>(params.get("ponto") ?? "hub-3");
  const [dropHour, setDropHour] = useState<number>(mode === "noite" ? 21 : 12);
  const [pickupHour, setPickupHour] = useState<number>(
    mode === "noite" ? 7 + 24 : 12.75,
  );
  const [step, setStep] = useState<Step>("escolher");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.profile) {
          setProfile({
            batteryKwh: data.profile.batteryKwh ?? null,
            carModelId: data.profile.carModelId ?? null,
            // Sem subscription explicita ainda -> default "free".
            // O fetch de /api/me/subscription abaixo sobrescreve se houver.
            plan: "free",
          });
        }
      })
      .catch(() => undefined);

    // Pega plano do usuario via /api/me/subscription. A API agora
    // retorna sempre um DTO explicito (FREE_PLAN_DTO se nao tem
    // assinatura), entao usamos direto o que vem.
    fetch("/api/me/subscription", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const planId = data?.subscription?.planId;
        if (planId === "free" || planId === "pro") {
          setProfile((prev) => ({
            ...(prev ?? { batteryKwh: null, carModelId: null }),
            plan: planId,
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  // Filtra hubs pelos modos que aceitam.
  const filteredPoints = useMemo(
    () => POINTS.filter((p) => p.connectors.some((c) => c.modes.includes(mode))),
    [mode],
  );

  const point = useMemo<Point | undefined>(
    () => filteredPoints.find((p) => p.id === pointId) ?? filteredPoints[0],
    [filteredPoints, pointId],
  );

  // Lista de conectores compatíveis no ponto selecionado.
  const compatibleConnectors = useMemo(
    () =>
      (point?.connectors ?? []).filter(
        (c) => c.modes.includes(mode) && c.status === "free",
      ),
    [point, mode],
  );

  const hoursList = mode === "noite" ? NIGHT_DROP_HOURS : DAY_DROP_HOURS;

  /** Janela de pickup noturna: começa 1h após o drop e vai até 9h da manhã
   *  seguinte. Gera valores absolutos (ex: drop=21 → pickup = [22, 23, 24, 25, ..., 33]). */
  const pickupHours = useMemo(() => {
    if (mode !== "noite") return [] as number[];
    // Drop 18-23 → "hoje noite" ate 9h amanha. Drop 0-6 → ja passou meia-noite,
    // vai ate 9h (3-9h de carga max).
    const start = dropHour < 12 ? dropHour + 24 : dropHour;
    const end = 33; // 9h do dia seguinte (= 9 + 24)
    const out: number[] = [];
    // step 1h, do inicio+1 ate end. dropHour=18 → [19..33], 21 → [22..33].
    for (let h = start + 1; h <= end; h++) {
      out.push(h);
    }
    return out;
  }, [dropHour, mode]);

  // Reset drop/pickup quando muda modo.
  useEffect(() => {
    if (mode === "noite") {
      setDropHour(21);
      setPickupHour(7 + 24);
    } else {
      setDropHour(12);
      setPickupHour(12.75);
    }
  }, [mode]);

  // Ajusta pickup automaticamente: 1h apos o drop (default operacional,
  // NAO eh estimativa de tempo de carga — eh o limite maximo que o
  // equipamento comporta no modo escolhido).
  useEffect(() => {
    if (mode === "noite") {
      const base = dropHour < 12 ? dropHour + 24 : dropHour;
      setPickupHour(base + 1);
    } else {
      // Modo dia: +1h default. Backend valida que nao excede o maximo
      // do tipo (4h AC, 2h DC).
      setPickupHour(dropHour + 1);
    }
  }, [dropHour, mode]);

  // durationMin eh usado APENAS para a validacao de safety net no backend.
  // NAO eh exibido na UI — nao estimamos tempo de carga.
  const durationMin = Math.max(15, Math.round((pickupHour - dropHour) * 60));
  const batteryKwh = profile?.batteryKwh ?? null;
  const plan = profile?.plan ?? "free";
  const planInfo = PLAN_BY_ID[plan] ?? PLAN_BY_ID.free;
  // Free: R$30 taxa na retirada. Pro: R$0 (incluso).
  const reservationFee = plan === "pro" ? 0 : 30;
  // Estimativa de kWh que sera cobrado (plano Pro desconta da franquia).
  // Free paga por kWh consumido.
  const kwhToCharge = batteryKwh ?? null;

  async function submit() {
    if (!point) return;
    if (compatibleConnectors.length === 0) {
      setError("Nenhum conector livre compatível nesse hub.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectorId: compatibleConnectors[0].id,
          plan,
          mode,
          dropHour,
          pickupHour,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Erro ${res.status}`);
        setSubmitting(false);
        return;
      }
      setStep("feito");
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "feito") {
    return (
      <div className="mx-auto flex max-w-[620px] flex-col items-center py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[6px] bg-[#16a34a]/15 ring-1 border-[#16a34a]/30">
          <Check className="h-8 w-8 text-[#16a34a]" strokeWidth={2.5} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Vaga reservada</h1>
        <p className="mt-2 text-[13px] text-black/80">
          {point?.name} · {fmtNight(dropHour)} → {fmtNight(pickupHour)} ({mode === "noite" ? "noturno" : "diurno"})
        </p>
        <p className="mt-1 text-[12px] text-black/60">
          Plano {planInfo.name}
          {reservationFee > 0 ? ` · taxa de R$ ${reservationFee} cobrada na retirada` : ""}
        </p>

        <div className="ev-card mt-6 w-full rounded-[6px] border border-black/10 p-5 text-left">
          <h2 className="text-[15px] font-semibold">Como funciona</h2>
          <ol className="mt-3 space-y-3 text-[13px] text-black/90">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#f2f3f2] text-[11px] font-semibold">1</span>
              <p>
                {mode === "noite"
                  ? `Deixe o carro no conector ${compatibleConnectors[0]?.id} entre ${fmtNight(dropHour)} e ${fmtNight(dropHour + 1)}. A trava só destrava com você a menos de 15 m do ponto.`
                  : `Chegue no horário (${fmtNight(dropHour)}). A trava só destrava com você a menos de 15 m do ponto.`}
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#f2f3f2] text-[11px] font-semibold">2</span>
              <p>
                {mode === "noite"
                  ? `Volte às ${fmtNight(pickupHour)} pra buscar o carro carregado.`
                  : `A carga roda ate voce desconectar ou o carro atingir 100% — depende do seu carro.`}
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#f2f3f2] text-[11px] font-semibold">3</span>
              <p>
                {plan === "pro"
                  ? batteryKwh
                    ? `kWh cobrado do plano: ${batteryKwh} kWh (capacidade da bateria cadastrada).`
                    : "Bateria do carro não cadastrada — kWh será cobrado do plano após a carga."
                  : `kWh será cobrado pela tarifa do carregador (R$ 2,00/kWh AC ou R$ 2,70/kWh DC).`}
              </p>
            </li>
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/motorista/pontos"
            className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-black/10 bg-black/5 px-4 text-[13px] font-medium transition-colors hover:bg-black/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ver pontos
          </Link>
          <Link
            href="/motorista/assinatura"
            className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/10 px-4 text-[13px] font-medium text-[#16a34a] transition-colors hover:bg-[#16a34a]/15"
          >
            Ver minha assinatura
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[28px]">Reservar vaga</h1>
        <p className="mt-1.5 text-[13px] text-black/70 sm:text-[14px]">
          Plano atual: {planInfo.name}
          {plan === "pro"
            ? " · 150 kWh inclusos"
            : " · taxa R$ 30 na retirada"}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[6px] border border-black/10 bg-white p-1">
        <button
          type="button"
          onClick={() => setMode("noite")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[6px] px-3 py-3 text-[13px] font-semibold transition-colors sm:text-[14px]",
            mode === "noite"
              ? "bg-[#16a34a] text-white"
              : "text-black/70 hover:bg-black/5",
          )}
        >
          <Moon className="h-4 w-4" />
          Noturno (AC)
        </button>
        <button
          type="button"
          onClick={() => setMode("dia")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[6px] px-3 py-3 text-[13px] font-semibold transition-colors sm:text-[14px]",
            mode === "dia"
              ? "bg-[#16a34a] text-white"
              : "text-black/70 hover:bg-black/5",
          )}
        >
          <Sun className="h-4 w-4" />
          Diurno (AC ou DC)
        </button>
      </div>

      {mode === "noite" ? (
        <div className="mb-5 flex items-start gap-2 rounded-[6px] border border-black/10 bg-[#f7f8f6]/60 p-3 text-[12px] text-black/75">
          <Moon className="mt-0.5 h-4 w-4 shrink-0 text-ac" />
          <p>
            <strong>Reserva noturna em vaga AC (nossas garagens):</strong> você deixa
            o carro entre 18h e 6h, busca entre 6h e 9h. A bateria carrega inteira
            durante a janela.
          </p>
        </div>
      ) : (
        <div className="mb-5 flex items-start gap-2 rounded-[6px] border border-black/10 bg-[#f7f8f6]/60 p-3 text-[12px] text-black/75">
          <Sun className="mt-0.5 h-4 w-4 shrink-0 text-dc" />
          <p>
            <strong>Reserva diurna em AC ou DC:</strong> horário entre 6h e 18h.
            A carga termina quando o carro atinge 100% ou você desconecta.
          </p>
        </div>
      )}

      {plan === "pro" && (
        <div className="mb-5 flex items-start gap-2 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/[0.06] p-3 text-[12px] text-[#16a34a]/90">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Plano Pro:</strong> reserva grátis, mas precisa de pelo menos{" "}
            {PRO_MIN_ADVANCE_HOURS}h de antecedência.
          </p>
        </div>
      )}

      {plan === "free" && (
        <div className="mb-5 flex items-start gap-2 rounded-[6px] border border-busy/30 bg-busy/[0.06] p-3 text-[12px] text-busy">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Plano Grátis:</strong> você paga R$ 30 de taxa na retirada
            do carro (no totem), e o kWh pela tarifa padrão do carregador.
          </p>
        </div>
      )}

      <ol className="mb-6 flex items-center gap-2 text-[12px]">
        {[
          { k: "escolher", label: "Escolher ponto e horário" },
          { k: "confirmar", label: "Confirmar" },
          { k: "feito", label: "Reservado" },
        ].map((s, i) => {
          const order = ["escolher", "confirmar", "feito"];
          const cur = order.indexOf(step);
          const done = i <= cur;
          return (
            <li key={s.k} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-[6px] text-[11px] font-semibold",
                  done ? "bg-[#16a34a]/10 text-[#16a34a]" : "bg-[#f2f3f2] text-black/60",
                )}
              >
                {i + 1}
              </span>
              <span className={done ? "text-black" : "text-black/60"}>{s.label}</span>
              {i < 2 && <span className="mx-1 h-px w-8 bg-border" />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="ev-card rounded-[6px] border border-black/10 p-4 sm:p-5">
            <h2 className="text-[14px] font-semibold">1. Ponto de recarga</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {filteredPoints.map((p) => {
                const on = p.id === point?.id;
                const freeCount = p.connectors.filter(
                  (c) => c.modes.includes(mode) && c.status === "free",
                ).length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPointId(p.id)}
                    className={cn(
                      "rounded-[6px] border p-3 text-left transition-colors",
                      on ? "border-[#16a34a]/40 bg-[#16a34a]/[0.07]" : "border-black/10 hover:border-black/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-medium">{p.name}</span>
                      {on && <Check className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />}
                    </div>
                    <p className="mt-1 text-[11px] text-black/70">{p.neighborhood}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-[6px] border border-black/10 bg-white px-2 py-0.5 text-[10px] text-black/70">
                        {freeCount} livres
                      </span>
                      {p.connectors.length > 0 ? (
                        <span className="rounded-[6px] border border-black/10 bg-white px-2 py-0.5 text-[10px] text-black/70">
                          {p.connectors[0].kind} {p.connectors[0].powerKw}kW
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {mode === "noite" ? (
            <section className="ev-card rounded-[6px] border border-black/10 p-4 sm:p-5">
              <h2 className="text-[14px] font-semibold">2. Horário de deixar e buscar</h2>
              <div className="mt-3">
                <p className="text-[12px] font-medium text-black/70">Deixar o carro (entre 18h e 6h)</p>
                <div className="mt-2 grid grid-cols-7 gap-1.5 sm:grid-cols-13">
                  {hoursList.map((h) => (
                    <button
                      key={`d-${h}`}
                      type="button"
                      onClick={() => setDropHour(h)}
                      className={cn(
                        "rounded-[6px] border py-2 font-mono text-[12px] transition-colors",
                        dropHour === h
                          ? "border-[#16a34a]/50 bg-[#16a34a]/10 text-[#16a34a]"
                          : "border-black/10 text-black hover:border-black/20",
                      )}
                    >
                      {fmtHour(h)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[12px] font-medium text-black/70">
                  Buscar o carro (entre {fmtHour(dropHour < 12 ? dropHour + 24 : dropHour)} e 9h do dia seguinte)
                </p>
                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {pickupHours.map((h) => (
                    <button
                      key={`p-${h}`}
                      type="button"
                      onClick={() => setPickupHour(h)}
                      className={cn(
                        "rounded-[6px] border py-2 font-mono text-[12px] transition-colors",
                        pickupHour === h
                          ? "border-[#16a34a]/50 bg-[#16a34a]/10 text-[#16a34a]"
                          : "border-black/10 text-black hover:border-black/20",
                      )}
                    >
                      {fmtHour(((h % 24) + 24) % 24)}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="ev-card rounded-[6px] border border-black/10 p-4 sm:p-5">
              <h2 className="text-[14px] font-semibold">2. Horário de início (6h às 18h)</h2>
              <div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-13">
                {DAY_DROP_HOURS.map((h) => (
                  <button
                    key={`d-${h}`}
                    type="button"
                    onClick={() => {
                      setDropHour(h);
                      // Pickup default = drop + 1h (safety net do backend,
                      // nao exibido na UI).
                      setPickupHour(h + 1);
                    }}
                    className={cn(
                      "rounded-[6px] border py-2 font-mono text-[12px] transition-colors",
                      dropHour === h
                        ? "border-[#16a34a]/50 bg-[#16a34a]/10 text-[#16a34a]"
                        : "border-black/10 text-black hover:border-black/20",
                    )}
                  >
                    {fmtHour(h)}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-black/60">
                Carga maxima por tipo: AC ate 4h, DC ate 2h. A carga termina
                quando o carro atinge 100% ou voce retira antes — depende
                do seu carro.
              </p>
            </section>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-[6px] border border-busy/30 bg-busy/10 p-3 text-[12px] text-busy">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="ev-card rounded-[6px] border border-black/10 p-4 sm:p-5">
            <h2 className="text-[14px] font-semibold">Resumo</h2>

            <dl className="mt-4 space-y-3 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-black/70">
                  <MapPin className="h-3.5 w-3.5" /> Ponto
                </dt>
                <dd className="text-right font-medium">{point?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-black/70">
                  <Clock className="h-3.5 w-3.5" /> {mode === "noite" ? "Deixar" : "Início"}
                </dt>
                <dd className="text-right font-medium">{fmtNight(dropHour)}</dd>
              </div>
              {mode === "noite" && (
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-black/70">
                    <Clock className="h-3.5 w-3.5" /> Buscar
                  </dt>
                  <dd className="text-right font-medium">{fmtNight(pickupHour)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-black/70">
                  <Sparkles className="h-3.5 w-3.5" /> Plano
                </dt>
                <dd className="text-right font-medium">{planInfo.name}</dd>
              </div>
              {kwhToCharge !== null && (
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-black/70">
                    <BatteryCharging className="h-3.5 w-3.5" /> Bateria
                  </dt>
                  <dd className="text-right font-medium">{kwhToCharge} kWh</dd>
                </div>
              )}
            </dl>

            <div className="mt-4 space-y-2 border-t border-black/10 pt-4 text-[12px]">
              <p className="text-black/70">
                Taxa de reserva:{" "}
                <span className="font-semibold text-black">
                  {plan === "pro"
                    ? "Grátis"
                    : `R$ ${reservationFee.toFixed(2).replace(".", ",")} + kWh (cobrada na retirada)`}
                </span>
              </p>
              <p className="text-black/70">
                kWh:{" "}
                <span className="font-semibold text-black">
                  {plan === "pro"
                    ? kwhToCharge !== null
                      ? `${kwhToCharge} kWh da franquia`
                      : "Bateria não cadastrada"
                    : (() => {
                        const kind = compatibleConnectors[0]?.kind ?? "AC";
                        const rate = kind === "DC" ? 2.7 : 2.0;
                        const cost = kwhToCharge !== null ? kwhToCharge * rate : null;
                        return kwhToCharge !== null && cost !== null
                          ? `Tarifa padrão: R$ ${rate.toFixed(2).replace(".", ",")}/kWh (${kind}) · ${kwhToCharge} kWh ≈ R$ ${cost.toFixed(2).replace(".", ",")}`
                          : `Tarifa padrão: R$ 2,00/kWh AC · R$ 2,70/kWh DC`;
                      })()}
                </span>
              </p>
            </div>

            {step === "escolher" ? (
              <button
                type="button"
                onClick={() => setStep("confirmar")}
                disabled={!point || compatibleConnectors.length === 0}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/10 text-[14px] font-semibold text-[#16a34a] transition-colors hover:bg-[#16a34a]/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Revisar reserva
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#16a34a] text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Reservando…" : "Confirmar reserva"}
                <Check className="h-4 w-4" />
              </button>
            )}

            <div className="mt-3 space-y-2">
              <p className="flex items-start gap-1.5 text-[11px] text-black/70">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-busy" />
                Não chegar ou não buscar gera no-show (taxa R$ 20).
              </p>
              <p className="flex items-start gap-1.5 text-[11px] text-black/70">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#16a34a]" />
                Conector só destrava com GPS no local.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ReservarPage() {
  return (
    <Shell scope="motorista">
      <Suspense fallback={<div className="text-sm text-black">Carregando…</div>}>
        <ReservarContent />
      </Suspense>
    </Shell>
  );
}