import { useMemo } from "react";
import type { DemoEngine } from "@/hooks/useDemoEngine";
import { BASELINE } from "@/data/small-ai/demoScenario";
import { Panel, KindTag } from "./primitives";

export function LiveHeartRate({ e }: { e: DemoEngine }) {
  const { hr, running, frame } = e;
  const current = Math.round(hr[hr.length - 1]!);
  const W = 600, H = 150;
  const path = useMemo(() => {
    const lo = 60, hi = 95;
    return hr
      .map((v, i) => {
        const x = (i / (hr.length - 1)) * W;
        const y = H - ((v - lo) / (hi - lo)) * H;
        return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [hr]);
  const baseY = H - ((BASELINE.hr - 60) / 35) * H;

  return (
    <Panel
      title={<span className="flex items-center gap-2"><span className={`size-2 rounded-full bg-primary ${running ? "animate-pulse-dot" : "opacity-50"}`} />Live heart rate</span>}
      right={<span className="label-mono">{running ? "streaming" : "paused"} · simulated · not ECG</span>}
    >
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <div className="font-serif text-6xl leading-none tabular-nums" aria-live="polite">{current}<span className="ml-1 font-sans text-base text-muted-foreground">bpm</span></div>
        </div>
        <div className="flex gap-6 text-sm">
          <div><div className="label-mono">Resting HR</div><div className="font-mono text-lg text-measured">{frame.measured.rhr} bpm</div></div>
          <div><div className="label-mono">Latest HRV</div><div className="font-mono text-lg text-measured">{frame.measured.hrv} ms</div></div>
        </div>
        <div className="ml-auto"><KindTag kind="measured" /></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-3 h-32 w-full sm:h-40" role="img" aria-label={`Heart rate trend, currently ${current} bpm`}>
        <line x1="0" x2={W} y1={baseY} y2={baseY} className="stroke-muted-foreground/40" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        <path d={`${path} L${W},${H} L0,${H} Z`} className="fill-primary/10" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between label-mono"><span>−90 s</span><span>personal avg · {BASELINE.hr}</span><span>now</span></div>
    </Panel>
  );
}
