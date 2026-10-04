import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FRAME_COUNT, getScenario, hrSample, type ScenarioFrame } from "@/data/small-ai/demoScenario";
import { inferLocal } from "@/lib/small-ai/localSmallAI";
import { smallAi, type InferResult } from "@/lib/small-ai/smallAiApi";
import { getHerPatternApi } from "@/lib/small-ai/herPatternApi";
import { loadQueue, saveQueue, type QueuedEvent, type QueuedEventType } from "@/lib/small-ai/queue";
import type { FeatureKey, SmallAIInput } from "@/lib/small-ai/types";

export type DemoPhase =
  | "idle" | "baseline" | "streaming" | "pattern_changing" | "anomaly_detected"
  | "question_required" | "question_answered" | "continuity_ready" | "offline"
  | "queued" | "syncing" | "complete" | "insufficient_data" | "error";

export type Connectivity = "online" | "weak" | "offline" | "restoring";
export type ScenarioParam = "journey" | "normal" | "changed" | "missing-data";
export type Speed = 1 | 4 | 12;

export type TimelineItem = { id: string; at: string; label: string; kind: "measured" | "derived" | "reported" | "system" };

export type ContinuitySnapshot = {
  createdAt: string;
  frame: ScenarioFrame;
  recovery: number;
  confidence: number;
  answer: string | null;
};

const STREAM_PHASES: DemoPhase[] = ["baseline", "streaming", "pattern_changing", "anomaly_detected", "insufficient_data"];
const MISSING_IN_SCENARIO: FeatureKey[] = ["hrv_delta", "sleep_debt", "temp_delta", "resp_delta", "sleep_fragmentation"];
const INTERVAL: Record<Speed, number> = { 1: 800, 4: 200, 12: 70 };
const HR_WINDOW = 90;

export function buildInput(frame: ScenarioFrame, dataMissing: boolean, pain: string | null): SmallAIInput {
  const values = { ...frame.features } as SmallAIInput["values"];
  if (dataMissing) MISSING_IN_SCENARIO.forEach((f) => (values[f] = null));
  return { values, context: { pain, medication_taken: true, unusual_meal: null } };
}

function initialHr(frame: ScenarioFrame) {
  return Array.from({ length: HR_WINDOW }, (_, i) => hrSample(frame, i));
}

export function useDemoEngine({ judge, scenarioParam }: { judge: boolean; scenarioParam: ScenarioParam }) {
  const kind = scenarioParam === "normal" ? "normal" : "changed";
  const frames = getScenario(kind);
  const startAt = scenarioParam === "changed" ? 48 : 0;

  const [dataMissing, setDataMissing] = useState(scenarioParam === "missing-data");
  const [frameIndex, setFrameIndex] = useState(startAt);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState<Speed>(4);
  const [hr, setHr] = useState<number[]>(() => initialHr(frames[startAt]));
  const [result, setResult] = useState<InferResult | null>(null);
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [continuity, setContinuity] = useState<ContinuitySnapshot | null>(null);
  const [connectivity, setConnectivity] = useState<Connectivity>("online");
  const [queue, setQueue] = useState<QueuedEvent[]>([]);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const [forceLocal, setForceLocal] = useState(judge);
  const [banner, setBanner] = useState<string | null>(null);
  const [finale, setFinale] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  const frame = frames[frameIndex];
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const connRef = useRef(connectivity);
  connRef.current = connectivity;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const tRef = useRef(HR_WINDOW);
  const runId = useRef(0);
  const seq = useRef(0);
  const inferSeq = useRef(0);
  const attempts = useRef<Record<string, number>>({});
  const flags = useRef({ inference: false, offline: false, restore: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    const rid = runId.current;
    timers.current.push(setTimeout(() => rid === runId.current && fn(), ms));
  };

  // Restore queue from the session (synthetic data only).
  useEffect(() => {
    const q = loadQueue().map((e) => (e.state === "SYNCING" ? { ...e, state: "QUEUED" as const } : e));
    if (q.length) setQueue(q);
  }, []);
  useEffect(() => saveQueue(queue), [queue]);

  const addTimeline = useCallback((label: string, kind: TimelineItem["kind"]) => {
    setTimeline((t) => [...t, { id: `t${runId.current}-${seq.current++}`, at: frameRef.current.timestamp, label, kind }]);
  }, []);

  const patchEvent = (id: string, state: QueuedEvent["state"]) =>
    setQueue((q) => q.map((e) => (e.id === id ? { ...e, state } : e)));

  const syncOne = useCallback(async (e: QueuedEvent) => {
    const rid = runId.current;
    patchEvent(e.id, "SYNCING");
    attempts.current[e.id] = (attempts.current[e.id] ?? 0) + 1;
    const failFirst = connRef.current === "weak" && attempts.current[e.id] === 1;
    try {
      await getHerPatternApi({ realMode: false }).syncEvent(e, { failFirst });
      if (rid === runId.current) patchEvent(e.id, "SYNCED");
      return true;
    } catch {
      if (rid === runId.current) patchEvent(e.id, "FAILED");
      return false;
    }
  }, []);

  const addEvent = useCallback((type: QueuedEventType, payload: unknown) => {
    const ev: QueuedEvent = {
      id: `${type}-${runId.current}-${seq.current++}`,
      type,
      timestamp: frameRef.current.timestamp,
      payload,
      state: connRef.current === "offline" || connRef.current === "restoring" ? "QUEUED" : "LOCAL",
    };
    setQueue((q) => [...q, ev]);
    if (ev.state === "LOCAL") void syncOne(ev);
  }, [syncOne]);

  // Replay ticker — single interval, cleared on pause/speed change.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setFrameIndex((i) => Math.min(i + 1, FRAME_COUNT - 1));
      setHr((prev) => {
        const f = frameRef.current;
        const a = hrSample(f, tRef.current++);
        const b = hrSample(f, tRef.current++);
        return [...prev.slice(-(HR_WINDOW - 2)), a, b];
      });
    }, judge ? INTERVAL[4] : INTERVAL[speed]);
    return () => clearInterval(id);
  }, [running, speed, judge]);

  useEffect(() => {
    if (running && frameIndex >= FRAME_COUNT - 1) setRunning(false);
  }, [running, frameIndex]);

  // Inference on every frame. Offline or forced → local browser model.
  useEffect(() => {
    const id = ++inferSeq.current;
    const input = buildInput(frame, dataMissing, answer);
    void smallAi
      .infer(input, { forceLocal: forceLocal || connectivity !== "online" })
      .then((r) => id === inferSeq.current && setResult(r))
      .catch(() => id === inferSeq.current && setResult({ inference: inferLocal(input), location: "local", fallback: true }));
  }, [frame, dataMissing, answer, forceLocal, connectivity]);

  // Phase derivation from inference output.
  useEffect(() => {
    if (!result || !started) return;
    const s = result.inference.state;
    const last = frameIndex >= FRAME_COUNT - 1;
    setPhase((p) => {
      if (!STREAM_PHASES.includes(p)) return p;
      if (s === "insufficient_data") return "insufficient_data";
      if (last && result.inference.question && !answer) return "question_required";
      if (last && s === "within_personal_pattern") return "complete";
      if (frameIndex - startAt < 8) return "baseline";
      return s === "within_personal_pattern" ? "streaming" : s === "changed" ? "pattern_changing" : "anomaly_detected";
    });
  }, [result, frameIndex, started, answer, startAt]);

  useEffect(() => {
    if (phase === "question_required") setRunning(false);
    if (phase === "anomaly_detected" && !flags.current.inference && result) {
      flags.current.inference = true;
      addTimeline("Pattern strongly changed vs. personal baseline", "derived");
      addEvent("inference", { state: result.inference.state, recovery: result.inference.recovery_score, model: result.inference.model_version });
    }
  }, [phase, result, addEvent, addTimeline]);

  const restoreConnection = useCallback(async () => {
    const rid = runId.current;
    setConnectivity("restoring");
    addTimeline("Connection restored", "system");
    const pending = queueRef.current.filter((e) => e.state === "QUEUED" || e.state === "FAILED");
    setSyncProgress({ done: 0, total: pending.length });
    let done = 0;
    for (const e of pending) {
      const ok = await syncOne(e);
      if (rid !== runId.current) return;
      if (ok) setSyncProgress({ done: ++done, total: pending.length });
    }
    setConnectivity("online");
    addTimeline(`${done} records synced to HerPattern`, "system");
  }, [syncOne, addTimeline]);

  const retryFailed = useCallback(async () => {
    for (const e of queueRef.current.filter((x) => x.state === "FAILED")) await syncOne(e);
  }, [syncOne]);

  const setConn = useCallback((c: Connectivity) => {
    if (c === "online" && connRef.current !== "online") return void restoreConnection();
    setConnectivity(c);
    if (c === "offline") addTimeline("Cloud unreachable — continuing locally", "system");
  }, [restoreConnection, addTimeline]);

  // Judge Mode orchestration (deterministic).
  useEffect(() => {
    if (!judge || !started) return;
    if (frameIndex - startAt >= 20 && !flags.current.offline) {
      flags.current.offline = true;
      setBanner("SIMULATING POOR CONNECTION");
      setConnectivity("offline");
      addTimeline("Cloud unreachable — continuing locally", "system");
      later(() => setBanner(null), 2600);
    }
  }, [judge, started, frameIndex, startAt, addTimeline]);

  useEffect(() => {
    if (judge && continuity && !flags.current.restore) {
      flags.current.restore = true;
      later(() => void restoreConnection().then(() => later(() => setFinale(true), 500)), 1800);
    }
  }, [judge, continuity, restoreConnection]);

  // Complete once continuity exists and everything is synced.
  useEffect(() => {
    if (continuity && connectivity === "online" && queue.length > 0 && queue.every((e) => e.state === "SYNCED")) {
      setPhase("complete");
    }
  }, [continuity, connectivity, queue]);

  const buildContinuity = useCallback((ans: string | null) => {
    const r = result?.inference;
    const snap: ContinuitySnapshot = {
      createdAt: frameRef.current.timestamp,
      frame: frameRef.current,
      recovery: r?.recovery_score ?? 0,
      confidence: Math.max(0, (r?.confidence ?? 0) - 0.04),
      answer: ans,
    };
    setContinuity(snap);
    setPhase("continuity_ready");
    addTimeline("Continuity summary created", "derived");
    addEvent("continuity_record", { range: "72h", recovery: snap.recovery, answer: ans });
  }, [result, addEvent, addTimeline]);

  const answerQuestion = useCallback((opt: string | null) => {
    const value = opt ?? "declined";
    setAnswer(value);
    setPhase("question_answered");
    if (opt) {
      addTimeline(`Pelvic pain today: ${opt} (self-reported)`, "reported");
      addEvent("symptom", { question: "pelvic_pain_today", answer: opt, source: "SELF_REPORTED" });
    } else addTimeline("Question declined", "reported");
    later(() => buildContinuity(opt), 900);
  }, [addEvent, addTimeline, buildContinuity]);

  const reset = useCallback(() => {
    runId.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    flags.current = { inference: false, offline: false, restore: false };
    attempts.current = {};
    tRef.current = HR_WINDOW;
    setRunning(false);
    setStarted(false);
    setFrameIndex(startAt);
    setHr(initialHr(frames[startAt]));
    setPhase("idle");
    setAnswer(null);
    setContinuity(null);
    setConnectivity("online");
    setQueue([]);
    setSyncProgress(null);
    setBanner(null);
    setFinale(false);
    setTimeline([]);
    setDataMissing(scenarioParam === "missing-data");
  }, [frames, startAt, scenarioParam]);

  const start = useCallback(() => {
    reset();
    setStarted(true);
    setPhase("baseline");
    setRunning(true);
  }, [reset]);

  const velocity = useMemo(() => {
    if (!result || result.inference.state === "insufficient_data") return 0;
    const prev = inferLocal(buildInput(frames[Math.max(0, frameIndex - 24)], false, "known"));
    return Math.round(((result.inference.recovery_score - prev.recovery_score) / prev.recovery_score) * 100);
  }, [result, frames, frameIndex]);

  const restoreData = useCallback(() => {
    setDataMissing(false);
    addTimeline("Sensor data restored", "system");
  }, [addTimeline]);

  const displayPhase: DemoPhase =
    connectivity === "restoring" ? "syncing"
    : phase === "continuity_ready" && queue.some((e) => e.state === "QUEUED") ? "queued"
    : connectivity === "offline" && STREAM_PHASES.includes(phase) && phase !== "insufficient_data" && started ? phase
    : phase;

  return {
    judge, frames, frame, frameIndex, startAt, running, started, speed, hr, result, phase: displayPhase,
    answer, continuity, connectivity, queue, syncProgress, forceLocal, banner, finale, timeline,
    dataMissing, velocity,
    start, reset,
    pause: () => setRunning(false),
    resume: () => started && frameIndex < FRAME_COUNT - 1 && phase !== "question_required" && setRunning(true),
    setSpeed, setForceLocal, setConn, restoreConnection, retryFailed, answerQuestion, restoreData,
    setDataMissing, dismissFinale: () => setFinale(false),
  };
}

export type DemoEngine = ReturnType<typeof useDemoEngine>;
