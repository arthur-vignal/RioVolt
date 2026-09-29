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
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof BatteryCharging;
  scope: "motorista" | "painel";
};

export const NAV: NavItem[] = [
  { href: "/pontos", label: "Onde tem pontos", icon: BatteryCharging, scope: "motorista" },
  { href: "/vagas", label: "Ver vagas", icon: Layers, scope: "motorista" },
  { href: "/reservar", label: "Reservar vaga", icon: CalendarCheck, scope: "motorista" },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard, scope: "motorista" },
  { href: "/painel/agendamentos", label: "Agendamentos", icon: LayoutGrid, scope: "painel" },
  { href: "/painel/assinantes", label: "Assinantes", icon: Users, scope: "painel" },
  { href: "/painel/telemetria", label: "Telemetria", icon: Gauge, scope: "painel" },
];

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-free/15 ring-1 ring-free/30">
        <BatteryCharging className="h-4 w-4 text-free" strokeWidth={2.2} />
      </div>
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight">EV Park</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Zona Sul · Rio
        </div>
      </div>
    </Link>
  );
}

export function ScopeTabs({ scope }: { scope: "motorista" | "painel" }) {
  const isPainel = scope === "painel";
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      <Link
        href="/pontos"
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          !isPainel
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        App do motorista
      </Link>
      <Link
        href="/painel/agendamentos"
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          isPainel
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Painel da empresa
      </Link>
    </div>
  );
}

export function SideNav({ scope }: { scope: "motorista" | "painel" }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.scope === scope);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-foreground/[0.07] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors",
                active ? "text-free" : "text-muted-foreground/70 group-hover:text-foreground/70",
              )}
              strokeWidth={2}
            />
            {item.label}
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-free" />}
          </Link>
        );
      })}
    </nav>
  );
}
