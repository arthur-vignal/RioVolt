// Dados mock da Voltrio. Fonte única de verdade das telas.
// Números ancorados no trabalho "Estratégia Organizacional" (6 hubs no Rio).

export type ChargerKind = "AC" | "DC";
export type PointStatus = "free" | "reserved" | "in_use" | "offline";

export type Connector = {
  id: string;
  pointId: string;
  kind: ChargerKind;
  powerKw: number;
  status: PointStatus;
  /** conector travado por veículo a combustão ou em manutenção */
  note?: string;
};

export type Point = {
  id: string;
  name: string;
  neighborhood: string;
  focus: "moradores" | "motoristas";
  address: string;
  /** coords aproximadas no mapa estático (x/y em % do viewport do mapa) */
  x: number;
  y: number;
  openHours: string;
  partner: string;
  connectors: Connector[];
};

export const POINTS: Point[] = [
  {
    id: "hub-1",
    name: "Estacionamento Botafogo",
    neighborhood: "Botafogo",
    focus: "moradores",
    address: "Rua São Clemente, 210 — parking 24h",
    x: 34,
    y: 30,
    openHours: "24 horas",
    partner: "Estacionamento 24h",
    connectors: [
      { id: "h1c1", pointId: "hub-1", kind: "AC", powerKw: 22, status: "free" },
      { id: "h1c2", pointId: "hub-1", kind: "AC", powerKw: 22, status: "in_use" },
    ],
  },
  {
    id: "hub-2",
    name: "Shopping Copacabana — subsolo",
    neighborhood: "Copacabana",
    focus: "moradores",
    address: "Av. Atlântica, parking coberto",
    x: 30,
    y: 46,
    openHours: "24 horas",
    partner: "Shopping",
    connectors: [
      { id: "h2c1", pointId: "hub-2", kind: "AC", powerKw: 22, status: "reserved" },
      { id: "h2c2", pointId: "hub-2", kind: "AC", powerKw: 18, status: "free" },
    ],
  },
  {
    id: "hub-3",
    name: "Eixo das Américas — comercial",
    neighborhood: "Barra da Tijuca",
    focus: "motoristas",
    address: "Av. das Américas, 3.500 — subsolo",
    x: 12,
    y: 66,
    openHours: "06h às 23h",
    partner: "Edifício corporativo",
    connectors: [
      { id: "h3c1", pointId: "hub-3", kind: "DC", powerKw: 50, status: "free" },
      { id: "h3c2", pointId: "hub-3", kind: "AC", powerKw: 22, status: "free" },
    ],
  },
  {
    id: "hub-4",
    name: "Shopping Recreio",
    neighborhood: "Recreio",
    focus: "motoristas",
    address: "Av. das Américas, 3.400 — shopping",
    x: 10,
    y: 80,
    openHours: "10h às 22h",
    partner: "Shopping",
    connectors: [
      { id: "h4c1", pointId: "hub-4", kind: "DC", powerKw: 50, status: "in_use" },
      { id: "h4c2", pointId: "hub-4", kind: "DC", powerKw: 30, status: "offline", note: "Manutenção preventiva" },
    ],
  },
  {
    id: "hub-5",
    name: "Posto Centro — Av. Brasil",
    neighborhood: "Centro / Zona Portuária",
    focus: "motoristas",
    address: "Av. Brasil, posto de combustível",
    x: 62,
    y: 16,
    openHours: "24 horas",
    partner: "Posto de combustível",
    connectors: [
      { id: "h5c1", pointId: "hub-5", kind: "DC", powerKw: 60, status: "free" },
      { id: "h5c2", pointId: "hub-5", kind: "DC", powerKw: 60, status: "reserved" },
    ],
  },
  {
    id: "hub-6",
    name: "Estacionamento Maracanã",
    neighborhood: "Tijuca / Maracanã",
    focus: "moradores",
    address: "Av. Pres. Castelo Branco, parking 24h",
    x: 58,
    y: 8,
    openHours: "24 horas",
    partner: "Estacionamento 24h",
    connectors: [
      { id: "h6c1", pointId: "hub-6", kind: "AC", powerKw: 18, status: "free" },
      { id: "h6c2", pointId: "hub-6", kind: "AC", powerKw: 18, status: "free" },
    ],
  },
];

// ---------------------------------------------------------------- planos

export type PlanId = "noturno" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  audience: string;
  monthlyFee: number;
  includedKwh: number | null;
  /** valor por kWh dentro da franquia */
  includedKwhRate: number;
  /** valor por kWh no excedente */
  overageRate: number;
  /** o que o plano dá de direito */
  perks: string[];
  connectorKind: ChargerKind;
  window: string;
  accent: string;
};

export const PLANS: Plan[] = [
  {
    id: "noturno",
    name: "Noturno Garantido",
    tagline: "Vaga reservada perto de casa, toda noite",
    audience: "Moradores sem garagem",
    monthlyFee: 349,
    includedKwh: 200,
    includedKwhRate: 1.59,
    overageRate: 2.04,
    perks: [
      "Janela noturna das 21h às 07h",
      "Vaga reservada com agendamento fixo semanal",
      "200 kWh inclusos por mês",
      "Excedente a R$ 2,04/kWh",
    ],
    connectorKind: "AC",
    window: "21h — 07h",
    accent: "text-ac",
  },
  {
    id: "pro",
    name: "Pro Driver",
    tagline: "Recarga rápida sem fila, na janela da sua jornada",
    audience: "Motoristas de app (Uber / 99)",
    monthlyFee: 390,
    includedKwh: 300,
    includedKwhRate: 1.79,
    overageRate: 2.49,
    perks: [
      "Janelas diurnas agendadas de 30 a 60 min",
      "300 kWh inclusos por mês",
      "Excedente a R$ 2,49/kWh",
      "Sem taxa de no-show em reservas confirmadas",
    ],
    connectorKind: "DC",
    window: "06h — 20h",
    accent: "text-dc",
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;

// ---------------------------------------------------------------- assinante mock

export type Subscription = {
  planId: PlanId;
  since: string;
  kwhUsed: number;
  lastCharge: string;
  monthlyFee: number;
  nextRenewal: string;
  paymentOk: boolean;
};

export const ME: Subscription = {
  planId: "noturno",
  since: "março de 2026",
  kwhUsed: 168,
  lastCharge: "ontem, 23h40",
  monthlyFee: 349,
  nextRenewal: "05 de outubro",
  paymentOk: true,
};

// ---------------------------------------------------------------- agendamentos mock

export type Booking = {
  id: string;
  connectorId: string;
  pointId: string;
  user: string;
  planId: PlanId;
  /** hora de início em decimal, ex: 22.5 = 22h30 */
  start: number;
  /** duração em minutos */
  durationMin: number;
  status: "confirmed" | "pending" | "cancelled" | "no_show" | "done";
};

const h = (v: number) => {
  const hh = Math.floor(v);
  const mm = Math.round((v - hh) * 60);
  return `${String(hh).padStart(2, "0")}h${mm > 0 ? String(mm).padStart(2, "0") : ""}`;
};

export const fmtHour = h;

export const BOOKINGS: Booking[] = [
  { id: "b1", connectorId: "h1c1", pointId: "hub-1", user: "Mariana S.", planId: "noturno", start: 22, durationMin: 480, status: "confirmed" },
  { id: "b2", connectorId: "h1c2", pointId: "hub-1", user: "Rafael M.", planId: "noturno", start: 21, durationMin: 480, status: "confirmed" },
  { id: "b3", connectorId: "h2c1", pointId: "hub-2", user: "Juliana P.", planId: "noturno", start: 22, durationMin: 480, status: "confirmed" },
  { id: "b4", connectorId: "h3c1", pointId: "hub-3", user: "Carlos A. (99)", planId: "pro", start: 12, durationMin: 45, status: "confirmed" },
  { id: "b5", connectorId: "h3c2", pointId: "hub-3", user: "Bruno T. (Uber)", planId: "pro", start: 19, durationMin: 40, status: "confirmed" },
  { id: "b6", connectorId: "h4c1", pointId: "hub-4", user: "Diego R.", planId: "pro", start: 13, durationMin: 50, status: "confirmed" },
  { id: "b7", connectorId: "h5c1", pointId: "hub-5", user: "Ana Paula (99)", planId: "pro", start: 11, durationMin: 30, status: "confirmed" },
  { id: "b8", connectorId: "h5c2", pointId: "hub-5", user: "Lucas F.", planId: "pro", start: 14, durationMin: 60, status: "confirmed" },
  { id: "b9", connectorId: "h6c1", pointId: "hub-6", user: "Patrícia L.", planId: "noturno", start: 23, durationMin: 480, status: "confirmed" },
  { id: "b10", connectorId: "h6c2", pointId: "hub-6", user: "Thiago B.", planId: "noturno", start: 21.5, durationMin: 480, status: "confirmed" },
  { id: "b11", connectorId: "h2c2", pointId: "hub-2", user: "Fernanda C.", planId: "noturno", start: 20, durationMin: 480, status: "no_show" },
  { id: "b12", connectorId: "h4c2", pointId: "hub-4", user: "—", planId: "pro", start: 10, durationMin: 40, status: "cancelled" },
];

// ---------------------------------------------------------------- assinantes (painel)

export type Subscriber = {
  name: string;
  planId: PlanId;
  status: "ativo" | "inadimplente" | "cancelado";
  since: string;
  kwh30d: number;
  monthlyFee: number;
};

export const SUBSCRIBERS: Subscriber[] = [
  { name: "Mariana S.", planId: "noturno", status: "ativo", since: "mar/2026", kwh30d: 168, monthlyFee: 349 },
  { name: "Rafael M.", planId: "noturno", status: "ativo", since: "jan/2026", kwh30d: 214, monthlyFee: 349 },
  { name: "Juliana P.", planId: "noturno", status: "ativo", since: "abr/2026", kwh30d: 92, monthlyFee: 349 },
  { name: "Patrícia L.", planId: "noturno", status: "ativo", since: "fev/2026", kwh30d: 245, monthlyFee: 349 },
  { name: "Thiago B.", planId: "noturno", status: "ativo", since: "jun/2026", kwh30d: 61, monthlyFee: 349 },
  { name: "Fernanda C.", planId: "noturno", status: "inadimplente", since: "nov/2025", kwh30d: 187, monthlyFee: 349 },
  { name: "Carlos A.", planId: "pro", status: "ativo", since: "mar/2026", kwh30d: 388, monthlyFee: 390 },
  { name: "Bruno T.", planId: "pro", status: "ativo", since: "jan/2026", kwh30d: 502, monthlyFee: 390 },
  { name: "Diego R.", planId: "pro", status: "ativo", since: "maio/2026", kwh30d: 311, monthlyFee: 390 },
  { name: "Ana Paula", planId: "pro", status: "ativo", since: "abr/2026", kwh30d: 274, monthlyFee: 390 },
  { name: "Lucas F.", planId: "pro", status: "inadimplente", since: "dez/2025", kwh30d: 421, monthlyFee: 390 },
  { name: "Sofia M.", planId: "pro", status: "cancelado", since: "ago/2026", kwh30d: 0, monthlyFee: 390 },
];

// ---------------------------------------------------------------- telemetria (painel)

export type DayPoint = { day: string; kwh: number; revenue: number };

export const TELEMETRY_30D: DayPoint[] = [
  { day: "01", kwh: 412, revenue: 806 },
  { day: "02", kwh: 388, revenue: 761 },
  { day: "03", kwh: 455, revenue: 891 },
  { day: "04", kwh: 501, revenue: 982 },
  { day: "05", kwh: 478, revenue: 937 },
  { day: "06", kwh: 522, revenue: 1023 },
  { day: "07", kwh: 544, revenue: 1066 },
  { day: "08", kwh: 511, revenue: 1001 },
  { day: "09", kwh: 489, revenue: 958 },
  { day: "10", kwh: 533, revenue: 1045 },
  { day: "11", kwh: 566, revenue: 1109 },
  { day: "12", kwh: 548, revenue: 1074 },
  { day: "13", kwh: 512, revenue: 1003 },
  { day: "14", kwh: 487, revenue: 955 },
  { day: "15", kwh: 529, revenue: 1037 },
  { day: "16", kwh: 551, revenue: 1080 },
  { day: "17", kwh: 578, revenue: 1132 },
  { day: "18", kwh: 559, revenue: 1096 },
  { day: "19", kwh: 534, revenue: 1047 },
  { day: "20", kwh: 502, revenue: 983 },
  { day: "21", kwh: 481, revenue: 943 },
  { day: "22", kwh: 518, revenue: 1015 },
  { day: "23", kwh: 545, revenue: 1068 },
  { day: "24", kwh: 561, revenue: 1099 },
  { day: "25", kwh: 537, revenue: 1052 },
  { day: "26", kwh: 509, revenue: 997 },
  { day: "27", kwh: 486, revenue: 953 },
  { day: "28", kwh: 521, revenue: 1021 },
  { day: "29", kwh: 552, revenue: 1082 },
  { day: "30", kwh: 574, revenue: 1124 },
];

// ---------------------------------------------------------------- helpers

/** minutos desde a meia-noite */
export const toMinutes = (decimalHour: number) => Math.round(decimalHour * 60);

/** janela do plano, em minutos desde a meia-noite */
export const PLAN_WINDOW: Record<PlanId, [number, number]> = {
  noturno: [toMinutes(21), toMinutes(7 + 24)], // 21h — 07h (atravessa a meia-noite)
  pro: [toMinutes(6), toMinutes(20)],
};

export const PLAN_WINDOW_LABEL: Record<PlanId, string> = {
  noturno: "21h às 07h",
  pro: "06h às 20h",
};

/** buffer de segurança entre agendamentos, em minutos (§ doc) */
export const BUFFER_MIN = 10;

/** janela de tolerância de chegada, em minutos (§ doc) */
export const TOLERANCE_MIN = 15;

/** taxa de ociosidade, R$ por minuto excedente (§ doc) */
export const IDLE_FEE_PER_MIN = 0.5;

export function isNight(decimalHour: number) {
  return decimalHour >= 21 || decimalHour < 7;
}

export function freeCount(point: Point) {
  return point.connectors.filter((c) => c.status === "free").length;
}

export function totalConnectors() {
  return POINTS.reduce((acc, p) => acc + p.connectors.length, 0);
}

export function statusLabel(s: PointStatus) {
  switch (s) {
    case "free":
      return "Livre";
    case "reserved":
      return "Reservado";
    case "in_use":
      return "Em uso";
    case "offline":
      return "Fora de serviço";
  }
}
