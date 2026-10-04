import {
  FEATURES,
  MODEL_VERSION,
  type FeatureKey,
  type SmallAIInference,
  type SmallAIInput,
  type SmallAIProvider,
} from "./types";

// Per-feature weights of the personal-baseline deviation model.
const WEIGHTS: Record<FeatureKey, number> = {
  hrv_delta: 1.0,
  rhr_delta: 0.9,
  sleep_debt: 0.8,
  sleep_fragmentation: 0.6,
  activity_load: 0.3,
  temp_delta: 0.7,
  resp_delta: 0.6,
};

const CORE_FEATURES: FeatureKey[] = ["hrv_delta", "sleep_debt", "temp_delta", "resp_delta"];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Pure, deterministic, dependency-free Small AI inference. Runs in the browser. */
export function inferLocal(input: SmallAIInput): SmallAIInference {
  const missing = FEATURES.filter((f) => input.values[f] == null);
  const present = FEATURES.filter((f) => input.values[f] != null);
  const coverage = present.reduce((s, f) => s + WEIGHTS[f], 0) /
    FEATURES.reduce((s, f) => s + WEIGHTS[f], 0);
  const coreMissing = CORE_FEATURES.filter((f) => missing.includes(f)).length;

  if (coreMissing >= 3 || coverage < 0.5) {
    return {
      state: "insufficient_data",
      anomaly_score: 0,
      recovery_score: 0,
      stress_score: 0,
      confidence: Math.round(coverage * 40) / 100,
      top_contributors: [],
      missing_features: missing,
      model_version: MODEL_VERSION,
      question: null,
    };
  }

  let weighted = 0;
  let wsum = 0;
  const parts: Array<{ feature: FeatureKey; energy: number; z: number }> = [];
  for (const f of present) {
    const z = input.values[f] as number;
    const e = WEIGHTS[f] * z * z;
    weighted += e;
    wsum += WEIGHTS[f];
    parts.push({ feature: f, energy: e, z });
  }
  const score = Math.sqrt(weighted / Math.max(wsum, 1e-6));
  const total = parts.reduce((s, p) => s + p.energy, 0) || 1;

  const state: SmallAIInference["state"] =
    score >= 1.9 ? "strongly_changed" : score >= 1.0 ? "changed" : "within_personal_pattern";

  const top = parts
    .map((p) => ({ feature: p.feature, contribution: Math.round((p.energy / total) * 1000) / 1000 * Math.sign(p.z || 1) }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const needsQuestion = state !== "within_personal_pattern" && input.context.pain == null;

  return {
    state,
    anomaly_score: Math.round(clamp(score / 2.5, 0, 1) * 100) / 100,
    recovery_score: Math.round(clamp(82 - 10 * score, 5, 99)),
    stress_score: Math.round(clamp(20 + 18 * score, 0, 100)),
    confidence: Math.round(clamp(coverage * 0.9 - (missing.length ? 0.04 : 0), 0, 1) * 100) / 100,
    top_contributors: top,
    missing_features: missing,
    model_version: MODEL_VERSION,
    question: needsQuestion
      ? {
          id: "pelvic_pain_today",
          text_en: "Was your pelvic pain stronger today?",
          text_uk: "Чи був ваш тазовий біль сильнішим сьогодні?",
          options: ["No", "Mild", "Moderate", "Strong"],
        }
      : null,
  };
}

export class LocalSmallAIProvider implements SmallAIProvider {
  async infer(input: SmallAIInput) {
    return inferLocal(input);
  }
}
