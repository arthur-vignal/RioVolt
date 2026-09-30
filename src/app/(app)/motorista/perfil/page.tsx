"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/app/(app)/layout-client";
import { useAppAuth } from "@/lib/providers";
import { ChargeHistory } from "@/components/charge-history";
import {
  Car,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  UserCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  email: string;
  name: string;
  role: "motorista" | "donos";
  plate: string;
  vehicle: string;
};

const ROLE_LABEL: Record<Profile["role"], string> = {
  motorista: "Motorista",
  donos: "Operador",
};

export default function PerfilPage() {
  const router = useRouter();
  const { user, logout } = useAppAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const msg =
          res.status === 401
            ? "Faça login para ver seu perfil."
            : (j?.error ?? `HTTP ${res.status}`);
        throw new Error(msg);
      }
      const json = (await res.json()) as { profile: Profile };
      setProfile(json.profile);
      setPlate(json.profile.plate);
      setVehicle(json.profile.vehicle);
      setName(json.profile.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchProfile();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          plate: plate.trim().toUpperCase(),
          vehicle: vehicle.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { profile: Profile };
      setProfile(json.profile);
      setEditOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading) {
    return (
      <Shell scope="motorista">
        <div className="text-[13px] text-black/60">Carregando perfil...</div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell scope="motorista">
        <div className="rounded-[6px] border border-busy/30 bg-busy/10 p-5 text-[13px] text-busy">
          {error ?? "Não foi possível carregar o perfil."}
        </div>
      </Shell>
    );
  }

  return (
    <Shell scope="motorista">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black">Meu perfil</h1>
            <p className="mt-1 text-[13px] text-black/60">
              Dados pessoais e do veículo cadastrados na Voltrio.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-black/10 bg-white px-4 text-[13px] font-medium text-black transition-colors hover:bg-black/5"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sair
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section className="rounded-[6px] border border-black/10 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#16a34a]/10 text-[#16a34a]">
                <UserCircle2 className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-black/60">
                  {ROLE_LABEL[profile.role]}
                </p>
                <h2 className="truncate text-[18px] font-semibold tracking-tight text-black">
                  {profile.name}
                </h2>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-[13px]">
              <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={profile.email} />
              <Row
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Identificador"
                value={profile.id}
                mono
              />
              <Row
                icon={<Car className="h-3.5 w-3.5" />}
                label="Placa"
                value={profile.plate || "-"}
                mono
              />
              <Row
                icon={<Car className="h-3.5 w-3.5" />}
                label="Modelo"
                value={profile.vehicle || "-"}
              />
            </dl>

            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a]/10 text-[13px] font-semibold text-[#16a34a] transition-colors hover:bg-[#16a34a]/15"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Editar veículo
            </button>

            <p className="mt-3 text-[11px] text-black/55">
              Sessão ativa como <span className="font-mono">{user?.email}</span>
              {user?.id ? ` (${user.id})` : null}.
            </p>
          </section>

          <div className="flex flex-col gap-4">
            <ChargeHistory showStartAction title="Histórico recente" />
          </div>
        </div>
      </div>

      {editOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !saving && setEditOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[6px] border border-black/10 bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-black">Editar veículo</h3>
              <button
                type="button"
                onClick={() => !saving && setEditOpen(false)}
                className="rounded-[6px] p-1 text-black/55 hover:bg-black/5 hover:text-black"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <Field
                label="Nome"
                value={name}
                onChange={setName}
                placeholder="Seu nome"
              />
              <Field
                label="Placa"
                value={plate}
                onChange={(v) => setPlate(v.toUpperCase())}
                placeholder="RIO-2A45"
                mono
              />
              <Field
                label="Modelo do carro"
                value={vehicle}
                onChange={setVehicle}
                placeholder="BYD Dolphin"
              />
            </div>

            {error ? (
              <p className="mt-3 text-[12px] text-busy">{error}</p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-[6px] border border-black/10 bg-white px-4 text-[13px] font-medium text-black hover:bg-black/5 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className={cn(
                  "inline-flex h-9 items-center rounded-[6px] border border-[#16a34a]/30 bg-[#16a34a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#148c3f] disabled:opacity-60",
                )}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-2.5 last:border-b-0 last:pb-0">
      <dt className="flex items-center gap-1.5 text-[12px] text-black/60">
        <span className="text-black/40">{icon}</span>
        {label}
      </dt>
      <dd
        className={cn(
          "max-w-[60%] truncate text-right text-[13px] font-medium text-black",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-black/70">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "mt-1 h-9 w-full rounded-[6px] border border-black/10 bg-white px-3 text-[13px] text-black placeholder:text-black/40 focus:border-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30",
          mono && "font-mono uppercase",
        )}
      />
    </label>
  );
}
