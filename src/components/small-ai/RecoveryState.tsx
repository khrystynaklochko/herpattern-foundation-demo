import { AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
import type { DemoEngine } from "@/hooks/useDemoEngine";
import { Button } from "@/components/ui/button";
import { FEATURE_LABELS, type FeatureKey } from "@/lib/small-ai/types";
import { Panel, KindTag, signed } from "./primitives";

const STATE_LABEL = {
  within_personal_pattern: "Within personal pattern",
  changed: "Changed",
  strongly_changed: "Strongly changed",
  insufficient_data: "Insufficient data",
} as const;

export function RecoveryState({ e, onWhy }: { e: DemoEngine; onWhy: () => void }) {
  const inf = e.result?.inference;
  if (inf?.state === "insufficient_data") {
    return (
      <Panel title="Wearable-derived recovery" right={<KindTag kind="derived" />} className="border-warn/40">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 size-5 shrink-0 text-warn" />
          <div>
            <div className="font-serif text-3xl">Not enough information</div>
            <p className="mt-1 text-sm text-muted-foreground">HerPattern does not have enough recent data to compare this reliably with your normal pattern.</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="label-mono">Confidence</dt><dd className="font-mono text-warn">LOW</dd></div>
          <div><dt className="label-mono">Missing</dt><dd className="font-mono text-xs">{inf.missing_features.map((f) => FEATURE_LABELS[f as FeatureKey] ?? f).join(", ")}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={e.restoreData}>Restore data</Button>
          <Button size="sm" variant="outline" onClick={e.resume}>Continue monitoring</Button>
        </div>
      </Panel>
    );
  }
  const changed = inf && inf.state !== "within_personal_pattern";
  const rec = inf?.recovery_score ?? 82;
  return (
    <Panel title="Wearable-derived recovery" right={<div className="flex items-center gap-2"><KindTag kind="derived" /><Button size="sm" variant="outline" className="h-7 px-2 font-mono text-xs" onClick={onWhy}>WHY?</Button></div>}>
      <div className="flex items-end gap-3">
        <span className={`font-serif text-7xl leading-none tabular-nums transition-colors ${changed ? "text-primary" : "text-foreground"}`}>{rec}</span>
        {changed && <ArrowDown className="mb-2 size-6 text-primary" />}
        <span className={`mb-2 ml-auto rounded-full border px-3 py-1 text-sm ${changed ? "border-primary/50 text-primary" : "border-ok/50 text-ok"}`}>
          {inf ? STATE_LABEL[inf.state] : "—"}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div><dt className="label-mono">Velocity</dt><dd className="flex items-center gap-1 font-mono">{e.velocity < 0 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}{signed(e.velocity, "%")}</dd></div>
        <div><dt className="label-mono">Stress</dt><dd className="font-mono">{inf?.stress_score ?? "—"}</dd></div>
        <div><dt className="label-mono">Confidence</dt><dd className="font-mono">{inf ? Math.round(inf.confidence * 100) : "—"}%</dd></div>
      </dl>
    </Panel>
  );
}
