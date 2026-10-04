import { Fragment, useState } from "react";
import type { DemoEngine } from "@/hooks/useDemoEngine";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { FEATURE_LABELS, MODEL_NAME, type FeatureKey } from "@/lib/small-ai/types";

const level = (c: number) => (Math.abs(c) > 0.25 ? "HIGH" : Math.abs(c) > 0.1 ? "MODERATE" : "LOW");

export function WhyDrawer({ e, open, onOpenChange }: { e: DemoEngine; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [tech, setTech] = useState(false);
  const r = e.result;
  const inf = r?.inference;
  const coverage = inf ? Math.round((1 - inf.missing_features.length / 7) * 100) : 0;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle className="font-serif text-3xl font-normal">Why HerPattern flagged this</SheetTitle></SheetHeader>
        {!inf ? <p className="p-4 text-sm">Run the demo to see an explanation.</p> : (
          <div className="space-y-6 px-4 pb-6">
            <ul className="divide-y">
              {inf.top_contributors.slice(0, 4).map((c) => (
                <li key={c.feature} className="flex items-center justify-between py-2">
                  <span>{FEATURE_LABELS[c.feature as FeatureKey] ?? c.feature}</span>
                  <span className="font-mono text-xs"><span className="text-muted-foreground">Contribution</span> <span className={level(c.contribution) === "HIGH" ? "text-primary" : ""}>{level(c.contribution)}</span></span>
                </li>
              ))}
              {inf.top_contributors.length === 0 && <li className="py-2 text-sm text-muted-foreground">No contributors — insufficient data.</li>}
            </ul>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Model</dt><dd className="font-mono">{MODEL_NAME}</dd>
              <dt className="text-muted-foreground">Version</dt><dd className="font-mono">{inf.model_version}</dd>
              <dt className="text-muted-foreground">Inference</dt><dd className="font-mono">Local-capable</dd>
              <dt className="text-muted-foreground">Inference location</dt><dd className="font-mono">{r.location === "local" ? "LOCAL BROWSER" : "HERPATTERN SMALL AI SERVICE"}{r.fallback ? " (fallback)" : ""}</dd>
              <dt className="text-muted-foreground">Data coverage</dt><dd className="font-mono">{coverage}%</dd>
              <dt className="text-muted-foreground">Input</dt><dd className="font-mono">Synthetic demonstration</dd>
            </dl>
            <div className="rounded-lg border p-3">
              <label className="flex items-center justify-between text-sm">Technical mode <Switch checked={tech} onCheckedChange={setTech} /></label>
              {tech && (
                <dl className="mt-3 grid grid-cols-2 gap-y-1 font-mono text-xs">
                  <dt className="text-muted-foreground">anomaly score</dt><dd>{inf.anomaly_score}</dd>
                  {Object.entries(e.frame.features).map(([k, v]) => (
                    <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd>{e.dataMissing && inf.missing_features.includes(k) ? "null" : v}</dd></Fragment>
                  ))}
                  <dt className="text-muted-foreground">missing</dt><dd>{inf.missing_features.join(", ") || "none"}</dd>
                </dl>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
