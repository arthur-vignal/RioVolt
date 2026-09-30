"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SideNav, Brand, type Scope } from "@/components/nav";
import { useAppAuth } from "@/lib/providers";

export function Shell({ scope, children }: { scope: Scope; children: ReactNode }) {
  const { logout } = useAppAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh bg-[#f7f8f6] text-black">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-black/10 bg-white px-4 py-5 lg:flex">
        <div className="flex flex-col gap-6">
          <Brand scope={scope} />
          <SideNav scope={scope} onLogout={handleLogout} />
        </div>
        <div className="space-y-1 border-t border-black/10 pt-4">
          <p className="text-[12px] leading-5 text-black/60">6 hubs no Rio · 12 conectores<br/>8 AC noturno · 4 DC rápido</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-4 py-3 lg:hidden">
          <Brand scope={scope} />
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
