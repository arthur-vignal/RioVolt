"use client";

import Link from "next/link";
import { Shell } from "@/app/(app)/layout-client";
import { ChargeHistory } from "@/components/charge-history";
import { History as HistoryIcon, ArrowLeft } from "lucide-react";

export default function HistoricoPage() {
  return (
    <Shell scope="motorista">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/70">
              Recargas
            </p>
            <h1 className="mt-1.5 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <HistoryIcon className="h-5 w-5 text-[#16a34a]" />
              Histórico de recargas
            </h1>
            <p className="mt-1 text-[13px] text-black/70">
              Cada carga concluída, com data, ponto, conector, kWh e valor cobrado.
            </p>
          </div>
          <Link
            href="/motorista/perfil"
            className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-black/10 bg-white px-4 text-[13px] font-medium text-black transition-colors hover:bg-black/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ver perfil
          </Link>
        </div>

        <ChargeHistory showStartAction />
      </div>
    </Shell>
  );
}
