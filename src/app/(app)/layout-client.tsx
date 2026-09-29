"use client";

import type { ReactNode } from "react";
import { SideNav, Brand, ScopeTabs } from "@/components/nav";

export function Shell({
  scope,
  children,
}: {
  scope: "motorista" | "painel";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-r border-border bg-card/40 px-4 py-5 lg:flex">
        <div className="flex flex-col gap-6">
          <Brand />
          <ScopeTabs scope={scope} />
          <SideNav scope={scope} />
        </div>
        <div className="space-y-1 border-t border-border pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            Operação
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground/60">
            6 pontos · 12 conectores
            <br />
            8 AC noturno · 4 DC rápido
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-background/80 px-5 py-3 backdrop-blur-md lg:hidden">
          <Brand />
          <ScopeTabs scope={scope} />
        </header>
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
