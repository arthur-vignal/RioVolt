"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { VoltrioMark } from "@/components/nav";

type Role = "motorista" | "donos";

const DEMO_USERS: Array<{ email: string; name: string; role: Role }> = [
  { email: "mariana@voltrio.app", name: "Mariana Souza", role: "motorista" },
  { email: "rafael@voltrio.app", name: "Rafael Mendes", role: "motorista" },
  { email: "carlos@voltrio.app", name: "Carlos Andrade", role: "motorista" },
  { email: "dono@voltrio.app", name: "Bruno Tavares", role: "donos" },
];

const DEMO_PASSWORD = "volta123";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function targetPathForRole(role: Role) {
    return role === "donos" ? "/donos/agendamentos" : "/motorista/pontos";
  }

  async function submitCredentials(targetEmail: string, targetPassword: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { role: Role };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.user) {
        setError(data.error || "Não foi possível entrar.");
        setSubmitting(false);
        return;
      }
      router.push(targetPathForRole(data.user.role));
      router.refresh();
    } catch (e) {
      setError("Erro de rede. Tente novamente.");
      setSubmitting(false);
    }
  }

  async function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) {
      setError("Informe email e senha.");
      return;
    }
    await submitCredentials(email, password);
  }

  /** Botão demo: pula a senha (modo dev). Faz login com senha 'volta123'. */
  async function handleDemo(role: Role) {
    const target =
      DEMO_USERS.find((u) => u.role === role) ?? DEMO_USERS[0];
    await submitCredentials(target.email, DEMO_PASSWORD);
  }

  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-black flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[6px] border border-black/10 bg-white p-6">
        <VoltrioMark />
        <p className="mt-3 text-[14px] text-black/60">
          Acesse o painel do motorista ou dos donos.
        </p>

        <form onSubmit={handleFormSubmit} className="mt-6 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@voltrio.app"
              className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
              Senha
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="volta123"
              className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20"
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
            >
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

        <div className="mt-6 grid gap-2 border-t border-black/5 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55">
            Acesso rápido (modo demo)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemo("motorista")}
              disabled={submitting}
              className="rounded-[6px] border border-black/10 bg-[#16a34a] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#148c3f] disabled:opacity-60"
            >
              Motorista
            </button>
            <button
              type="button"
              onClick={() => handleDemo("donos")}
              disabled={submitting}
              className="rounded-[6px] border border-black/10 bg-black px-3 py-2 text-[12px] font-semibold text-[#16a34a] hover:bg-black/90 disabled:opacity-60"
            >
              Dono
            </button>
          </div>
        </div>

        <details className="mt-5 rounded-[6px] border border-black/10 bg-[#f7f8f6] px-3 py-2 text-[12px] text-black/70">
          <summary className="cursor-pointer text-[12px] font-semibold text-black">
            Credenciais de teste (banca)
          </summary>
          <ul className="mt-2 grid gap-1.5 text-[12px]">
            {DEMO_USERS.map((u) => (
              <li
                key={u.email}
                className="flex items-center justify-between gap-2"
              >
                <code className="font-mono text-[11.5px] text-black/80">
                  {u.email}
                </code>
                <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/55">
                  {u.role}
                </span>
              </li>
            ))}
            <li className="mt-1 text-black/55">
              Senha (todos):{" "}
              <code className="font-mono text-black/80">{DEMO_PASSWORD}</code>
            </li>
          </ul>
        </details>

        <p className="mt-4 text-[12px] text-black/55">
          Sessão em cookie HttpOnly (7 dias). Validação contra SQLite.
        </p>
      </div>
    </main>
  );
}