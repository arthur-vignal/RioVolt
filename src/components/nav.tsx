"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BatteryCharging,
  CalendarCheck,
  Layers,
  CreditCard,
  LayoutGrid,
  Users,
  Gauge,
  LogOut,
  UserCircle2,
  History,
} from "lucide-react";

export type Scope = "motorista" | "donos";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof BatteryCharging;
  scope: Scope;
  /** incluir na barra de navegação inferior mobile */
  primary?: boolean;
};

/** Ordem da barra inferior mobile (motorista). 5 itens max. */
export const MOTORISTA_PRIMARY: NavItem[] = [
  { href: "/motorista/pontos", label: "Pontos", icon: BatteryCharging, scope: "motorista", primary: true },
  { href: "/motorista/vagas", label: "Vagas", icon: Layers, scope: "motorista", primary: true },
  { href: "/motorista/reservar", label: "Reservar", icon: CalendarCheck, scope: "motorista", primary: true },
  { href: "/motorista/assinatura", label: "Plano", icon: CreditCard, scope: "motorista", primary: true },
  { href: "/motorista/perfil", label: "Perfil", icon: UserCircle2, scope: "motorista", primary: true },
];

/** Itens do sidebar motorista (inclui os primary + histórico). */
export const MOTORISTA_NAV: NavItem[] = [
  ...MOTORISTA_PRIMARY,
  { href: "/motorista/historico", label: "Histórico", icon: History, scope: "motorista" },
];

export const DONOS_NAV: NavItem[] = [
  { href: "/donos/agendamentos", label: "Agenda", icon: LayoutGrid, scope: "donos" },
  { href: "/donos/assinantes", label: "Assinantes", icon: Users, scope: "donos" },
  { href: "/donos/telemetria", label: "Telemetria", icon: Gauge, scope: "donos" },
];

export function VoltrioMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#16a34a] text-white">
        <BatteryCharging className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </div>
      <div className="leading-none">
        <div className="text-[16px] font-semibold tracking-[-0.03em] text-black">Voltrio</div>
      </div>
    </div>
  );
}

/**
 * Logo: na landing (sem escopo) é link pra /.
 * Dentro do app logado (escopo definido), é só marca visual — não navega.
 */
export function Brand({ scope }: { scope?: Scope }) {
  if (scope) {
    return (
      <div className="flex items-center gap-2.5" aria-label="Voltrio">
        <VoltrioMark />
      </div>
    );
  }
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Voltrio, página inicial">
      <VoltrioMark />
    </Link>
  );
}

export function SideNav({ scope, onLogout }: { scope: Scope; onLogout?: () => void }) {
  const pathname = usePathname();
  const items = scope === "motorista" ? MOTORISTA_NAV : DONOS_NAV;
  return (
    <nav className="flex flex-col gap-1" aria-label={scope === "motorista" ? "Navegação do motorista" : "Navegação dos donos"}>
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-[6px] px-3 py-2 text-[14px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16a34a]",
              active ? "bg-black text-white" : "text-black/70 hover:bg-black/5 hover:text-black",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-[#16a34a]" : "text-black/55")} strokeWidth={2} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}

      {onLogout ? (
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex min-h-10 items-center gap-3 rounded-[6px] px-3 py-2 text-[14px] font-medium text-black/55 hover:bg-black/5 hover:text-black"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      ) : null}
    </nav>
  );
}

/**
 * Bottom nav mobile — mostra só os itens primários (5 max).
 * Itens mantêm h-12 (48px) e área de toque 44px+ pra mobile.
 */
export function BottomNav({ scope }: { scope: Scope }) {
  const pathname = usePathname();
  const items = scope === "motorista" ? MOTORISTA_PRIMARY : DONOS_NAV.slice(0, 4);
  return (
      <nav
      className="fixed inset-x-0 bottom-0 z-20 grid border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.04)] lg:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      aria-label={scope === "motorista" ? "Navegação inferior do motorista" : "Navegação inferior dos donos"}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors",
              active ? "text-[#16a34a]" : "text-black/55 hover:text-black",
            )}
          >
            <Icon
              className={cn("h-6 w-6", active ? "text-[#16a34a]" : "text-black/55")}
              strokeWidth={active ? 2.25 : 2}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
