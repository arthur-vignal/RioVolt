"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { PLANS, PLAN_BY_ID, ME, type PlanId } from "@/lib/mock-data";
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

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

function PlanCard({
  id,
  onPick,
  current,
}: {
  id: PlanId;
  onPick: (id: PlanId) => void;
  current: PlanId;
}) {
  const p = PLAN_BY_ID[id];
  const isCurrent = p.id === current;
  const Icon = p.connectorKind === "DC" ? Zap : Moon;

  return (
    <div
      className={cn(
        "ev-card flex flex-col rounded-xl border p-5",
        isCurrent ? "border-free/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              p.connectorKind === "DC" ? "bg-dc/12 text-dc" : "bg-ac/12 text-ac",
            )}
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold leading-tight">{p.name}</h3>
            <p className="text-[11px] text-muted-foreground/70">{p.audience}</p>
          </div>
        </div>
        {isCurrent && (
          <span className="rounded-full border border-free/30 bg-free/10 px-2.5 py-1 text-[10px] font-medium text-free">
            Seu plano
          </span>
        )}
      </div>

      <p className="mt-3 text-[12px] text-muted-foreground/80">{p.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">
          {brl(p.monthlyFee)}
        </span>
        <span className="text-[12px] text-muted-foreground/60">/mês</span>
      </div>

      <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-background/40 p-3 text-[12px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground/70">Franquia</span>
          <span className="tabular-nums font-medium">{p.includedKwh} kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground/70">Excedente</span>
          <span className="tabular-nums font-medium">{brl(p.overageRate)}/kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground/70">Janela</span>
          <span className="font-medium">{p.window}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground/70">Conector</span>
          <span className="font-medium">
            {p.connectorKind} {p.connectorKind === "DC" ? "30–60 kW" : "7–22 kW"}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {p.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-[12px] text-foreground/85">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-free" />
            {perk}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onPick(p.id)}
        disabled={isCurrent}
        className={cn(
          "mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md text-[13px] font-medium transition-colors",
          isCurrent
            ? "cursor-default border border-border text-muted-foreground/60"
            : "border border-free/30 bg-free/10 text-free hover:bg-free/15",
        )}
      >
        {isCurrent ? "Plano atual" : "Mudar para este plano"}
        {!isCurrent && <ArrowRight className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export default function AssinaturaPage() {
  const [plan, setPlan] = useState<PlanId>(ME.planId);
  const [kwh, setKwh] = useState(ME.kwhUsed);
  const current = PLAN_BY_ID[plan];
  const over = Math.max(0, kwh - (current.includedKwh ?? 0));
  const pct = Math.min(100, Math.round((kwh / (current.includedKwh ?? 1)) * 100));
  const saved = Math.round(over * (2.49 - current.overageRate) * 100) / 100;

  return (
    <Shell scope="motorista">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            Minha conta
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Assinatura</h1>
          <p className="mt-1 text-[13px] text-muted-foreground/70">
            Plano {current.name} desde {ME.since} · próxima cobrança em {ME.nextRenewal}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-4">
            <section className="ev-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                    Consumo do ciclo
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums">{kwh}</span>
                    <span className="text-[13px] text-muted-foreground/70">
                      / {current.includedKwh} kWh
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    over > 0
                      ? "border-busy/30 bg-busy/10 text-busy"
                      : "border-free/30 bg-free/10 text-free",
                  )}
                >
                  {over > 0 ? `${over} kWh excedente` : "Dentro da franquia"}
                </span>
              </div>

              <Progress value={pct} className="mt-4 h-2" />
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                {pct}% da franquia consumida · slider pra simular o fechamento do mês
              </p>

              <input
                type="range"
                min={0}
                max={Math.round((current.includedKwh ?? 200) * 1.8)}
                value={kwh}
                onChange={(e) => setKwh(Number(e.target.value))}
                className="mt-3 w-full accent-[#22c55e]"
                aria-label="Simular consumo em kWh"
              />

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[12px]">
                <div>
                  <p className="text-muted-foreground/70">Mensalidade</p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                    {brl(current.monthlyFee)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground/70">Excedente</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[15px] font-semibold tabular-nums",
                      over > 0 ? "text-busy" : "text-muted-foreground/40",
                    )}
                  >
                    {over > 0 ? brl(over * current.overageRate) : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="ev-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-taken" />
                <h2 className="text-[13px] font-semibold">Forma de pagamento</h2>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                <div>
                  <p className="text-[13px] font-medium">Cartão de crédito •••• 4242</p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Cobrança automática recorrente
                  </p>
                </div>
                <span className="rounded-md border border-free/30 bg-free/10 px-2 py-1 text-[10px] font-medium text-free">
                  Pago
                </span>
              </div>
              <p className="mt-2.5 text-[11px] text-muted-foreground/60">
                Gateway recorrente: Pix recorrente também disponível (R$ 0,99 a R$ 1,99 por
                transação, contra 2,8% a 3,9% no cartão).
              </p>
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((p) => (
                <PlanCard key={p.id} id={p.id} onPick={setPlan} current={plan} />
              ))}
            </div>

            <section className="rounded-xl border border-busy/25 bg-busy/[0.06] p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-busy" />
                <div className="text-[12px]">
                  <p className="font-medium text-foreground">
                    Você está no {plan === "noturno" ? "Noturno Garantido" : "Pro Driver"}
                  </p>
                  <p className="mt-1 text-muted-foreground/80">
                    {plan === "noturno" ? (
                      <>
                        O excedente do seu plano sai a{" "}
                        <span className="text-foreground">{brl(current.overageRate)}/kWh</span> —
                        {" "}
                        {saved > 0
                          ? `você economiza ${brl(saved)} em relação ao plano Pro Driver no mesmo consumo.`
                          : "42% mais barato que a tarifa avulsa de R$ 2,04/kWh."}
                      </>
                    ) : (
                      <>
                        No Pro Driver o excedente sai a{" "}
                        <span className="text-foreground">{brl(current.overageRate)}/kWh</span>, com
                        janela diurna e carregadores DC. Se carregar de madrugada perto de casa, o
                        Noturno Garantido sai mais barato.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </section>

            <Link
              href="/motorista/reservar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-free/30 bg-free/10 text-[13px] font-medium text-free transition-colors hover:bg-free/15"
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
