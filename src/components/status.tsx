import { cn } from "@/lib/utils";
import type { PointStatus } from "@/lib/mock-data";

export const STATUS_STYLE: Record<
  PointStatus,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  free: {
    label: "Livre",
    dot: "bg-free",
    text: "text-free",
    bg: "bg-free/10",
    border: "border-free/30",
  },
  reserved: {
    label: "Reservado",
    dot: "bg-taken",
    text: "text-taken",
    bg: "bg-taken/10",
    border: "border-taken/30",
  },
  in_use: {
    label: "Em uso",
    dot: "bg-busy",
    text: "text-busy",
    bg: "bg-busy/10",
    border: "border-busy/30",
  },
  offline: {
    label: "Fora de serviço",
    dot: "bg-offline",
    text: "text-offline",
    bg: "bg-offline/10",
    border: "border-offline/30",
  },
};

export function StatusPill({
  status,
  className,
}: {
  status: PointStatus;
  className?: string;
}) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        s.bg,
        s.border,
        s.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function KindBadge({ kind, powerKw }: { kind: "AC" | "DC"; powerKw: number }) {
  const isDC = kind === "DC";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide",
        isDC
          ? "border-dc/40 bg-dc/10 text-dc"
          : "border-ac/40 bg-ac/10 text-ac",
      )}
    >
      {kind}
      <span className="opacity-70">{powerKw}kW</span>
    </span>
  );
}
