import type { FeatureKey } from "@/lib/small-ai/types";

/** Personal baseline of the synthetic person (no real patient data). */
export const BASELINE = {
  hr: 74,
  rhr: 61,
  hrv: 54,
  sleepMin: 460, // 7h40
  resp: 14.2,
  sleepHr: 56,
};

export type DataPoint = {
  timestamp: string;
  value: number;
  source: string;
  measurementType: string;
  synthetic: true;
};

export type ScenarioFrame = {
  index: number;
  hoursBeforeNow: number;
  timestamp: string;
  segment: string;
  measured: {
    hr: number;
    rhr: number;
    hrv: number;
    sleepMin: number;
    sleepDeltaMin: number;
    fragmentation: number;
    tempDelta: number;
    resp: number;
    activityRel: number;
    sleepHr: number;
  };
  features: Record<FeatureKey, number>;
  points: DataPoint[];
  synthetic: true;
};

type Key = { sleep: number; frag: number; hrv: number; rhr: number; temp: number; act: number; resp: number };
const K = (i: number, k: Partial<Key>) => ({ i, k: { sleep: 0, frag: 0, hrv: 0, rhr: 0, temp: 0, act: 0, resp: 0, ...k } });

// Gradual emergence of the pattern change across 72 hours.
const KEYFRAMES = [
  K(0, {}),
  K(24, {}),
  K(44, { sleep: -35, hrv: -0.05, rhr: 2 }),
  K(54, { sleep: -84, frag: 1, hrv: -0.08, rhr: 3, resp: 0.15 }),
  K(62, { sleep: -84, frag: 1, hrv: -0.16, rhr: 6, temp: 0.3, act: -0.4, resp: 0.5 }),
  K(71, { sleep: -84, frag: 1.1, hrv: -0.2, rhr: 7, temp: 0.45, act: -0.5, resp: 0.8 }),
];

export const FRAME_COUNT = 72;
const START = Date.UTC(2026, 2, 12, 15, 0, 0);

function interp(i: number): Key {
  for (let n = 0; n < KEYFRAMES.length - 1; n++) {
    const a = KEYFRAMES[n]!, b = KEYFRAMES[n + 1]!;
    if (i >= a.i && i <= b.i) {
      const t = (i - a.i) / (b.i - a.i);
      const out = {} as Key;
      (Object.keys(a.k) as (keyof Key)[]).forEach((key) => (out[key] = a.k[key] + (b.k[key] - a.k[key]) * t));
      return out;
    }
  }
  return KEYFRAMES[KEYFRAMES.length - 1]!.k;
}

function segmentFor(i: number) {
  if (i < 24) return "48–72h before · normal baseline";
  if (i < 48) return "24–48h before · early deviation";
  if (i < 56) return "Previous night";
  if (i < 64) return "Current morning";
  return "Current afternoon";
}

const r1 = (v: number) => Math.round(v * 10) / 10;

function buildFrame(i: number, flat: boolean): ScenarioFrame {
  const k = flat ? interp(0) : interp(i);
  const wob = Math.sin(i * 1.7) * 0.12; // deterministic personal noise
  const ts = new Date(START + i * 3600_000).toISOString();
  const hrv = BASELINE.hrv * (1 + k.hrv) + Math.sin(i * 0.9) * 0.8;
  const rhr = BASELINE.rhr + k.rhr + Math.sin(i * 1.3) * 0.3;
  const resp = BASELINE.resp + k.resp;
  const measured = {
    hr: Math.round(BASELINE.hr + k.rhr * 0.9),
    rhr: Math.round(rhr),
    hrv: Math.round(hrv),
    sleepMin: Math.round(BASELINE.sleepMin + k.sleep),
    sleepDeltaMin: Math.round(k.sleep),
    fragmentation: r1(k.frag),
    tempDelta: r1(k.temp),
    resp: r1(resp),
    activityRel: Math.round(k.act * 100),
    sleepHr: Math.round(BASELINE.sleepHr + k.rhr * 0.7),
  };
  const features: Record<FeatureKey, number> = {
    hrv_delta: r1(k.hrv / 0.06 + wob),
    rhr_delta: r1(k.rhr / 2.5 - wob * 0.5),
    sleep_debt: r1(-k.sleep / 50 + wob * 0.4),
    sleep_fragmentation: r1(k.frag),
    activity_load: r1(k.act),
    temp_delta: r1(k.temp / 0.25),
    resp_delta: r1(k.resp / 0.6),
  };
  const P = (value: number, measurementType: string, source = "Watch"): DataPoint => ({
    timestamp: ts, value, source, measurementType, synthetic: true,
  });
  return {
    index: i,
    hoursBeforeNow: FRAME_COUNT - 1 - i,
    timestamp: ts,
    segment: segmentFor(i),
    measured,
    features,
    points: [
      P(measured.hr, "heart_rate"),
      P(measured.rhr, "resting_heart_rate"),
      P(measured.hrv, "hrv_rmssd"),
      P(measured.sleepMin, "sleep_duration", "Sleep tracker"),
      P(measured.tempDelta, "skin_temperature_delta"),
      P(measured.resp, "respiration_rate"),
      P(measured.activityRel, "activity_load_relative"),
    ],
    synthetic: true,
  };
}

let cache: { changed: ScenarioFrame[]; normal: ScenarioFrame[] } | null = null;

/** Lazily built, fully deterministic 72-hour synthetic journey. */
export function getScenario(kind: "changed" | "normal"): ScenarioFrame[] {
  if (!cache) {
    cache = {
      changed: Array.from({ length: FRAME_COUNT }, (_, i) => buildFrame(i, false)),
      normal: Array.from({ length: FRAME_COUNT }, (_, i) => buildFrame(i, true)),
    };
  }
  return cache[kind];
}

/** Deterministic simulated heart-rate samples (not ECG). */
export function hrSample(frame: ScenarioFrame, t: number) {
  return r1(frame.measured.hr + Math.sin(t * 0.55) * 2.4 + Math.sin(t * 1.9) * 1.1);
}
