"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { PLANS, PLAN_BY_ID, type PlanId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Wallet,
  AlertCircle,
  TrendingUp,
  BatteryCharging,
} from "lucide-react";

const brl = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type SubscriptionDTO = {
  id: number;
  planId: PlanId;
  kwhUsed: number;
  monthlyFee: number;
  since: string;
  nextRenewal: string;
  paymentOk: boolean;
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

  return (
    <div
      className={cn(
        "ev-card flex flex-col rounded-[6px] border p-4 sm:p-5",
        isCurrent ? "border-[#16a34a]/40 bg-[#16a34a]/[0.03]" : "border-black/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold leading-tight">{p.name}</h3>
          <p className="mt-0.5 text-[12px] text-black/70">{p.audience}</p>
        </div>
        {isCurrent && (
          <span className="shrink-0 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/10 px-2.5 py-1 text-[11px] font-semibold text-[#16a34a]">
            Seu plano
          </span>
        )}
      </div>

      <p className="mt-3 text-[13px] text-black/80">{p.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold tabular-nums tracking-tight sm:text-3xl">
          {brl(p.monthlyFee)}
        </span>
        <span className="text-[13px] text-black/60">/mês</span>
      </div>

      <div className="mt-3 space-y-2 rounded-[6px] border border-black/10 bg-[#f7f8f6]/40 p-3 text-[13px]">
        <div className="flex justify-between">
          <span className="text-black/70">Franquia</span>
          <span className="tabular-nums font-medium">{p.includedKwh} kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/70">Excedente</span>
          <span className="tabular-nums font-medium">{brl(p.overageRate)}/kWh</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {p.perks.map((perk, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-black/85">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#16a34a]" />
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
  const [batteryKwh, setBatteryKwh] = useState<number | null>(null);

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

    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setBatteryKwh(data?.profile?.batteryKwh ?? null);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (sub === "loading") {
    return (
      <Shell scope="motorista">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-[14px] text-black/60">Carregando assinatura…</div>
        </div>
      </Shell>
    );
  }

  if (!sub) {
    return (
      <Shell scope="motorista">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-[28px]">Assinatura</h1>
          <p className="mt-1.5 text-[14px] text-black/70">
            Você ainda não tem um plano ativo.
          </p>
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
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[28px]">Assinatura</h1>
        <p className="mt-1.5 text-[13px] text-black/70 sm:text-[14px]">
          Plano {current.name} desde {sub.since} · próxima cobrança em {sub.nextRenewal}
        </p>

        <div className="mt-5 grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Coluna esquerda */}
          <div className="flex flex-col gap-4">
            <section className="ev-card rounded-[6px] border border-black/10 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-black/70">
                    Consumo do ciclo
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[28px] font-semibold tabular-nums sm:text-3xl">
                      {kwh}
                    </span>
                    <span className="text-[13px] text-black/70 sm:text-[14px]">
                      / {current.includedKwh} kWh
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-[6px] border px-2.5 py-1 text-[11px] font-medium",
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
                {pct}% da franquia consumida
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

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-[13px]">
                <div>
                  <p className="text-black/70">Mensalidade</p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums sm:text-base">
                    {brl(current.monthlyFee)}
                  </p>
                </div>
                <div>
                  <p className="text-black/70">Excedente</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[15px] font-semibold tabular-nums sm:text-base",
                      over > 0 ? "text-busy" : "text-black/40",
                    )}
                  >
                    {over > 0 ? brl(over * current.overageRate) : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="ev-card rounded-[6px] border border-black/10 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <BatteryCharging className="h-4 w-4 text-ac" />
                <h2 className="text-[14px] font-semibold">Bateria do carro</h2>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-[6px] border border-black/10 bg-[#f7f8f6]/40 p-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium sm:text-[14px]">
                    {batteryKwh ? `${batteryKwh} kWh` : "Não cadastrada"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-black/70 sm:text-[12px]">
                    {batteryKwh
                      ? "Cada reserva desconta esse valor da franquia."
                      : "kWh só é cobrado depois que você cadastrar."}
                  </p>
                </div>
                <Link
                  href="/motorista/perfil"
                  className="shrink-0 rounded-[6px] border border-black/10 bg-white px-3 py-1.5 text-[11px] font-medium hover:bg-black/5"
                >
                  {batteryKwh ? "Editar" : "Cadastrar"}
                </Link>
              </div>
            </section>

            <section className="ev-card rounded-[6px] border border-black/10 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-taken" />
                <h2 className="text-[14px] font-semibold">Forma de pagamento</h2>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-[6px] border border-black/10 bg-[#f7f8f6]/40 p-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium sm:text-[14px]">Cartão de crédito •••• 4242</p>
                  <p className="mt-0.5 text-[11px] text-black/70 sm:text-[12px]">
                    Cobrança automática recorrente
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-[6px] border px-2 py-1 text-[11px] font-medium",
                    sub.paymentOk
                      ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]"
                      : "border-busy/30 bg-busy/10 text-busy",
                  )}
                >
                  {sub.paymentOk ? "Pago" : "Pendente"}
                </span>
              </div>
            </section>
          </div>

          {/* Coluna direita — plano + alerta + CTA */}
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((p) => (
                <PlanCard key={p.id} id={p.id} current={sub.planId} />
              ))}
            </div>

            <section className="rounded-[6px] border border-busy/25 bg-busy/[0.06] p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-busy" />
                <div className="text-[13px]">
                  <p className="font-semibold text-black">
                    Você está no {current.name}
                  </p>
                  <p className="mt-1 text-black/80">
                    Excedente a{" "}
                    <span className="font-semibold text-black">{brl(current.overageRate)}/kWh</span>{" "}
                    acima da franquia de {current.includedKwh} kWh. Cobrança
                    automática no cartão cadastrado.
                  </p>
                </div>
              </div>
            </section>

            <Link
              href="/motorista/reservar"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a] text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#15803d]"
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