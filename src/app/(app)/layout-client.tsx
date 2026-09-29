"use client";

import type { ReactNode } from "react";
import { SideNav, Brand, ScopeTabs, RoleHeader, type Scope } from "@/components/nav";

export function Shell({
  scope,
  children,
}: {
  scope: Scope;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-border bg-sidebar px-4 py-5 lg:flex">
        <div className="flex flex-col gap-6">
          <Brand />
          <ScopeTabs scope={scope} />
          <RoleHeader scope={scope} />
          <SideNav scope={scope} />
        </div>
        <div className="space-y-1 border-t border-border pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Rede piloto
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            6 hubs no Rio · 12 conectores
            <br />
            8 AC noturno · 4 DC rápido
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Brand />
          <ScopeTabs scope={scope} />
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
