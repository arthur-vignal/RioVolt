"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { PLANS, PLAN_BY_ID, type PlanId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  ArrowRight,
  Zap,
  Moon,
  Wallet,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

const brl = (n: number) => `R$ ${n.toFixed(2).replace(/\./, ',')}`;

type SubscriptionDTO = {
  id: number;
  planId: PlanId;
  kwhUsed: number;
  monthlyFee: number;
  since: string;
  nextRenewal: string;
  paymentOk: boolean;
  cuponsACUsed: number;
  cuponsACLimit: number;
  tarifaEstacionamentoAC: number;
  antecedenciaDias: number;
};

function PlanCard({
  id,
  current,
}: {
  id: PlanId;
  current: PlanId;
}) {
  const p = PLAN_BY_ID[id];
  const isCurrent = p.id === current;
  const Icon = p.connectorKind === "DC" ? Zap : Moon;

  return (
    <div
      className={cn(
        "ev-card flex flex-col rounded-[6px] border p-5",
        isCurrent ? "border-[#16a34a]/40" : "border-black/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[6px]",
              p.connectorKind === "DC" ? "bg-dc/12 text-dc" : "bg-ac/12 text-ac",
            )}
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold leading-tight">{p.name}</h3>
            <p className="text-[11px] text-black/70">{p.audience}</p>
          </div>
        </div>
        {isCurrent && (
          <span className="rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/10 px-2.5 py-1 text-[10px] font-medium text-[#16a34a]">
            Seu plano
          </span>
        )}
      </div>

      <p className="mt-3 text-[12px] text-black/80">{p.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">
          {brl(p.monthlyFee)}
        </span>
        <span className="text-[12px] text-black/60">/mês</span>
      </div>

      <div className="mt-3 space-y-1.5 rounded-[6px] border border-black/10 bg-[#f7f8f6]/40 p-3 text-[12px]">
        <div className="flex justify-between">
          <span className="text-black/70">Franquia</span>
          <span className="tabular-nums font-medium">{p.includedKwh} kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/70">Excedente</span>
          <span className="tabular-nums font-medium">{brl(p.overageRate)}/kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/70">Janela</span>
          <span className="font-medium">{p.window}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/70">Conector</span>
          <span className="font-medium">
            {p.connectorKind} {p.connectorKind === "DC" ? "30–60 kW" : "7–22 kW"}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {p.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-[12px] text-black/85">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
            {perk}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AssinaturaPage() {
  const [sub, setSub] = useState<SubscriptionDTO | null | "loading">("loading");
  const [kwh, setKwh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/subscription", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { ok: boolean; subscription: SubscriptionDTO | null }) => {
        if (cancelled) return;
        const s = data.subscription;
        setSub(s);
        setKwh(s?.kwhUsed ?? 0);
      })
      .catch(() => {
        if (!cancelled) setSub(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Estado: sem assinatura ativa
  if (sub === "loading") {
    return (
      <Shell scope="motorista">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-[13px] text-black/60">Carregando assinatura…</div>
        </div>
      </Shell>
    );
  }

  if (!sub) {
    return (
      <Shell scope="motorista">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="text-2xl font-semibold tracking-tight">Assinatura</h1>
          <p className="mt-1 text-[13px] text-black/70">
            Você ainda não tem um plano ativo.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PLANS.map((p) => (
              <PlanCard key={p.id} id={p.id} current="noturno" />
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  const current = PLAN_BY_ID[sub.planId];
  const over = Math.max(0, kwh - (current.includedKwh ?? 0));
  const pct = Math.min(
    100,
    Math.round((kwh / (current.includedKwh ?? 1)) * 100),
  );

  return (
    <Shell scope="motorista">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="text-2xl font-semibold tracking-tight">Assinatura</h1>
        <p className="mt-1 text-[13px] text-black/70">
          Plano {current.name} desde {sub.since} · próxima cobrança em {sub.nextRenewal}
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-4">
            <section className="ev-card rounded-[6px] border border-black/10 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-black/70">
                    Consumo do ciclo
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums">{kwh}</span>
                    <span className="text-[13px] text-black/70">
                      / {current.includedKwh} kWh
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-[6px] border px-2.5 py-1 text-[11px] font-medium",
                    over > 0
                      ? "border-busy/30 bg-busy/10 text-busy"
                      : "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]",
                  )}
                >
                  {over > 0 ? `${over} kWh excedente` : "Dentro da franquia"}
                </span>
              </div>

              <Progress value={pct} className="mt-4 h-2" />
              <p className="mt-2 text-[11px] text-black/60">
                {pct}% da franquia consumida · slider pra simular o fechamento do mês
              </p>

              <input
                type="range"
                min={0}
                max={Math.round((current.includedKwh ?? 200) * 1.8)}
                value={kwh}
                onChange={(e) => setKwh(Number(e.target.value))}
                className="mt-3 w-full accent-[#16a34a]"
                aria-label="Simular consumo em kWh"
              />

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-[12px]">
                <div>
                  <p className="text-black/70">Mensalidade</p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                    {brl(current.monthlyFee)}
                  </p>
                </div>
                <div>
                  <p className="text-black/70">Excedente</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[15px] font-semibold tabular-nums",
                      over > 0 ? "text-busy" : "text-black/40",
                    )}
                  >
                    {over > 0 ? brl(over * current.overageRate) : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="ev-card rounded-[6px] border border-black/10 p-5">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-taken" />
                            <h2 className="text-[13px] font-semibold">Forma de pagamento</h2>
                          </div>
                          <div className="mt-3 flex items-center justify-between rounded-[6px] border border-black/10 bg-[#f7f8f6]/40 p-3">
                            <div>
                              <p className="text-[13px] font-medium">Cartão de crédito •••• 4242</p>
                              <p className="text-[11px] text-black/70">
                                Cobrança automática recorrente
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-[6px] border px-2 py-1 text-[10px] font-medium",
                                sub.paymentOk
                                  ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]"
                                  : "border-busy/30 bg-busy/10 text-busy",
                              )}
                            >
                              {sub.paymentOk ? "Pago" : "Pendente"}
                            </span>
                          </div>
                        </section>

                        {sub.cuponsACLimit > 0 && (
                          <section className="ev-card rounded-[6px] border border-black/10 p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-ac" />
                                <h2 className="text-[13px] font-semibold">
                                  Cupons AC neste ciclo
                                </h2>
                              </div>
                              <span className="rounded-[6px] border border-black/10 bg-[#f7f8f6]/60 px-2 py-1 font-mono text-[11px] tabular-nums">
                                {sub.cuponsACUsed} / {sub.cuponsACLimit}
                              </span>
                            </div>
                            <p className="mt-2 text-[11px] text-black/70">
                              Cada reserva em vaga AC desconta 1 cupom de R$ {" "}
                              {sub.tarifaEstacionamentoAC.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} da
                              tarifa de estacionamento.
                            </p>
                            <div className="mt-3 flex items-center gap-1.5">
                              {Array.from({ length: sub.cuponsACLimit }).map((_, i) => {
                                const used = i < sub.cuponsACUsed;
                                return (
                                  <span
                                    key={i}
                                    className={cn(
                                      "h-2 flex-1 rounded-[6px]",
                                      used ? "bg-ac" : "bg-black/10",
                                    )}
                                  />
                                );
                              })}
                            </div>
                            <p className="mt-3 text-[11px] text-black/70">
                              Antecedência máxima de reserva: {' '}
                              <span className="text-black">
                                {sub.antecedenciaDias} dias
                              </span>
                              .
                            </p>
                          </section>
                        )}
                      </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((p) => (
                <PlanCard key={p.id} id={p.id} current={sub.planId} />
              ))}
            </div>

            <section className="rounded-[6px] border border-busy/25 bg-busy/[0.06] p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-busy" />
                <div className="text-[12px]">
                  <p className="font-medium text-black">
                                      Você está no {sub.planId === "noturno" ? "Noturno Garantido" : "Pro Plus 150"}
                                    </p>
                  <p className="mt-1 text-black/80">
                    Excedente a{" "}
                    <span className="text-black">{brl(current.overageRate)}/kWh</span>{" "}
                    acima da franquia de {current.includedKwh} kWh. Mudança de plano
                    pode ser solicitada pelo suporte.
                  </p>
                </div>
              </div>
            </section>

            <Link
              href="/motorista/reservar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/10 text-[13px] font-medium text-[#16a34a] transition-colors hover:bg-[#16a34a]/15"
            >
              <TrendingUp className="h-4 w-4" />
              Reservar vaga com este plano
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
