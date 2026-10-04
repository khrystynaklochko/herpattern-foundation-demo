import type { DemoEngine } from "@/hooks/useDemoEngine";
import { BASELINE } from "@/data/small-ai/demoScenario";
import { FEATURE_LABELS, type FeatureKey } from "@/lib/small-ai/types";
import { Panel, ProvenancePopover, fmtSleep, signed, type Provenance } from "./primitives";

export function describeFeature(f: FeatureKey, e: DemoEngine): { text: string; p: Provenance } {
  const m = e.frame.measured;
  const ts = e.frame.timestamp;
  const base = { timestamp: ts, kind: "measured" as const, source: "Synthetic watch" };
  switch (f) {
    case "sleep_debt": {
      const d = m.sleepDeltaMin;
      return { text: Math.abs(d) < 15 ? "similar to normal" : `${fmtSleep(d)} ${d < 0 ? "below" : "above"} baseline`, p: { ...base, label: "Sleep", value: fmtSleep(m.sleepMin), baseline: fmtSleep(BASELINE.sleepMin), deviation: signed(d, " min"), source: "Synthetic sleep tracker" } };
    }
    case "hrv_delta": {
      const pct = Math.round(((m.hrv - BASELINE.hrv) / BASELINE.hrv) * 100);
      return { text: Math.abs(pct) < 4 ? "similar to normal" : `${Math.abs(pct)}% ${pct < 0 ? "below" : "above"} baseline`, p: { ...base, label: "HRV", value: `${m.hrv} ms`, baseline: `${BASELINE.hrv} ms`, deviation: signed(pct, "%") } };
    }
    case "rhr_delta": {
      const d = m.rhr - BASELINE.rhr;
      return { text: Math.abs(d) < 2 ? "similar to normal" : `${Math.abs(d)} bpm ${d > 0 ? "above" : "below"} baseline`, p: { ...base, label: "Resting HR", value: `${m.rhr} bpm`, baseline: `${BASELINE.rhr} bpm`, deviation: signed(d, " bpm") } };
    }
    case "activity_load":
      return { text: Math.abs(m.activityRel) < 15 ? "similar to normal" : `${Math.abs(m.activityRel)}% ${m.activityRel < 0 ? "lower" : "higher"} than usual`, p: { ...base, label: "Activity", value: signed(m.activityRel, "%"), baseline: "0%", deviation: signed(m.activityRel, "%") } };
    case "temp_delta":
      return { text: Math.abs(m.tempDelta) < 0.1 ? "similar to normal" : `${signed(m.tempDelta, " °C")} relative`, p: { ...base, label: "Skin temperature", value: signed(m.tempDelta, " °C"), baseline: "0.0 °C", deviation: signed(m.tempDelta, " °C") } };
    case "resp_delta":
      return { text: Math.abs(m.resp - BASELINE.resp) < 0.2 ? "similar to normal" : `${signed(Math.round((m.resp - BASELINE.resp) * 10) / 10)} breaths/min`, p: { ...base, label: "Respiration", value: `${m.resp} /min`, baseline: `${BASELINE.resp} /min`, deviation: signed(Math.round((m.resp - BASELINE.resp) * 10) / 10) } };
    case "sleep_fragmentation":
      return { text: m.fragmentation < 0.3 ? "similar to normal" : "elevated", p: { ...base, label: "Sleep fragmentation", value: `${m.fragmentation} σ`, baseline: "0 σ", deviation: signed(m.fragmentation, " σ"), source: "Synthetic sleep tracker" } };
  }
}

export function WhatChanged({ e }: { e: DemoEngine }) {
  const inf = e.result?.inference;
  const list = (inf?.top_contributors ?? []).slice(0, 5);
  const max = Math.max(...list.map((c) => Math.abs(c.contribution)), 0.001);
  const quiet = !inf || inf.state === "within_personal_pattern";

  return (
    <Panel title="What changed?" right={<span className="label-mono">from model output</span>}>
      {inf?.state === "insufficient_data" ? (
        <p className="text-sm text-muted-foreground">No comparison possible until key signals return.</p>
      ) : (
        <ul className="space-y-2.5">
          {list.map((c, i) => {
            const f = c.feature as FeatureKey;
            const d = describeFeature(f, e);
            const w = (Math.abs(c.contribution) / max) * 100;
            return (
              <li key={f}>
                <ProvenancePopover p={d.p} className="block w-full p-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={i < 3 && !quiet ? "font-semibold" : "text-muted-foreground"}>{FEATURE_LABELS[f]}</span>
                    <span className="font-mono text-xs text-muted-foreground">{d.text}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className={`h-full rounded-full transition-all duration-500 ${i < 3 && !quiet ? "bg-primary" : "bg-muted-foreground/40"}`} style={{ width: `${quiet ? w * 0.35 : w}%` }} />
                  </div>
                </ProvenancePopover>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">These signals changed together compared with your recent personal pattern.</p>
    </Panel>
  );
}
