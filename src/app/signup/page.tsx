"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { VoltrioMark } from "@/components/nav";

type Role = "motorista" | "donos";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("motorista");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name || !email || password.length < 6) {
      setError("Preencha nome, email e senha (mínimo 6 caracteres).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { role: Role };
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível criar a conta.");
        setSubmitting(false);
        return;
      }
      // sucesso: vai pra login com email preenchido
      router.push("/login?signup=ok&email=" + encodeURIComponent(email));
    } catch {
      setError("Erro de rede. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-black flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[6px] border border-black/10 bg-white p-6">
        <VoltrioMark />
        <p className="mt-3 text-[14px] text-black/60">
          Crie sua conta na Voltrio.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
              Nome
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@voltrio.app"
              className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
              Senha (mínimo 6)
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20"
            />
          </label>

          <fieldset className="grid gap-1.5">
            <legend className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
              Tipo de conta
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`cursor-pointer rounded-[6px] border px-3 py-2 text-center text-[13px] font-semibold ${
                  role === "motorista"
                    ? "border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                    : "border-black/10 bg-white text-black/70"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="motorista"
                  checked={role === "motorista"}
                  onChange={() => setRole("motorista")}
                  className="sr-only"
                />
                Motorista
              </label>
              <label
                className={`cursor-pointer rounded-[6px] border px-3 py-2 text-center text-[13px] font-semibold ${
                  role === "donos"
                    ? "border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                    : "border-black/10 bg-white text-black/70"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="donos"
                  checked={role === "donos"}
                  onChange={() => setRole("donos")}
                  className="sr-only"
                />
                Dono de hub
              </label>
            </div>
          </fieldset>

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
            {submitting ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-black/60">
          Já tem conta?{" "}
          <a href="/login" className="font-semibold text-[#16a34a] hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}