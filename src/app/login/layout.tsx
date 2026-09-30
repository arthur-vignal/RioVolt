"use client";

import { useAppAuth } from "@/lib/providers";
import { VoltrioMark } from "@/components/nav";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f7f8f6] text-black flex flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <VoltrioMark />
      </header>
      <div className="flex flex-1 items-center justify-center px-5 pb-10">
        {children}
      </div>
    </div>
  );
}
