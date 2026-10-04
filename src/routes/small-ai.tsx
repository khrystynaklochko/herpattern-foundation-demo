import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoEngine, type DemoPhase, type ScenarioParam } from "@/hooks/useDemoEngine";
import { LiveHeartRate } from "@/components/small-ai/LiveHeartRate";
import { CardiacPanel } from "@/components/small-ai/CardiacPanel";
import { BaselineMap } from "@/components/small-ai/BaselineMap";
import { RecoveryState } from "@/components/small-ai/RecoveryState";
import { WhatChanged } from "@/components/small-ai/WhatChanged";
import { QuestionCard } from "@/components/small-ai/QuestionCard";
import { ContinuityCard } from "@/components/small-ai/ContinuityCard";
import { ConnectivityPanel } from "@/components/small-ai/ConnectivityPanel";
import { WhyDrawer } from "@/components/small-ai/WhyDrawer";
import { SafetyContent, SafetyPanel } from "@/components/small-ai/SafetyPanel";

type Search = { demo?: "judge"; scenario?: "normal" | "changed" | "missing-data" };

export const Route = createFileRoute("/small-ai")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    demo: s.demo === "judge" ? "judge" : undefined,
    scenario: s.scenario === "normal" || s.scenario === "changed" || s.scenario === "missing-data" ? s.scenario : undefined,
  }),
  head: () => ({
    meta: [
      { title: "HerPattern Small AI — Offline-capable personal pattern demo" },
      { name: "description", content: "Watch HerPattern learn a personal baseline, detect change, ask one question and keep working when the cloud disappears. Synthetic demo data." },
      { property: "og:title", content: "HerPattern Small AI — The cloud disappeared. The intelligence didn't." },
      { property: "og:description", content: "A 25-second interactive demo of local, explainable, personal-baseline AI for women's health continuity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SmallAIPage,
});

const PHASE_LABEL: Record<DemoPhase, string> = {
  idle: "Ready", baseline: "Learning baseline", streaming: "Streaming", pattern_changing: "Pattern changing",
  anomaly_detected: "Anomaly detected", question_required: "One question", question_answered: "Answer saved",
  continuity_ready: "Continuity ready", offline: "Offline", queued: "Queued locally", syncing: "Syncing",
  complete: "Complete", insufficient_data: "Insufficient data", error: "Error",
};

function SmallAIPage() {
  const search = Route.useSearch();
  const judge = search.demo === "judge";
  const scenarioParam: ScenarioParam = search.scenario ?? "journey";
  const e = useDemoEngine({ judge, scenarioParam });
  const [why, setWhy] = useState(false);
  const [safety, setSafety] = useState(false);
  const progress = ((e.frameIndex - e.startAt) / (e.frames.length - 1 - e.startAt)) * 100;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="font-mono text-sm tracking-[0.2em]"><span className="text-primary">HERPATTERN</span> / SMALL AI</div>
          <span className="rounded border border-derived/40 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-derived">Synthetic demonstration data</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">OFFLINE CAPABLE</span>
            <Button size="sm" variant="ghost" onClick={() => setSafety(true)}><ShieldCheck className="size-4" />Safety &amp; scope</Button>
          </div>
        </div>
        <div className="h-0.5 bg-muted"><div className="h-full bg-primary transition-all duration-200" style={{ width: `${e.started ? progress : 0}%` }} /></div>
      </header>

      {e.banner && (
        <div className="fixed inset-x-0 top-16 z-40 mx-auto w-fit animate-in fade-in rounded-full border border-warn/60 bg-background px-5 py-2 font-mono text-sm tracking-widest text-warn shadow-lg">{e.banner}</div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-5">
        {/* Control strip */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {!e.started || e.phase === "complete" ? (
            <Button size="lg" onClick={e.start} className="font-mono tracking-wider">
              <Play className="size-4" />{judge ? "START 25-SECOND DEMO" : e.started ? "RUN AGAIN" : "RUN DEMO"}
            </Button>
          ) : e.running ? (
            <Button size="lg" variant="secondary" onClick={e.pause}><Pause className="size-4" />Pause</Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={e.resume} disabled={e.phase === "question_required" || e.frameIndex >= e.frames.length - 1}><Play className="size-4" />Resume</Button>
          )}
          {e.started && <Button size="lg" variant="ghost" onClick={e.reset}><RotateCcw className="size-4" />Restart</Button>}
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
            <span className={`size-2 rounded-full ${e.running ? "bg-primary animate-pulse-dot" : "bg-muted-foreground"}`} />
            <span className="font-mono text-xs uppercase tracking-wider">{PHASE_LABEL[e.phase]}</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{e.frame.segment} · T−{e.frame.hoursBeforeNow}h</span>
          {!judge && (
            <div className="ml-auto flex items-center gap-1 font-mono text-xs">
              {([1, 4, 12] as const).map((s) => (
                <button key={s} onClick={() => e.setSpeed(s)} className={`rounded px-2 py-1 ${e.speed === s ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{s}×</button>
              ))}
              <label className="ml-2 flex items-center gap-1.5 text-muted-foreground">
                <input type="checkbox" checked={e.forceLocal} onChange={(x) => e.setForceLocal(x.target.checked)} className="accent-primary" />force local
              </label>
              {e.result?.fallback && <span className="ml-2 text-warn">API fallback · local</span>}
            </div>
          )}
        </div>

        {judge && !e.started && (
          <section className="mb-5 rounded-xl border bg-card p-6 text-center">
            <div className="label-mono">HerPattern Small AI</div>
            <h1 className="mt-2 font-serif text-4xl sm:text-5xl">See what happens when the cloud disappears.</h1>
          </section>
        )}
        {!judge && !e.started && (
          <h1 className="mb-5 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">
            Learns your pattern locally, notices change, asks only what's missing — and keeps working without the cloud.
          </h1>
        )}

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <LiveHeartRate e={e} />
            <QuestionCard e={e} />
            <ContinuityCard e={e} />
            <div className="grid gap-4 md:grid-cols-2">
              <RecoveryState e={e} onWhy={() => setWhy(true)} />
              <WhatChanged e={e} />
            </div>
          </div>
          <div className="space-y-4 lg:col-span-5">
            <ConnectivityPanel e={e} />
            <BaselineMap e={e} />
            <CardiacPanel e={e} />
          </div>
        </div>

        <section className="mt-8 rounded-xl border bg-card/60 p-5">
          <h2 className="mb-4 font-serif text-2xl">Safety &amp; scope</h2>
          <SafetyContent />
        </section>
        <footer className="py-8 text-center text-xs text-muted-foreground">
          Synthetic demonstration data · no real health information is loaded · HerPattern organizes personal health context. It does not diagnose or prescribe.
        </footer>
      </main>

      <WhyDrawer e={e} open={why} onOpenChange={setWhy} />
      <SafetyPanel open={safety} onOpenChange={setSafety} />

      {e.finale && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-6 backdrop-blur animate-in fade-in">
          <div className="max-w-2xl text-center">
            <p className="font-serif text-4xl leading-tight sm:text-6xl">The cloud disappeared.<br /><span className="text-primary">The intelligence didn't.</span></p>
            <p className="mt-4 font-mono text-sm text-ok">{e.queue.filter((q) => q.state === "SYNCED").length} RECORDS SYNCED ✓ · WATCH → DEVICE → HERPATTERN</p>
            <div className="mt-8 flex justify-center gap-3">
              <Button size="lg" onClick={e.start}><RotateCcw className="size-4" />Replay</Button>
              <Button size="lg" variant="outline" onClick={() => { e.dismissFinale(); setWhy(true); }}>Explore the technology</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
