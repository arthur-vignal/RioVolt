"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/app/(app)/layout-client";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Gauge,
  Zap,
  TrendingUp,
  BatteryCharging,
  Settings as SettingsIcon,
  XCircle,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { Point, Subscriber, DayPoint } from "@/lib/mock-data";

const brl = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] border border-black/10 bg-popover px-3 py-2 shadow-xl">
      <p className="text-[11px] font-medium text-black/70">Dia {label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            <span className="#000000/80">{p.name}</span>
            <span className="ml-auto tabular-nums">
              {p.name === "kWh" ? `${p.value} kWh` : brl(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

type Props = {
  data: DayPoint[];
  subscribers: Subscriber[];
  points: Point[];
  initialKwhPrice: number;
  totalConnectors: number;
};

export function TelemetriaClient({
  data,
  subscribers,
  points,
  initialKwhPrice,
  totalConnectors,
}: Props) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kwhPrice, setKwhPrice] = useState(String(initialKwhPrice.toFixed(2)));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "ok" | "err"; msg: string } | null
  >(null);
  const [, startTransition] = useTransition();

  // form de novo ponto
  const [np, setNp] = useState({
    name: "",
    neighborhood: "",
    lat: "-22.95",
    lon: "-43.20",
    kind: "DC" as "AC" | "DC",
    powerKw: "50",
    partner: "",
  });

  const totalKwh = data.reduce((a, d) => a + d.kwh, 0);
  const totalRev = data.reduce((a, d) => a + d.revenue, 0);
  const avgKwh = Math.round(totalKwh / data.length);
  const peak = data.reduce((a, b) => (b.kwh > a.kwh ? b : a), data[0]);
  const avgTicket = totalRev / totalKwh;

  const byPlan = (() => {
    const noturno = subscribers.filter((s) => s.planId === "noturno");
    const pro = subscribers.filter((s) => s.planId === "pro");
    const sum = (arr: Subscriber[]) => arr.reduce((a, s) => a + s.kwh30d, 0);
    return [
      { name: "Noturno (AC)", kwh: sum(noturno), users: noturno.length, color: "text-black" },
      { name: "Pro Driver (DC)", kwh: sum(pro), users: pro.length, color: "text-[#16a34a]" },
    ];
  })();

  const maxPlan = Math.max(...byPlan.map((b) => b.kwh));

  async function savePrice() {
    setBusy(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kwhPrice: Number(kwhPrice) }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok)
        throw new Error(data.error || "Falha ao salvar preço.");
      setFeedback({
        type: "ok",
        msg: `Preço atualizado para R$ ${Number(kwhPrice).toFixed(2)}/kWh.`,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setFeedback({
        type: "err",
        msg: e instanceof Error ? e.message : "Erro ao salvar.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function createPoint() {
    setBusy(true);
    setFeedback(null);
    try {
      const payload = {
        name: np.name.trim(),
        neighborhood: np.neighborhood.trim(),
        lat: Number(np.lat),
        lon: Number(np.lon),
        kind: np.kind,
        powerKw: Number(np.powerKw),
        partner: np.partner.trim(),
      };
      if (
        !payload.name ||
        !payload.neighborhood ||
        !payload.partner
      ) {
        throw new Error("Preencha nome, bairro e parceiro.");
      }
      const r = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok || !data.ok)
        throw new Error(data.error || "Falha ao criar ponto.");
      setFeedback({
        type: "ok",
        msg: `Ponto "${data.point.name}" criado em ${data.point.neighborhood}.`,
      });
      // limpa form e fecha
      setNp({
        name: "",
        neighborhood: "",
        lat: "-22.95",
        lon: "-43.20",
        kind: "DC",
        powerKw: "50",
        partner: "",
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setFeedback({
        type: "err",
        msg: e instanceof Error ? e.message : "Erro ao criar ponto.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell scope="donos">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/70">
              Sistema de donos
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
              Telemetria de consumo
            </h1>
            <p className="mt-1 text-[13px] text-black/70">
              kWh consumido versus valor pago no plano · últimos 30 dias
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-black/10 bg-white px-3 text-[12px] font-medium text-black transition-colors hover:border-black/20 hover:bg-[#f2f3f2]"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            Configurar
          </button>
        </div>

        {feedback && (
          <div
            className={cn(
              "mb-4 flex items-center gap-2 rounded-[6px] border px-3 py-2 text-[12px]",
              feedback.type === "ok"
                ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]"
                : "border-danger/30 bg-danger/10 text-danger",
            )}
          >
            {feedback.type === "ok" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {feedback.msg}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Energia consumida",
              value: `${totalKwh.toLocaleString("pt-BR")} kWh`,
              sub: `média de ${avgKwh} kWh/dia`,
              icon: BatteryCharging,
              tone: "text-[#16a34a]",
              ring: "ring-[#16a34a]/25 bg-[#16a34a]/10",
            },
            {
              label: "Receita bruta",
              value: brl(totalRev),
              sub: "kWh avulso + excedente",
              icon: TrendingUp,
              tone: "text-taken",
              ring: "ring-taken/25 bg-taken/10",
            },
            {
              label: "Ticket médio",
              value: brl(avgTicket),
              sub: "por kWh vendido",
              icon: Gauge,
              tone: "text-busy",
              ring: "ring-busy/25 bg-busy/10",
            },
            {
              label: "Pico de demanda",
              value: `${peak.kwh} kWh`,
              sub: `dia ${peak.day}`,
              icon: Zap,
              tone: "text-dc",
              ring: "ring-dc/25 bg-dc/10",
            },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="ev-card rounded-[6px] border border-black/10 p-4"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-black/70">
                    {k.label}
                  </p>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-[6px] ring-1",
                      k.ring,
                      k.tone,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {k.value}
                </p>
                <p className="mt-0.5 text-[11px] text-black/60">{k.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="ev-card rounded-[6px] border border-black/10 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-semibold">
                  Energia e receita por dia
                </h2>
                <p className="mt-0.5 text-[11px] text-black/60">
                  barras = kWh · linha = receita bruta · preço atual R${" "}
                  {initialKwhPrice.toFixed(2).replace(".", ",")}/kWh
                </p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2733" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "#8b98a8" }}
                    axisLine={{ stroke: "#1f2733" }}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: "#8b98a8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "#8b98a8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(v) => <span className="#000000/80">{v}</span>}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="kwh"
                    name="kWh"
                    fill="url(#kwhFill)"
                    stroke="#16a34a"
                    strokeWidth={1.2}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={22}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Receita (R$)"
                    stroke="#000"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="flex flex-col gap-5">
            <section className="ev-card rounded-[6px] border border-black/10 p-5">
              <h2 className="text-[13px] font-semibold">Consumo por plano</h2>
              <p className="mt-0.5 text-[11px] text-black/60">
                kWh nos últimos 30 dias por tipo de assinante
              </p>

              <div className="mt-4 space-y-4">
                {byPlan.map((b) => {
                  const pct = Math.round((b.kwh / maxPlan) * 100);
                  return (
                    <div key={b.name}>
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className="#000000/90">{b.name}</span>
                        <span className="tabular-nums text-black/70">
                          {b.kwh} kWh
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-[6px] #f2f3f2">
                        <div
                          className="h-full rounded-[6px] transition-all"
                          style={{
                            width: `${pct}%`,
                            background: b.color.includes("#16a34a")
                              ? "#16a34a"
                              : "#000",
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-black/55">
                        {b.users} assinantes · média{" "}
                        {Math.round(b.kwh / Math.max(1, b.users))} kWh
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ev-card rounded-[6px] border border-black/10 p-5">
              <h2 className="text-[13px] font-semibold">Ocupação da rede</h2>
              <div className="mt-4 space-y-3 text-[12px]">
                <div className="flex justify-between">
                  <span className="#000000/70">Conectores</span>
                  <span className="tabular-nums font-medium">
                    {totalConnectors}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="#000000/70">Pontos ativos</span>
                  <span className="tabular-nums font-medium">
                    {points.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="#000000/70">Carros por conector (RJ)</span>
                  <span className="tabular-nums font-medium">52,6</span>
                </div>
                <div className="flex justify-between">
                  <span className="#000000/70">kWh por conector/dia</span>
                  <span className="tabular-nums font-medium">
                    {Math.round(totalKwh / totalConnectors / data.length)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-black/10 pt-3">
                  <span className="#000000/70">Preço avulso configurado</span>
                  <span className="tabular-nums font-medium">
                    R${" "}
                    {initialKwhPrice.toFixed(2).replace(".", ",")}
                    /kWh
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-black/55">
                Gargalo declarado no trabalho: aumento de carga na subestação
                da Light para os pontos DC e ocupação indevida de vaga.
              </p>
            </section>
          </div>
        </div>

        {/* MODAL: Configurações operacionais */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Configurações operacionais</DialogTitle>
              <DialogDescription>
                Atualize o preço global por kWh ou cadastre um novo ponto de
                recarga. As mudanças valem imediatamente para a rede.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Preço kWh */}
              <div className="rounded-[6px] border border-black/10 p-4">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/70">
                  Preço por kWh
                </h3>
                <p className="mt-1 text-[11px] text-black/55">
                  Valor avulso base, em reais. Usado no cálculo de excedente dos
                  planos.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[12px] text-black/60">R$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={kwhPrice}
                    onChange={(e) => setKwhPrice(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-[12px] text-black/60">/ kWh</span>
                  <Button
                    type="button"
                    onClick={savePrice}
                    disabled={busy}
                    size="sm"
                    className="ml-auto"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </div>

              {/* Criar ponto */}
              <div className="rounded-[6px] border border-black/10 p-4">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/70">
                  Novo ponto de recarga
                </h3>
                <p className="mt-1 text-[11px] text-black/55">
                  Cadastra um ponto com 1 conector (status inicial livre).
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field
                    label="Nome"
                    placeholder="Posto Méier"
                    value={np.name}
                    onChange={(v) => setNp({ ...np, name: v })}
                  />
                  <Field
                    label="Bairro"
                    placeholder="Méier"
                    value={np.neighborhood}
                    onChange={(v) => setNp({ ...np, neighborhood: v })}
                  />
                  <Field
                    label="Latitude"
                    placeholder="-22.95"
                    value={np.lat}
                    onChange={(v) => setNp({ ...np, lat: v })}
                  />
                  <Field
                    label="Longitude"
                    placeholder="-43.20"
                    value={np.lon}
                    onChange={(v) => setNp({ ...np, lon: v })}
                  />
                  <Field
                    label="Parceiro"
                    placeholder="Posto Ipiranga"
                    value={np.partner}
                    onChange={(v) => setNp({ ...np, partner: v })}
                  />
                  <Field
                    label="Potência (kW)"
                    placeholder="50"
                    value={np.powerKw}
                    onChange={(v) => setNp({ ...np, powerKw: v })}
                  />
                  <div className="col-span-2">
                    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/60">
                      Tipo do conector
                    </label>
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-[6px] border border-black/10 p-0.5">
                      {(["AC", "DC"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setNp({ ...np, kind: k })}
                          className={cn(
                            "rounded-[6px] px-3 py-1 text-[12px] font-medium transition-colors",
                            np.kind === k
                              ? "bg-black text-white"
                              : "text-black",
                          )}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={createPoint}
                    disabled={busy}
                    size="sm"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Cadastrar ponto
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Fechar
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/60">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5"
      />
    </div>
  );
}
