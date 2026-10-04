import { useState } from "react";
import type { DemoEngine } from "@/hooks/useDemoEngine";
import { BASELINE } from "@/data/small-ai/demoScenario";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KindTag, fmtSleep, fmtTime } from "./primitives";

export function ContinuityCard({ e }: { e: DemoEngine }) {
  const [view, setView] = useState<null | "evidence" | "timeline">(null);
  const c = e.continuity;
  if (!c) return null;
  const m = c.frame.measured;
  const hrvPct = Math.round(((m.hrv - BASELINE.hrv) / BASELINE.hrv) * 100);
  const pain = c.answer ? `${c.answer} today` : "Not reported";

  const exportSummary = () => {
    const blob = new Blob([JSON.stringify({ synthetic: true, createdAt: c.createdAt, measured: m, answer: c.answer, recovery: c.recovery, confidence: c.confidence }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "herpattern-demo-continuity-summary.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="label-mono">HerPattern</div>
          <h3 className="font-serif text-3xl leading-tight">Continuity summary</h3>
        </div>
        <div className="text-right"><div className="label-mono">Time range</div><div className="text-sm">Last 72 hours</div></div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <KindTag kind="measured" />
          <Row k="Sleep" v={`↓ ${fmtSleep(m.sleepDeltaMin)} from personal baseline`} />
          <Row k="HRV" v={`↓ ${Math.abs(hrvPct)}%`} />
          <Row k="Resting HR" v={`↑ ${m.rhr - BASELINE.rhr} bpm`} />
        </div>
        <div className="space-y-2">
          <KindTag kind="reported" />
          <Row k="Pelvic pain" v={pain} />
          <Row k="Medication" v="No change reported" />
        </div>
        <div className="space-y-2">
          <KindTag kind="derived" />
          <Row k="Recovery pattern" v="Below personal baseline" />
          <Row k="Confidence" v={`${Math.round(c.confidence * 100)}%`} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setView("evidence")}>View evidence</Button>
        <Button size="sm" variant="outline" onClick={() => setView("timeline")}>View timeline</Button>
        <Button size="sm" variant="ghost" onClick={exportSummary}>Export demo summary</Button>
      </div>
      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">HerPattern organizes personal health context. It does not diagnose or prescribe.</p>

      <Dialog open={view !== null} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{view === "evidence" ? "Evidence (synthetic)" : "Timeline"}</DialogTitle></DialogHeader>
          {view === "evidence" ? (
            <ul className="space-y-1 font-mono text-xs">
              {c.frame.points.map((p) => (
                <li key={p.measurementType} className="flex justify-between gap-2 border-b py-1">
                  <span>{p.measurementType}</span><span>{p.value}</span><span className="text-muted-foreground">{p.source}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ol className="space-y-2 text-sm">
              {e.timeline.map((t) => (
                <li key={t.id} className="flex gap-3"><span className="font-mono text-xs text-muted-foreground">{fmtTime(t.at)}</span><span>{t.label}</span></li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div><div className="text-xs text-muted-foreground">{k}</div><div className="text-sm font-medium">{v}</div></div>;
}
