import { Heart } from "lucide-react";
import type { DemoEngine } from "@/hooks/useDemoEngine";
import { BASELINE } from "@/data/small-ai/demoScenario";
import { Panel, ProvenancePopover, signed, type Provenance } from "./primitives";

export function CardiacPanel({ e }: { e: DemoEngine }) {
  const m = e.frame.measured;
  const inf = e.result?.inference;
  const insufficient = inf?.state === "insufficient_data";
  const hrNow = Math.round(e.hr[e.hr.length - 1]!);
  const ts = e.frame.timestamp;
  const src = "Watch";
  const hrvPct = Math.round(((m.hrv - BASELINE.hrv) / BASELINE.hrv) * 100);

  const P = (label: string, value: string, baseline: string, deviation: string, kind: Provenance["kind"] = "measured", source = src): Provenance =>
    ({ label, value, baseline, deviation, source, timestamp: ts, kind });

  const hrv = P("HRV", e.dataMissing ? "—" : `${m.hrv} ms`, `${BASELINE.hrv} ms`, e.dataMissing ? "missing" : signed(hrvPct, "%"));
  const rhr = P("Resting HR", `${m.rhr} bpm`, `${BASELINE.rhr} bpm`, signed(m.rhr - BASELINE.rhr, " bpm"));
  const hr = P("Heart rate", `${hrNow} bpm`, `${BASELINE.hr} bpm`, signed(hrNow - BASELINE.hr, " bpm"));
  const rec = P("Recovery", insufficient ? "Not enough data" : `${inf?.recovery_score ?? "—"}`, "80–84", insufficient ? "—" : signed((inf?.recovery_score ?? 82) - 82), "derived", "HerPattern Small AI (local-capable)");

  const node = (p: Provenance, cls: string) => (
    <ProvenancePopover p={p} className={`flex flex-col items-center p-2 ${cls}`}>
      <span className="label-mono">{p.label}{p.kind === "derived" && " · AI"}</span>
      <span className={`font-mono text-xl ${p.kind === "derived" ? "text-derived" : "text-measured"}`}>{p.value}</span>
    </ProvenancePopover>
  );

  const extras: Provenance[] = [
    P("Sleep HR", `${m.sleepHr} bpm`, `${BASELINE.sleepHr} bpm`, signed(m.sleepHr - BASELINE.sleepHr, " bpm")),
    P("Respiration", e.dataMissing ? "—" : `${m.resp} /min`, `${BASELINE.resp} /min`, e.dataMissing ? "missing" : signed(Math.round((m.resp - BASELINE.resp) * 10) / 10)),
    P("Recovery velocity", insufficient ? "—" : signed(e.velocity, "%"), "±3%", "vs. 24 h ago", "derived", "HerPattern Small AI"),
  ];

  return (
    <Panel title="Cardiac summary" right={<span className="label-mono">tap any metric</span>}>
      <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-1">
        <div />{node(hrv, "")}<div />
        {node(rhr, "")}
        <div className="relative grid size-16 place-items-center rounded-full border border-primary/40 bg-primary/10">
          <Heart className={`size-7 text-primary ${e.running ? "animate-pulse" : ""}`} fill="currentColor" />
        </div>
        {node(hr, "")}
        <div />{node(rec, "rounded-md border border-dashed border-derived/40")}<div />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-sm sm:grid-cols-4">
        {extras.map((p) => (
          <ProvenancePopover key={p.label} p={p} className="p-1">
            <div className="label-mono">{p.label}</div>
            <div className={`font-mono ${p.kind === "derived" ? "text-derived" : "text-measured"}`}>{p.value}</div>
          </ProvenancePopover>
        ))}
        <div className="p-1"><div className="label-mono">Latest update</div><div className="font-mono text-xs">{ts.slice(11, 16)} UTC</div></div>
      </div>
    </Panel>
  );
}
