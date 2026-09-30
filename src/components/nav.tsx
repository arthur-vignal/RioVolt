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
} from "lucide-react";

export type Scope = "motorista" | "donos";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof BatteryCharging;
  scope: Scope;
};

export const NAV: NavItem[] = [
  { href: "/motorista/pontos", label: "Pontos", icon: BatteryCharging, scope: "motorista" },
  { href: "/motorista/vagas", label: "Disponibilidade", icon: Layers, scope: "motorista" },
  { href: "/motorista/reservar", label: "Reservar", icon: CalendarCheck, scope: "motorista" },
  { href: "/motorista/assinatura", label: "Assinatura", icon: CreditCard, scope: "motorista" },
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

export function Brand({ scope }: { scope: Scope }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Voltrio, página inicial">
      <VoltrioMark />
    </Link>
  );
}

export function SideNav({ scope, onLogout }: { scope: Scope; onLogout?: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.scope === scope);
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
