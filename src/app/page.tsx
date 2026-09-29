import Link from "next/link";
import { BatteryCharging, Building2, CalendarCheck, MapPinned, ShieldCheck, Gauge } from "lucide-react";
import { VoltrioMark } from "@/components/nav";

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <VoltrioMark />
        <div className="hidden items-center gap-2 text-[12px] font-semibold text-muted-foreground sm:flex">
          <span>RJ</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span>AC noturno</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span>DC rápido</span>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:items-end lg:pt-16">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Infraestrutura de recarga urbana
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-navy sm:text-6xl">
            Recarga previsível para quem mora e dirige no Rio.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-7 text-muted-foreground sm:text-[18px]">
            Voltrio conecta estacionamentos e shoppings com motoristas que precisam reservar
            vagas de recarga. Um sistema para o motorista, outro para quem opera os pontos.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/motorista/pontos"
              className="group rounded-xl border border-border bg-card p-5 shadow-sm hover:border-navy/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-volt">
                <BatteryCharging className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em]">Entrar como motorista</h2>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                Ver pontos, checar disponibilidade, reservar horário e acompanhar a assinatura.
              </p>
              <span className="mt-4 inline-flex text-[13px] font-semibold text-navy group-hover:underline">
                Abrir app do motorista
              </span>
            </Link>

            <Link
              href="/donos/agendamentos"
              className="group rounded-xl border border-border bg-card p-5 shadow-sm hover:border-navy/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-volt text-navy">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em]">Entrar como dono</h2>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                Controlar agenda, assinantes, inadimplência, consumo e receita dos conectores.
              </p>
              <span className="mt-4 inline-flex text-[13px] font-semibold text-navy group-hover:underline">
                Abrir painel dos donos
              </span>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Produto piloto
          </p>
          <div className="mt-5 grid gap-3">
            {[
              { icon: MapPinned, title: "6 hubs", text: "Botafogo, Copacabana, Barra, Recreio, Centro e Maracanã." },
              { icon: CalendarCheck, title: "Reserva com buffer", text: "Margem de 10 minutos entre sessões para evitar sobreposição." },
              { icon: ShieldCheck, title: "Check-in no local", text: "Ativação por QR Code e validação de proximidade." },
              { icon: Gauge, title: "Telemetria", text: "kWh, receita, plano e ocupação por conector." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3 rounded-lg border border-border bg-background p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
