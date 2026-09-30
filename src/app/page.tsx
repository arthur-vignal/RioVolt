import Link from "next/link";
import { BatteryCharging, Building2, CalendarCheck, MapPinned, ShieldCheck, Gauge } from "lucide-react";
import { VoltrioMark } from "@/components/nav";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-black">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <VoltrioMark />
        <div className="hidden items-center gap-2 text-[12px] font-semibold text-black/55 sm:flex">
          <span>RJ</span>
          <span className="h-1 w-1 rounded-[6px] bg-black/10" />
          <span>AC noturno</span>
          <span className="h-1 w-1 rounded-[6px] bg-black/10" />
          <span>DC rápido</span>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:items-end lg:pt-16">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#16a34a]">
            Infraestrutura de recarga urbana
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-black sm:text-6xl">
            Recarga previsível para quem mora e dirige no Rio.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-7 text-black/60 sm:text-[18px]">
            Voltrio conecta estacionamentos e shoppings com motoristas que precisam reservar vagas de recarga.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/login"
              className="group rounded-[6px] border border-black/10 bg-white p-5 hover:border-[#16a34a]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16a34a]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#16a34a] text-white">
                <BatteryCharging className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-black">Entrar como motorista</h2>
              <p className="mt-2 text-[14px] leading-[20px] text-black/60">
                Ver pontos, checar disponibilidade e reservar vaga.
              </p>
              <span className="mt-4 inline-flex text-[13px] font-semibold text-[#16a34a] group-hover:underline">
                Abrir app do motorista
              </span>
            </Link>

            <Link
              href="/login"
              className="group rounded-[6px] border border-black/10 bg-white p-5 hover:border-[#16a34a]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16a34a]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-black text-[#16a34a]">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-black">Entrar como dono</h2>
              <p className="mt-2 text-[14px] leading-[20px] text-black/60">
                Controlar agenda, assinantes e telemetria dos pontos.
              </p>
              <span className="mt-4 inline-flex text-[13px] font-semibold text-[#16a34a] group-hover:underline">
                Abrir painel dos donos
              </span>
            </Link>
          </div>
        </div>

        <div className="rounded-[6px] border border-black/10 bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#16a34a]">
            Produto piloto
          </p>
          <div className="mt-5 grid gap-3">
            {[
              { icon: MapPinned, title: "6 hubs", text: "Botafogo, Leblon, Barra, Recreio, Centro e Maracanã." },
              { icon: CalendarCheck, title: "Reserva com buffer", text: "Margem de 10 minutos entre sessões." },
              { icon: ShieldCheck, title: "Check-in no local", text: "Ativação por QR Code e proximidade." },
              { icon: Gauge, title: "Telemetria", text: "Consumo, receita e ocupação por ponto." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3 rounded-[6px] border border-black/10 bg-[#f7f8f6] p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-semibold text-black">{item.title}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-black/60">{item.text}</p>
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
