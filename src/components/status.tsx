import { cn } from "@/lib/utils";
import type { PointStatus } from "@/lib/mock-data";

export const STATUS_STYLE: Record<
  PointStatus,
  { label: string; chip: string; text: string; border: string }
> = {
  free: { label: "Livre", chip: "bg-[#16a34a]/10 border-[#16a34a]/20", text: "text-[#16a34a]", border: "border-[#16a34a]/30" },
  reserved: { label: "Reservado", chip: "bg-black/5 border-black/10", text: "text-black/70", border: "border-black/20" },
  in_use: { label: "Em uso", chip: "bg-black border-black/10", text: "text-white", border: "border-black" },
  offline: { label: "Fora de serviço", chip: "bg-black/5 border-black/10", text: "text-black/55", border: "border-black/10" },
};

export function StatusPill({ status, className }: { status: PointStatus; className?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1 text-[12px] font-semibold", s.chip, s.text, className)}>
      {s.label}
    </span>
  );
}

export function KindBadge({ kind, powerKw }: { kind: "AC" | "DC"; powerKw: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold", kind === "DC" ? "border-black/20 text-black" : "border-black/10 text-black/70")}>
      {kind} <span className="opacity-70">{powerKw}kW</span>
    </span>
  );
}
