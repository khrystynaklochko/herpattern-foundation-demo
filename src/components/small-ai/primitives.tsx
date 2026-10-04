import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function Panel({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card/80 p-4 backdrop-blur sm:p-5", className)}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="label-mono">{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export type Kind = "measured" | "derived" | "reported";
const KIND_STYLE: Record<Kind, string> = {
  measured: "text-measured border-measured/40",
  derived: "text-derived border-derived/40 border-dashed",
  reported: "text-reported border-reported/40",
};
const KIND_LABEL: Record<Kind, string> = { measured: "Measured", derived: "AI-derived", reported: "Self-reported" };

export function KindTag({ kind }: { kind: Kind }) {
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider", KIND_STYLE[kind])}>
      {KIND_LABEL[kind]}
    </span>
  );
}

export type Provenance = {
  label: string;
  value: string;
  baseline: string;
  deviation: string;
  source: string;
  timestamp: string;
  kind: Kind;
};

export function ProvenancePopover({ p, children, className }: { p: Provenance; children: ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn("text-left transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md", className)}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">{p.label}</span>
          <KindTag kind={p.kind} />
        </div>
        <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Current</dt><dd className="font-mono">{p.value}</dd>
          <dt className="text-muted-foreground">Personal baseline</dt><dd className="font-mono">{p.baseline}</dd>
          <dt className="text-muted-foreground">Deviation</dt><dd className="font-mono">{p.deviation}</dd>
          <dt className="text-muted-foreground">Source</dt><dd>{p.source}</dd>
          <dt className="text-muted-foreground">Timestamp</dt><dd className="font-mono text-xs">{fmtTime(p.timestamp)}</dd>
        </dl>
      </PopoverContent>
    </Popover>
  );
}

export const fmtSleep = (min: number) => `${Math.floor(Math.abs(min) / 60)}h${String(Math.abs(Math.round(min)) % 60).padStart(2, "0")}`;
export const signed = (v: number, unit = "") => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v)}${unit}`;
export function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${d.toISOString().slice(5, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}
