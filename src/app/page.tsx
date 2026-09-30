import Link from "next/link";
import { VoltrioMark } from "@/components/nav";
import { BatteryCharging, Building2 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-black">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <VoltrioMark />
      </header>

      <section className="mx-auto grid max-w-3xl gap-6 px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-black sm:text-5xl">
            Recarga previsível para quem mora e dirige no Rio.
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-black/60 sm:text-[16px]">
            Voltrio conecta estacionamentos e shoppings com motoristas que
            precisam reservar vagas de recarga.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="group flex flex-col items-center gap-3 rounded-[6px] border border-black/10 bg-white px-6 py-8 text-center hover:border-[#16a34a]/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#16a34a] text-white">
              <BatteryCharging className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-black">
                Entrar
              </p>
              <p className="mt-1 text-[13px] text-black/55">
                Já tem conta de motorista
              </p>
            </div>
          </Link>

          <Link
            href="/signup"
            className="group flex flex-col items-center gap-3 rounded-[6px] border border-black/10 bg-white px-6 py-8 text-center hover:border-[#16a34a]/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-black text-[#16a34a]">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-black">
                Criar conta
              </p>
              <p className="mt-1 text-[13px] text-black/55">
                Pra reservar e carregar
              </p>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}