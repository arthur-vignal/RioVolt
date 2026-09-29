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
  Building2,
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

export function VoltrioMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-navy bg-navy text-volt">
        <BatteryCharging className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="text-[16px] font-semibold tracking-[-0.03em] text-foreground">Voltrio</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Rio de Janeiro
          </div>
        </div>
      )}
    </div>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Voltrio, página inicial">
      <VoltrioMark />
    </Link>
  );
}

export function ScopeTabs({ scope }: { scope: Scope }) {
  const isOwner = scope === "donos";
  return (
    <div className="grid grid-cols-2 rounded-md border border-border bg-muted p-0.5">
      <Link
        href="/motorista/pontos"
        className={cn(
          "rounded-sm px-3 py-1.5 text-center text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          !isOwner ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Motorista
      </Link>
      <Link
        href="/donos/agendamentos"
        className={cn(
          "rounded-sm px-3 py-1.5 text-center text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isOwner ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Donos
      </Link>
    </div>
  );
}

export function SideNav({ scope }: { scope: Scope }) {
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
              "group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-navy text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              className={cn("h-4 w-4", active ? "text-volt" : "text-muted-foreground group-hover:text-foreground")}
              strokeWidth={2}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function RoleHeader({ scope }: { scope: Scope }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
        {scope === "donos" ? (
          <Building2 className="h-4 w-4 text-navy" aria-hidden="true" />
        ) : (
          <BatteryCharging className="h-4 w-4 text-navy" aria-hidden="true" />
        )}
        {scope === "donos" ? "Sistema de donos" : "Sistema de motorista"}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {scope === "donos"
          ? "Operação, assinantes e consumo dos pontos Voltrio."
          : "Encontrar, reservar e acompanhar recargas Voltrio."}
      </p>
    </div>
  );
}
