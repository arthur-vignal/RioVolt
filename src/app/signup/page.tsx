"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { VoltrioMark } from "@/components/nav";
import { CAR_MODELS, carModelById } from "@/lib/mock-data";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"motorista" | "donos">("motorista");
  const [plate, setPlate] = useState("");
  const [carModelId, setCarModelId] = useState("");
  const [vehicleCustom, setVehicleCustom] = useState("");
  const [batteryKwh, setBatteryKwh] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => (carModelId ? carModelById(carModelId) : undefined),
    [carModelId],
  );

  function onModelChange(id: string) {
    setCarModelId(id);
    const m = id ? carModelById(id) : undefined;
    if (m) {
      setBatteryKwh(String(m.batteryKwh));
    } else if (id === "outro") {
      // mantem o que o user digitou
    } else {
      setBatteryKwh("");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name || !email || password.length < 6) {
      setError("Preencha nome, email e senha (mínimo 6 caracteres).");
      return;
    }
    // Motorista: pelo menos modelo OU bateria OU placa precisam ser preenchidos.
    if (role === "motorista" && !carModelId && !plate && !batteryKwh) {
      setError("Para motorista, preencha pelo menos a placa, o modelo do carro ou a bateria.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          plate: plate || undefined,
          carModelId: carModelId || undefined,
          vehicle: carModelId === "outro" ? vehicleCustom || undefined : undefined,
          batteryKwh: batteryKwh || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível criar a conta.");
        setSubmitting(false);
        return;
      }
      router.push("/login?signup=ok&email=" + encodeURIComponent(email));
    } catch {
      setError("Erro de rede. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-black flex items-start justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[6px] border border-black/10 bg-white p-6">
        <VoltrioMark />
        <p className="mt-3 text-[14px] text-black/60">
          Crie sua conta na Voltrio.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          {/* Tipo de conta */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("motorista")}
              className={
                "rounded-[6px] border px-3 py-2.5 text-[13px] font-semibold transition-colors " +
                (role === "motorista"
                  ? "border-[#16a34a]/40 bg-[#16a34a]/[0.06] text-[#16a34a]"
                  : "border-black/10 text-black/70 hover:border-black/20")
              }
            >
              Motorista
            </button>
            <button
              type="button"
              onClick={() => setRole("donos")}
              className={
                "rounded-[6px] border px-3 py-2.5 text-[13px] font-semibold transition-colors " +
                (role === "donos"
                  ? "border-[#16a34a]/40 bg-[#16a34a]/[0.06] text-[#16a34a]"
                  : "border-black/10 text-black/70 hover:border-black/20")
              }
            >
              Dono de hub
            </button>
          </div>

          <Field label="Nome" value={name} onChange={setName} placeholder="Seu nome" />

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="voce@voltrio.app"
          />

          <Field
            label="Senha (mínimo 6)"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••"
          />

          {/* Bloco do carro — só motorista */}
          {role === "motorista" ? (
            <div className="mt-2 rounded-[6px] border border-black/10 bg-[#f7f8f6]/40 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-black/55">
                Veículo
              </p>

              <div className="mt-3 grid gap-2.5">
                <label className="grid gap-1">
                  <span className="text-[12px] text-black/70">Modelo do carro</span>
                  <select
                    value={carModelId}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2 text-[14px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20"
                  >
                    <option value="">Selecione</option>
                    {CAR_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.id !== "outro" && "batteryKwh" in m
                          ? ` · ${m.batteryKwh} kWh`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {carModelId === "outro" && (
                  <Field
                    label="Modelo (digitar)"
                    value={vehicleCustom}
                    onChange={setVehicleCustom}
                    placeholder="Ex.: Neta V"
                  />
                )}

                <label className="grid gap-1">
                  <span className="text-[12px] text-black/70">
                    Capacidade da bateria (kWh)
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={0}
                    max={200}
                    value={batteryKwh}
                    onChange={(e) => setBatteryKwh(e.target.value)}
                    placeholder={
                      selectedModel && "batteryKwh" in selectedModel
                        ? String(selectedModel.batteryKwh)
                        : "Ex.: 60"
                    }
                    disabled={carModelId !== "" && carModelId !== "outro"}
                    className="w-full rounded-[6px] border border-black/10 bg-white px-3 py-2 text-[14px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 disabled:bg-black/5 disabled:text-black/60"
                  />
                </label>

                <Field
                  label="Placa (opcional)"
                  value={plate}
                  onChange={(v) => setPlate(v.toUpperCase())}
                  placeholder="RIO-2A45 ou ABC1D23"
                  mono
                />
              </div>
            </div>
          ) : null}

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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/55">
        {label}
      </span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          "w-full rounded-[6px] border border-black/10 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 " +
          (mono ? "font-mono uppercase" : "")
        }
      />
    </label>
  );
}