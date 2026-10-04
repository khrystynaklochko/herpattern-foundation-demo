import { useMemo, useState } from "react";
import { Watch, Smartphone } from "lucide-react";
import type { DemoEngine } from "@/hooks/useDemoEngine";
import { buildInput } from "@/hooks/useDemoEngine";
import { inferLocal } from "@/lib/small-ai/localSmallAI";
import { BASELINE } from "@/data/small-ai/demoScenario";
import { Panel } from "./primitives";

type Device = "watch" | "phone";

export function DeviceSkins({ e }: { e: DemoEngine }) {
  const [device, setDevice] = useState<Device>("watch");
  return (
    <Panel
      title="On device"
      right={
        <div className="flex gap-1 rounded-full border p-0.5">
          {([["watch", Watch, "Apple Watch"], ["phone", Smartphone, "iPhone"]] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setDevice(id)} aria-pressed={device === id}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${device === id ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
              <Icon className="size-3.5" />{label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex justify-center py-2">{device === "watch" ? <AppleWatch e={e} /> : <IPhone e={e} />}</div>
    </Panel>
  );
}

/* ---------- shared derived data ---------- */
function useWatchData(e: DemoEngine) {
  const inf = e.result?.inference;
  const series = useMemo(() => {
    const out: number[] = [];
    for (let i = e.startAt; i <= e.frameIndex; i++) {
      out.push(inferLocal(buildInput(e.frames[i]!, false, "known")).anomaly_score);
    }
    return out;
  }, [e.frames, e.frameIndex, e.startAt]);
  const level = !inf || inf.state === "insufficient_data" ? "unknown" : inf.state === "within_personal_pattern" ? "low" : inf.state === "changed" ? "moderate" : "elevated";
  const time = e.frame.timestamp.slice(11, 16);
  return { inf, series, level, time, burden: inf?.anomaly_score ?? 0 };
}

/* ---------- Apple Watch ---------- */
const SCREENS = ["pattern", "prediction", "vitals"] as const;

function AppleWatch({ e }: { e: DemoEngine }) {
  const [screen, setScreen] = useState(0);
  const d = useWatchData(e);
  const askQuestion = e.phase === "question_required" && d.inf?.question;
  const next = () => setScreen((s) => (s + 1) % SCREENS.length);

  return (
    <div className="relative" aria-label="Apple Watch preview">
      {/* band hints */}
      <div className="absolute left-1/2 top-[-28px] h-8 w-[62%] -translate-x-1/2 rounded-t-3xl bg-[oklch(0.22_0.01_30)]" />
      <div className="absolute bottom-[-28px] left-1/2 h-8 w-[62%] -translate-x-1/2 rounded-b-3xl bg-[oklch(0.22_0.01_30)]" />
      {/* digital crown */}
      <button onClick={next} aria-label="Next screen" className="absolute right-[-10px] top-[22%] h-12 w-3 rounded-r-md bg-[oklch(0.35_0.01_30)] shadow-inner" />
      <div className="absolute right-[-6px] top-[48%] h-10 w-2 rounded-r bg-[oklch(0.3_0.01_30)]" />
      <div className="relative h-[330px] w-[270px] rounded-[64px] bg-[oklch(0.2_0.005_30)] p-3 shadow-2xl ring-1 ring-[oklch(0.4_0.01_30)]">
        <div className="relative h-full w-full overflow-hidden rounded-[52px] bg-[oklch(0.08_0_0)] text-[oklch(0.97_0_0)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[oklch(0.3_0.08_350/0.55)] via-[oklch(0.12_0.02_350/0.4)] to-transparent" />
          <div className="relative flex h-full flex-col px-6 pb-5 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[1.05rem] font-semibold tabular-nums">{d.time}</span>
              {e.connectivity !== "online" && <span className="rounded-full bg-[oklch(0.65_0.2_25)] px-2 text-[0.6rem] font-semibold">LOCAL</span>}
            </div>
            {askQuestion ? <WatchQuestion e={e} /> : (
              <button onClick={next} className="flex flex-1 flex-col text-left">
                {SCREENS[screen] === "pattern" && <WatchPattern d={d} />}
                {SCREENS[screen] === "prediction" && <WatchPrediction e={e} d={d} />}
                {SCREENS[screen] === "vitals" && <WatchVitals e={e} />}
              </button>
            )}
            {!askQuestion && (
              <div className="mt-1 flex justify-center gap-1">
                {SCREENS.map((s, i) => <span key={s} className={`size-1.5 rounded-full ${i === screen ? "bg-[oklch(0.97_0_0)]" : "bg-[oklch(0.97_0_0/0.3)]"}`} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const PINK = "oklch(0.78 0.13 350)";
const MINT = "oklch(0.8 0.12 165)";

function WatchPattern({ d }: { d: ReturnType<typeof useWatchData> }) {
  const W = 220, H = 80;
  const pts = d.series.length > 1 ? d.series : [d.series[0] ?? 0, d.series[0] ?? 0];
  const path = pts.map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * W).toFixed(1)},${(H - 12 - v * (H - 20)).toFixed(1)}`).join(" ");
  return (
    <>
      <div className="mt-1 text-[2rem] font-light leading-tight" style={{ color: PINK }}>Pattern</div>
      <div className="flex gap-3 text-[0.65rem] text-[oklch(0.75_0_0)]">
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: PINK }} />Pattern</span>
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: MINT }} />Forecast</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-20 w-full">
        {[0.25, 0.5, 0.75].map((y) => <line key={y} x1="0" x2={W} y1={H * y} y2={H * y} stroke="oklch(1 0 0 / 0.08)" />)}
        <line x1="0" x2={W} y1={H - 12} y2={H - 12} stroke={MINT} strokeWidth="2" />
        <path d={path} fill="none" stroke={PINK} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div className="mt-2 text-[0.65rem] text-[oklch(0.7_0_0)]">Your recent level</div>
      <div className="text-[0.85rem] leading-snug">Recent days are weighted most heavily, then adjusted to your baseline.</div>
    </>
  );
}

function WatchPrediction({ e, d }: { e: DemoEngine; d: ReturnType<typeof useWatchData> }) {
  return (
    <div className="mt-1 space-y-1.5">
      <div className="text-right text-[1.1rem]" style={{ color: PINK }}>Pattern</div>
      <Field k="Prediction" v={`Tomorrow · ${d.level} · burden ${d.burden.toFixed(1)}`} />
      <Field k="Location" v="Pelvic" />
      <Field k="DNA damage" v="Not measured" />
      <p className="text-[0.6rem] leading-snug text-[oklch(0.6_0_0)]">DNA damage is not measured. Prognosis is a pattern outlook.</p>
      <div className="text-[0.65rem] text-[oklch(0.7_0_0)]">Environment · on watch</div>
      <Env e={e} />
    </div>
  );
}

function WatchVitals({ e }: { e: DemoEngine }) {
  const bpm = Math.round(e.hr[e.hr.length - 1]!);
  // heartbeat-style trace built from the live heart-rate samples
  const W = 220, H = 90;
  const beats = e.hr.slice(-8);
  const seg = W / beats.length;
  let path = `M0,${H / 2}`;
  beats.forEach((v, i) => {
    const x = i * seg;
    const amp = 18 + (v - 70) * 0.8;
    path += ` L${x + seg * 0.35},${H / 2} L${x + seg * 0.42},${H / 2 + 4} L${x + seg * 0.5},${H / 2 - amp} L${x + seg * 0.58},${H / 2 + 8} L${x + seg * 0.66},${H / 2} L${x + seg * 0.8},${H / 2 - 4} L${x + seg * 0.9},${H / 2} L${x + seg},${H / 2}`;
  });
  return (
    <div className="mt-1">
      <div className="text-right text-[1.1rem]" style={{ color: PINK }}>Pattern</div>
      <Env e={e} />
      <div className="mt-2 flex items-end justify-between">
        <span className="text-[0.7rem] font-bold text-[oklch(0.65_0.2_25)]">{e.running ? "❚❚" : "▶"}</span>
        <span className="text-[1.6rem] font-semibold tabular-nums">{bpm} <span className="text-[0.75rem] font-normal text-[oklch(0.7_0_0)]">bpm</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[84px] w-full">
        {Array.from({ length: 12 }, (_, i) => <line key={"v" + i} x1={(i * W) / 11} x2={(i * W) / 11} y1="0" y2={H} stroke="oklch(0.55 0.18 20 / 0.55)" strokeWidth="0.6" />)}
        {Array.from({ length: 6 }, (_, i) => <line key={"h" + i} x1="0" x2={W} y1={(i * H) / 5} y2={(i * H) / 5} stroke="oklch(0.55 0.18 20 / 0.55)" strokeWidth="0.6" />)}
        <path d={path} fill="none" stroke={MINT} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function WatchQuestion({ e }: { e: DemoEngine }) {
  const q = e.result?.inference.question;
  if (!q) return null;
  return (
    <div className="mt-2 flex flex-1 flex-col">
      <div className="text-[0.65rem] uppercase tracking-wide" style={{ color: PINK }}>Something changed</div>
      <div className="mt-1 text-[1rem] leading-snug">{q.text_en}</div>
      <div className="mt-auto grid grid-cols-2 gap-1.5">
        {q.options.map((o) => (
          <button key={o} onClick={() => e.answerQuestion(o)} className="rounded-full bg-[oklch(1_0_0/0.14)] py-1.5 text-[0.75rem] font-medium active:bg-[oklch(1_0_0/0.25)]">{o}</button>
        ))}
      </div>
    </div>
  );
}

function Env({ e }: { e: DemoEngine }) {
  const m = e.frame.measured;
  return (
    <div className="grid grid-cols-3 gap-1">
      <Stat v={`${(36.6 + m.tempDelta).toFixed(1)}°`} k="Temp" />
      <Stat v={`${Math.round(m.resp)}`} k="Breath" />
      <Stat v={m.activityRel < -15 ? "Down" : "Up"} k="Activity" />
    </div>
  );
}
const Stat = ({ v, k }: { v: string; k: string }) => (
  <div><div className="text-[0.95rem] font-semibold">{v}</div><div className="text-[0.6rem] text-[oklch(0.65_0_0)]">{k}</div></div>
);
const Field = ({ k, v }: { k: string; v: string }) => (
  <div><div className="text-[0.65rem] text-[oklch(0.7_0_0)]">{k}</div><div className="text-[0.95rem] leading-tight">{v}</div></div>
);

/* ---------- iPhone ---------- */
function IPhone({ e }: { e: DemoEngine }) {
  const d = useWatchData(e);
  const inf = d.inf;
  const askQuestion = e.phase === "question_required" && inf?.question;
  const waiting = e.queue.filter((q) => q.state === "QUEUED" || q.state === "FAILED").length;
  return (
    <div className="relative h-[520px] w-[256px] rounded-[44px] bg-[oklch(0.2_0.005_30)] p-2.5 shadow-2xl ring-1 ring-[oklch(0.4_0.01_30)]" aria-label="iPhone preview">
      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-[oklch(0.08_0_0)] text-[oklch(0.97_0_0)]">
        <div className="absolute left-1/2 top-2 h-6 w-20 -translate-x-1/2 rounded-full bg-[oklch(0_0_0)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[oklch(0.3_0.08_350/0.5)] to-transparent" />
        <div className="relative flex h-full flex-col gap-3 px-4 pb-4 pt-10 text-sm">
          <div className="flex justify-between text-xs font-semibold"><span>{d.time}</span><span>{e.connectivity === "online" ? "●●●● 5G" : "No signal"}</span></div>
          <div className="text-2xl font-light" style={{ color: PINK }}>Pattern</div>
          <div className="rounded-2xl bg-[oklch(1_0_0/0.08)] p-3">
            <div className="text-[0.65rem] text-[oklch(0.7_0_0)]">Recovery</div>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-semibold tabular-nums">{inf && inf.state !== "insufficient_data" ? inf.recovery_score : "—"}</span>
              <span className="text-xs" style={{ color: d.level === "low" ? MINT : PINK }}>{d.level === "low" ? "Normal for you" : d.level === "unknown" ? "Not enough data" : "Pattern changed"}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[oklch(1_0_0/0.08)] p-3">
            <Stat v={`${Math.round(e.hr[e.hr.length - 1]!)}`} k="HR bpm" />
            <Stat v={`${e.frame.measured.hrv}`} k="HRV ms" />
            <Stat v={`${e.frame.measured.rhr - BASELINE.rhr >= 0 ? "+" : ""}${e.frame.measured.rhr - BASELINE.rhr}`} k="RHR Δ" />
          </div>
          {askQuestion && inf?.question ? (
            <div className="rounded-2xl border border-[oklch(0.78_0.13_350/0.6)] p-3">
              <div className="text-xs leading-snug">{inf.question.text_en}</div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {inf.question.options.map((o) => <button key={o} onClick={() => e.answerQuestion(o)} className="rounded-full bg-[oklch(1_0_0/0.14)] py-1 text-xs">{o}</button>)}
              </div>
            </div>
          ) : (
            <Field k="Prediction" v={`Tomorrow · ${d.level} · burden ${d.burden.toFixed(1)}`} />
          )}
          <div className="mt-auto rounded-2xl bg-[oklch(1_0_0/0.06)] p-3 text-xs">
            {e.connectivity === "online" ? (waiting ? `${waiting} records waiting` : "Synced with HerPattern") : `Working locally · ${waiting} records saved`}
          </div>
        </div>
      </div>
    </div>
  );
}
