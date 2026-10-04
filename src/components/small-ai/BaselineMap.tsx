import type { DemoEngine } from "@/hooks/useDemoEngine";
import { Panel } from "./primitives";

const N = 46;
const R = 46; // radius that corresponds to anomaly score ≈ 1 (edge of "your normal")
const CX = 130, CY = 110;
const CLUSTER = Array.from({ length: N }, (_, k) => {
  const r = Math.sqrt((k + 0.5) / N) * R * 0.92;
  const a = k * 2.399963;
  return { x: Math.round((CX + r * Math.cos(a)) * 100) / 100, y: Math.round((CY + r * Math.sin(a) * 0.8) * 100) / 100 };
});

export function BaselineMap({ e }: { e: DemoEngine }) {
  const inf = e.result?.inference;
  const insufficient = inf?.state === "insufficient_data";
  const f = e.frame.features;
  const pc1 = -f.hrv_delta + f.rhr_delta + f.temp_delta;
  const pc2 = f.sleep_debt + f.sleep_fragmentation + f.resp_delta - f.activity_load;
  const norm = Math.hypot(pc1, pc2) || 1;
  const dist = Math.min((inf?.anomaly_score ?? 0) * 2.5, 2.4) * R;
  const tx = CX + (pc1 / norm) * dist;
  const ty = CY - (pc2 / norm) * dist * 0.8;
  const outside = inf && inf.state !== "within_personal_pattern" && !insufficient;

  return (
    <Panel title="Personal baseline" right={<span className="label-mono">your 30-day normal</span>}>
      <svg viewBox="0 0 280 220" className="h-auto w-full" role="img" aria-label={outside ? "Today is outside your normal pattern" : "Today is within your normal pattern"}>
        <ellipse cx={CX} cy={CY} rx={R + 6} ry={(R + 6) * 0.8} className="fill-measured/5 stroke-measured/40" strokeDasharray="3 4" />
        {CLUSTER.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.6" className="fill-measured/70" />)}
        <text x={CX} y={CY + R * 0.8 + 22} textAnchor="middle" className="fill-measured font-mono text-[9px] tracking-[0.2em]">YOUR NORMAL</text>
        {!insufficient && (
          <g style={{ transform: `translate(${tx}px, ${ty}px)`, transition: "transform 400ms ease-out" }}>
            <line x1="-6" y1="-6" x2="6" y2="6" className={outside ? "stroke-primary" : "stroke-foreground"} strokeWidth="2.5" />
            <line x1="-6" y1="6" x2="6" y2="-6" className={outside ? "stroke-primary" : "stroke-foreground"} strokeWidth="2.5" />
            <text x="10" y="4" className={`font-mono text-[10px] ${outside ? "fill-primary" : "fill-foreground"}`}>TODAY</text>
          </g>
        )}
        {insufficient && <text x={CX} y={30} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">TODAY: NOT ENOUGH DATA TO PLACE</text>}
      </svg>
      <p className="text-sm text-muted-foreground">HerPattern compares the <em>combination</em> of signals against your own baseline — not a population threshold.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border p-3 text-xs">
        <div className="col-span-2 label-mono">Same reading, different people · HRV 48 ms</div>
        <div><div className="font-medium">Person A</div><div className="text-ok">within baseline</div></div>
        <div><div className="font-medium">Person B</div><div className="text-primary">outside baseline</div></div>
      </div>
    </Panel>
  );
}
