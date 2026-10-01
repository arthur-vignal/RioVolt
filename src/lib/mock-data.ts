// Dados mock da Voltrio. Fonte única de verdade das telas.
// Números ancorados no trabalho "Estratégia Organizacional" (6 hubs no Rio).

export type ChargerKind = "AC" | "DC";
export type PointStatus = "free" | "reserved" | "in_use" | "offline";
export type ReservationMode = "noite" | "dia";
export type PlanId = "free" | "pro";

/** Dados de uma carga em andamento — alimenta a estimativa de tempo restante. */
export type CurrentCharge = {
  /** epoch ms em que a carga começou. */
  startedAt: number;
  /** kWh-alvo planejado pro carro (capacidade da bateria que foi carregada). */
  kwhTarget: number;
  /** kWh já entregues estimado em T_atual. */
  kwhDelivered: number;
};

export type Connector = {
  id: string;
  pointId: string;
  kind: ChargerKind;
  /** modos aceitos por esse conector — noturno (deixar e buscar) ou diurno (recarga rapida). */
  modes: ReservationMode[];
  powerKw: number;
  status: PointStatus;
  /** dados da carga em andamento (se status='in_use'). null/free se nao. */
  currentCharge: CurrentCharge | null;
  /** conector travado por veículo a combustão ou em manutenção */
  note?: string;
};

export type Point = {
  id: string;
  name: string;
  neighborhood: string;
  focus: "moradores" | "motoristas";
  address: string;
  lat: number;
  lon: number;
  openHours: string;
  partner: string;
  connectors: Connector[];
};

export const POINTS: Point[] = [
  // Hubs DC — só diurno (recarga rápida pra motoristas de app).
  {
    id: "hub-1",
    name: "Hub DC Shopping Rio Sul",
    neighborhood: "Botafogo",
    focus: "motoristas",
    address: "Rua Lauro Müller, 116 - Botafogo, Rio de Janeiro - RJ, 22290-160",
    lat: -22.95134,
    lon: -43.18475,
    openHours: "06h às 22h",
    partner: "Shopping Rio Sul",
    connectors: [
      { id: "h1c1", pointId: "h1", kind: "DC", modes: ["dia"], powerKw: 120, status: "free", currentCharge: null },
      { id: "h1c2", pointId: "h1", kind: "DC", modes: ["dia"], powerKw: 120, status: "free", currentCharge: null },
    ],
  },
  {
    id: "hub-2",
    name: "Hub DC Shopping Leblon",
    neighborhood: "Leblon",
    focus: "motoristas",
    address: "Av. Afrânio de Melo Franco, 290 - Leblon, Rio de Janeiro - RJ, 22430-060",
    lat: -22.98533,
    lon: -43.22495,
    openHours: "06h às 22h",
    partner: "Shopping Leblon",
    connectors: [
      { id: "h2c1", pointId: "h2", kind: "DC", modes: ["dia"], powerKw: 120, status: "free", currentCharge: null },
      { id: "h2c2", pointId: "h2", kind: "DC", modes: ["dia"], powerKw: 120, status: "free", currentCharge: null },
    ],
  },
  // Hubs AC — noturno (moradores deixando carro) E diurno (recarga curta).
  {
    id: "hub-3",
    name: "Estação de Carregamento Ipanema Visconde I",
    neighborhood: "Ipanema",
    focus: "moradores",
    address: "Rua Visconde de Pirajá, 152 - Ipanema, Rio de Janeiro - RJ",
    lat: -22.98300,
    lon: -43.20100,
    openHours: "24 horas",
    partner: "gEpark",
    connectors: [
      { id: "h3c1", pointId: "h3", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h3c2", pointId: "h3", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h3c3", pointId: "h3", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h3c4", pointId: "h3", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h3c5", pointId: "h3", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h3c6", pointId: "h3", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h3c7", pointId: "h3", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h3c8", pointId: "h3", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
    ],
  },
  {
    id: "hub-4",
    name: "Estação de Carregamento Ipanema Visconde II",
    neighborhood: "Ipanema",
    focus: "moradores",
    address: "Rua Visconde de Pirajá, 595 - Ipanema, Rio de Janeiro - RJ",
    lat: -22.98550,
    lon: -43.19700,
    openHours: "24 horas",
    partner: "Estapar",
    connectors: [
      { id: "h4c1", pointId: "h4", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h4c2", pointId: "h4", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h4c3", pointId: "h4", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h4c4", pointId: "h4", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h4c5", pointId: "h4", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h4c6", pointId: "h4", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h4c7", pointId: "h4", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h4c8", pointId: "h4", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
    ],
  },
  {
    id: "hub-5",
    name: "Estação de Carregamento Copacabana",
    neighborhood: "Copacabana",
    focus: "moradores",
    address: "Rua Barata Ribeiro, 600 - Copacabana, Rio de Janeiro - RJ",
    lat: -22.97120,
    lon: -43.18410,
    openHours: "24 horas",
    partner: "gEpark",
    connectors: [
      { id: "h5c1", pointId: "h5", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h5c2", pointId: "h5", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "offline", currentCharge: null },
      { id: "h5c3", pointId: "h5", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h5c4", pointId: "h5", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h5c5", pointId: "h5", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h5c6", pointId: "h5", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h5c7", pointId: "h5", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h5c8", pointId: "h5", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
    ],
  },
  {
    id: "hub-6",
    name: "Estação de Carregamento Leblon",
    neighborhood: "Leblon",
    focus: "moradores",
    address: "R. Prof. Antônio Maria Teixeira, 99 - Leblon, Rio de Janeiro - RJ, 22430-050",
    lat: -22.98400,
    lon: -43.22050,
    openHours: "24 horas",
    partner: "Shopping Leblon",
    connectors: [
      { id: "h6c1", pointId: "h6", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h6c2", pointId: "h6", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h6c3", pointId: "h6", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h6c4", pointId: "h6", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h6c5", pointId: "h6", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h6c6", pointId: "h6", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h6c7", pointId: "h6", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
      { id: "h6c8", pointId: "h6", kind: "AC", modes: ["noite", "dia"], powerKw: 7.7, status: "free", currentCharge: null },
    ],
  },
];


// ---------------------------------------------------------------- veículos pré-cadastrados

export type CarModel = {
  id: string;
  name: string;
  batteryKwh: number;
};

/** Lista exibida no cadastro. "Outro" força digitação manual. */
export const CAR_MODELS: (CarModel | { id: "outro"; name: string })[] = [
  { id: "byd_dolphin", name: "BYD Dolphin", batteryKwh: 44.9 },
  { id: "byd_dolphin_plus", name: "BYD Dolphin Plus", batteryKwh: 60.5 },
  { id: "byd_seal", name: "BYD Seal", batteryKwh: 82.5 },
  { id: "volvo_ex30", name: "Volvo EX30", batteryKwh: 64 },
  { id: "renault_kwid_etech", name: "Renault Kwid E-Tech", batteryKwh: 26.8 },
  { id: "renault_megane", name: "Renault Megane E-Tech", batteryKwh: 60 },
  { id: "gwm_ora", name: "GWM Ora 03", batteryKwh: 48 },
  { id: "tesla_model_3", name: "Tesla Model 3", batteryKwh: 60 },
  { id: "chevrolet_bolt", name: "Chevrolet Bolt EUV", batteryKwh: 65 },
  { id: "nissan_leaf", name: "Nissan Leaf", batteryKwh: 40 },
  { id: "outro", name: "Outro (digitar)" },
];

/** Localiza o modelo por id. Retorna undefined se não achar. */
export function carModelById(id: string): CarModel | undefined {
  return CAR_MODELS.find((c) => c.id === id) as CarModel | undefined;
}


// ---------------------------------------------------------------- planos

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  audience: string;
  /** Mensalidade. Plano free = R$0. */
  monthlyFee: number;
  /** kWh inclusos na franquia (Pro). Free = null (sem franquia). */
  includedKwh: number | null;
  /** valor por kWh dentro da franquia (Pro). Free = null. */
  includedKwhRate: number | null;
  /** valor por kWh no excedente (Pro) ou valor base do kWh (Free, sem excedente). */
  overageRate: number;
  /** taxa fixa cobrada na retirada (free). Pro = 0. */
  reservationFee: number;
  /** antecedência mínima em horas pra reservar (Pro). Free = null (sem reserva). */
  antecedenciaMinHoras: number | null;
  perks: string[];
  accent: string;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Grátis",
    tagline: "Sem assinatura, paga por carga",
    audience: "Motorista eventual, primeira experiência",
    monthlyFee: 0,
    includedKwh: null,
    includedKwhRate: null,
    overageRate: 0,
    reservationFee: 30,
    antecedenciaMinHoras: null,
    perks: [
      "Vê disponibilidade de todos os carregadores",
      "Vê tempo restante estimado da carga em andamento",
      "Sem reserva: chega no hub e conecta",
      "Tarifa padrão: R$ 2,00/kWh AC · R$ 2,70/kWh DC",
      "Taxa de R$ 30 cobrada no totem na retirada",
    ],
    accent: "text-black/70",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Assinatura mensal pra rodar 150 kWh sem pagar por carga",
    audience: "Moradores sem garagem e motoristas de app",
    monthlyFee: 374.99,
    includedKwh: 150,
    includedKwhRate: 0,
    overageRate: 0,
    reservationFee: 0,
    antecedenciaMinHoras: 2,
    perks: [
      "150 kWh inclusos por mês (AC ou DC)",
      "Reserva grátis com pelo menos 2h de antecedência",
      "Noturna (deixar 18h-6h, buscar até 9h) ou diurna (6h-18h)",
      "Sem taxa de retirada",
    ],
    accent: "text-ac",
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;

/**
 * DTO default retornado pela API /me/subscription quando o usuario
 * nao tem nenhuma assinatura ativa (assinatura deletada, expirada,
 * ou nunca comprou). Eh um "free" virtual — UI mostra como Free.
 */
export const FREE_PLAN_DTO = {
  planId: "free" as PlanId,
  kwhUsed: 0,
  monthlyFee: 0,
  since: null,
  nextRenewal: null,
  paymentOk: true,
  isFree: true,
};

// ---------------------------------------------------------------- regra de preço no plano Free

/** Tarifa de kWh por tipo de conector — cobrada dos usuários free. */
export const FREE_KWH_RATE: Record<ChargerKind, number> = {
  AC: 2.0,
  DC: 2.7,
};


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
  planId: "pro",
  since: "março de 2026",
  kwhUsed: 168,
  lastCharge: "ontem, 23h40",
  monthlyFee: 374.99,
  nextRenewal: "05 de outubro",
  paymentOk: true,
};


// ---------------------------------------------------------------- reservas

export type Booking = {
  id: string;
  connectorId: string;
  pointId: string;
  user: string;
  planId: PlanId;
  /** modo da reserva: noturna (drop + pickup) ou diurna (início + duração). */
  mode: ReservationMode;
  /** hora decimal em que o motorista deixa o carro pra carregar. */
  dropHour: number;
  /** hora decimal em que o motorista busca o carro. Pra noturna > drop; pra diurna = drop + duration/60. */
  pickupHour: number;
  /** duração em minutos (derivada de pickupHour - dropHour). */
  durationMin: number;
  /** taxa fixa cobrada na máquina (free = 30, pro = 0). */
  reservationFee: number;
  status: "confirmed" | "pending" | "cancelled" | "no_show" | "done" | "in_progress";
};

const h = (v: number) => {
  const hh = Math.floor(v);
  const mm = Math.round((v - hh) * 60);
  return `${String(hh).padStart(2, "0")}h${mm > 0 ? String(mm).padStart(2, "0") : ""}`;
};

export const fmtHour = h;

export const BOOKINGS: Booking[] = [
  // noturnos
  { id: "b1", connectorId: "h3c1", pointId: "hub-3", user: "Mariana S.", planId: "pro", mode: "noite", dropHour: 21, pickupHour: 7 + 24, durationMin: 10 * 60, reservationFee: 0, status: "confirmed" },
  { id: "b2", connectorId: "h3c2", pointId: "hub-3", user: "Rafael M.", planId: "pro", mode: "noite", dropHour: 21, pickupHour: 7 + 24, durationMin: 10 * 60, reservationFee: 0, status: "confirmed" },
  { id: "b3", connectorId: "h3c3", pointId: "hub-3", user: "Juliana P.", planId: "pro", mode: "noite", dropHour: 22, pickupHour: 8 + 24, durationMin: 10 * 60, reservationFee: 0, status: "confirmed" },
  { id: "b4", connectorId: "h4c1", pointId: "hub-4", user: "Patrícia L.", planId: "pro", mode: "noite", dropHour: 23, pickupHour: 8 + 24, durationMin: 9 * 60, reservationFee: 0, status: "confirmed" },
  { id: "b5", connectorId: "h4c2", pointId: "hub-4", user: "Thiago B.", planId: "pro", mode: "noite", dropHour: 21.5, pickupHour: 7.5 + 24, durationMin: 10 * 60, reservationFee: 0, status: "confirmed" },
  { id: "b6", connectorId: "h5c1", pointId: "hub-5", user: "Fernanda C.", planId: "pro", mode: "noite", dropHour: 20, pickupHour: 6 + 24, durationMin: 10 * 60, reservationFee: 0, status: "no_show" },
  // diurnos
  { id: "b7", connectorId: "h1c1", pointId: "hub-1", user: "Carlos A. (99)", planId: "pro", mode: "dia", dropHour: 12, pickupHour: 12.75, durationMin: 45, reservationFee: 0, status: "confirmed" },
  { id: "b8", connectorId: "h1c2", pointId: "hub-1", user: "Bruno T. (Uber)", planId: "pro", mode: "dia", dropHour: 19, pickupHour: 19.67, durationMin: 40, reservationFee: 0, status: "confirmed" },
  { id: "b9", connectorId: "h2c1", pointId: "hub-2", user: "Diego R.", planId: "pro", mode: "dia", dropHour: 13, pickupHour: 13.83, durationMin: 50, reservationFee: 0, status: "confirmed" },
  { id: "b10", connectorId: "h4c3", pointId: "hub-4", user: "Ana Paula (99)", planId: "pro", mode: "dia", dropHour: 11, pickupHour: 11.5, durationMin: 30, reservationFee: 0, status: "confirmed" },
  { id: "b11", connectorId: "h5c2", pointId: "hub-5", user: "Lucas F.", planId: "pro", mode: "dia", dropHour: 14, pickupHour: 15, durationMin: 60, reservationFee: 0, status: "confirmed" },
  { id: "b12", connectorId: "h2c2", pointId: "hub-2", user: "—", planId: "pro", mode: "dia", dropHour: 10, pickupHour: 10.67, durationMin: 40, reservationFee: 0, status: "cancelled" },
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
  { name: "Mariana S.", planId: "pro", status: "ativo", since: "mar/2026", kwh30d: 168, monthlyFee: 374.99 },
  { name: "Rafael M.", planId: "pro", status: "ativo", since: "jan/2026", kwh30d: 214, monthlyFee: 374.99 },
  { name: "Juliana P.", planId: "pro", status: "ativo", since: "abr/2026", kwh30d: 92, monthlyFee: 374.99 },
  { name: "Patrícia L.", planId: "pro", status: "ativo", since: "fev/2026", kwh30d: 245, monthlyFee: 374.99 },
  { name: "Thiago B.", planId: "pro", status: "ativo", since: "jun/2026", kwh30d: 61, monthlyFee: 374.99 },
  { name: "Fernanda C.", planId: "pro", status: "inadimplente", since: "nov/2025", kwh30d: 187, monthlyFee: 374.99 },
  { name: "Carlos A.", planId: "pro", status: "ativo", since: "mar/2026", kwh30d: 388, monthlyFee: 374.99 },
  { name: "Bruno T.", planId: "pro", status: "ativo", since: "jan/2026", kwh30d: 502, monthlyFee: 374.99 },
  { name: "Diego R.", planId: "pro", status: "ativo", since: "maio/2026", kwh30d: 311, monthlyFee: 374.99 },
  { name: "Ana Paula", planId: "pro", status: "ativo", since: "abr/2026", kwh30d: 274, monthlyFee: 374.99 },
  { name: "Lucas F.", planId: "pro", status: "inadimplente", since: "dez/2025", kwh30d: 421, monthlyFee: 374.99 },
  { name: "Sofia M.", planId: "pro", status: "cancelado", since: "ago/2026", kwh30d: 0, monthlyFee: 374.99 },
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


// ---------------------------------------------------------------- regras de horário

/** Converte hora decimal pra minutos desde a meia-noite. */
export const toMinutes = (decimalHour: number) => Math.round(decimalHour * 60);

/** Faixas permitidas pra reserva NOTURNA em AC (Pro):
 *  - dropHour entre 18:00 e 06:00 (atravessa meia-noite)
 *  - pickupHour entre 06:00 e 09:00 do dia seguinte
 *  - duração mínima 1h, máxima 15h
 */
export const NIGHT_DROP_HOURS: number[] = [
  18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6,
];
export const NIGHT_PICKUP_HOURS: number[] = [6, 7, 8, 9];

/** Faixas permitidas pra reserva DIURNA (Pro) em AC ou DC:
 *  - dropHour entre 06:00 e 18:00
 *  - duração: AC 30min a 4h, DC 15min a 2h
 */
export const DAY_DROP_HOURS: number[] = [
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
];
export const DAY_DURATIONS_MIN: Record<ChargerKind, number[]> = {
  AC: [30, 45, 60, 75, 90, 120, 150, 180, 210, 240],
  DC: [15, 30, 45, 60, 75, 90, 105, 120],
};

/** Converte hora decimal pra "HHhMM" usando zero-padding. */
export function fmtPickupHour(h: number): string {
  // pickup pode passar de 24 (representa manhã do dia seguinte).
  const hm = ((h % 24) + 24) % 24;
  return h.toFixed(1).endsWith(".0") ? fmtHour(hm) : `${hm.toString().replace(".", "h")}`;
}

/** buffer de segurança entre agendamentos, em minutos (§ doc) */
export const BUFFER_MIN = 10;

/** janela de tolerância de chegada, em minutos (§ doc) */
export const TOLERANCE_MIN = 15;

/** taxa de ociosidade, R$ por minuto excedente (§ doc) */
export const IDLE_FEE_PER_MIN = 0.5;

/** Janela de antecedência mínima (em horas) exigida para criar reserva no Pro.
 *  Reservas com menos antecedência sao rejeitadas. */
export const PRO_MIN_ADVANCE_HOURS = 2;

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