"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Shell } from "@/app/(app)/layout-client";
import { TELEMETRY_30D, SUBSCRIBERS, totalConnectors } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Gauge, Zap, TrendingUp, BatteryCharging } from "lucide-react";

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
      <p className="text-[11px] font-medium #000000/70">Dia {label}</p>
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

export default function TelemetriaPage() {
  const data = useMemo(() => TELEMETRY_30D, []);

  const totalKwh = data.reduce((a, d) => a + d.kwh, 0);
  const totalRev = data.reduce((a, d) => a + d.revenue, 0);
  const avgKwh = Math.round(totalKwh / data.length);
  const peak = data.reduce((a, b) => (b.kwh > a.kwh ? b : a), data[0]);
  const avgTicket = totalRev / totalKwh;

  const byPlan = useMemo(() => {
    const noturno = SUBSCRIBERS.filter((s) => s.planId === "noturno");
    const pro = SUBSCRIBERS.filter((s) => s.planId === "pro");
    const sum = (arr: typeof SUBSCRIBERS) => arr.reduce((a, s) => a + s.kwh30d, 0);
    return [
      { name: "Noturno (AC)", kwh: sum(noturno), users: noturno.length, color: "#000000" },
      { name: "Pro Driver (DC)", kwh: sum(pro), users: pro.length, color: "#16a34a" },
    ];
  }, []);

  const maxPlan = Math.max(...byPlan.map((b) => b.kwh));

  return (
    <Shell scope="donos">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] #000000/70">
            Sistema de donos
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Telemetria de consumo</h1>
          <p className="mt-1 text-[13px] #000000/70">
            kWh consumido versus valor pago no plano · últimos 30 dias
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Energia consumida",
              value: `${totalKwh.toLocaleString("pt-BR")} kWh`,
              sub: `média de ${avgKwh} kWh/dia`,
              icon: BatteryCharging,
              tone: "#16a34a",
              ring: "#16a34a/25 #16a34a/10",
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
              <div key={k.label} className="ev-card rounded-[6px] border border-black/10 p-4">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] uppercase tracking-[0.16em] #000000/70">
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
                <p className="mt-2 text-2xl font-semibold tabular-nums">{k.value}</p>
                <p className="mt-0.5 text-[11px] #000000/60">{k.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="ev-card rounded-[6px] border border-black/10 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-semibold">Energia e receita por dia</h2>
                <p className="mt-0.5 text-[11px] #000000/60">
                  barras = kWh · linha = receita bruta
                </p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(v) => (
                      <span className="#000000/80">{v}</span>
                    )}
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
                    stroke="#000000"
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
              <p className="mt-0.5 text-[11px] #000000/60">
                kWh nos últimos 30 dias por tipo de assinante
              </p>

              <div className="mt-4 space-y-4">
                {byPlan.map((b) => {
                  const pct = Math.round((b.kwh / maxPlan) * 100);
                  return (
                    <div key={b.name}>
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className="#000000/90">{b.name}</span>
                        <span className="tabular-nums #000000/70">
                          {b.kwh} kWh
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-[6px] #f2f3f2">
                        <div
                          className="h-full rounded-[6px] transition-all"
                          style={{ width: `${pct}%`, background: b.color }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] #000000/55">
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
                  <span className="tabular-nums font-medium">{totalConnectors()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="#000000/70">Carros por conector (RJ)</span>
                  <span className="tabular-nums font-medium">52,6</span>
                </div>
                <div className="flex justify-between">
                  <span className="#000000/70">kWh por conector/dia</span>
                  <span className="tabular-nums font-medium">
                    {Math.round(totalKwh / totalConnectors() / data.length)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-black/10 pt-3">
                  <span className="#000000/70">Ticket médio do plano</span>
                  <span className="tabular-nums font-medium">
                    {brl(avgTicket / (currentPlanRate(avgKwh)))}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[11px] #000000/55">
                Gargalo declarado no trabalho: aumento de carga na subestação da Light para os
                pontos DC e ocupação indevida de vaga.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function currentPlanRate(avgKwh: number) {
  // fração da demanda coberta pelos planos (mock: 78% do consumo vem de assinantes)
  void avgKwh;
  return 0.78;
}
