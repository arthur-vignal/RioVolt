"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/lib/providers";
import { VoltrioMark } from "@/components/nav";

export default function LoginPage() {
  const router = useRouter();
  const { loginAs, isSupabase } = useAppAuth();
  const [loading, setLoading] = useState<null | "motorista" | "donos">(null);

  async function handle(role: "motorista" | "donos") {
    setLoading(role);
    try {
      await loginAs(role);
      router.push(role === "donos" ? "/donos/agendamentos" : "/motorista/pontos");
    } catch {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-black flex items-center justify-center px-5">
      <div className="w-full max-w-md rounded-[6px] border border-black/10 bg-white p-6">
        <VoltrioMark />
        <p className="mt-3 text-[14px] text-black/60">
          Escolha o sistema que deseja acessar.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => handle("motorista")}
            disabled={!!loading}
            className="rounded-[6px] border border-black/10 bg-[#16a34a] px-4 py-3 text-left text-[14px] font-semibold text-white hover:bg-[#148c3f] disabled:opacity-60"
          >
            {loading === "motorista" ? "Abrindo motorista..." : "Entrar como motorista"}
          </button>
          <button
            type="button"
            onClick={() => handle("donos")}
            disabled={!!loading}
            className="rounded-[6px] border border-black/10 bg-black px-4 py-3 text-left text-[14px] font-semibold text-[#16a34a] hover:bg-black/90 disabled:opacity-60"
          >
            {loading === "donos" ? "Abrindo donos..." : "Entrar como dono"}
          </button>
        </div>

        <p className="mt-4 text-[12px] text-black/55">
          {isSupabase
            ? "Modo Supabase ativo. Na versão local, a sessão é simulada."
            : "Modo protótipo local. Sem dependência externa pra banca."}
        </p>
      </div>
    </main>
  );
}
