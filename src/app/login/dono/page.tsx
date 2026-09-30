"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { VoltrioMark } from "@/components/nav";

export default function LoginDonoPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) {
      setError("Informe email e senha.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "donos" }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { role: string };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.user) {
        setError(data.error || "Não foi possível entrar.");
        setSubmitting(false);
        return;
      }
      if (data.user.role !== "donos") {
        setError("Esta conta não é de dono.");
        setSubmitting(false);
        return;
      }
      router.push("/donos/agendamentos");
      router.refresh();
    } catch {
      setError("Erro de rede. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-black flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[6px] border border-black/10 bg-white p-6">
        <VoltrioMark />
        <p className="mt-3 text-[13px] text-black/55">
          Acesso restrito a donos de hub.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#16a34a]"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
              Senha
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#16a34a]"
            />
          </label>

          {error ? (
            <p className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-[6px] border border-black/10 bg-black px-4 py-3 text-[14px] font-semibold text-white hover:bg-black/90 disabled:opacity-60"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
