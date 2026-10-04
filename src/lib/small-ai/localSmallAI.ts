import {
  FEATURES,
  MODEL_VERSION,
  type FeatureKey,
  type SmallAIInference,
  type SmallAIInput,
  type SmallAIProvider,
} from "./types";

// Official HerPattern Pocket Small AI model (HerPatternPocketPCA v0.1.0).
// Same artifact and math as on_device/small_ai.ts in the HerPattern Small AI
// package — a personalized unsupervised PCA anomaly detector, not an LLM.
const MODEL = {
  name: "HerPatternPocketPCA",
  version: MODEL_VERSION,
  feature_order: FEATURES as readonly FeatureKey[],
  mean: [-0.02585492, 0.01366517, 0.13331769, 0.20375764, 0.0140284, -0.00658185, -0.03875145],
  std: [0.4953594, 0.50998599, 0.40092852, 0.3483197, 0.52207318, 0.37202139, 0.41210065],
  components: [
    [-0.06076108, 0.46141707, -0.45212685, -0.40112068, 0.1854213, 0.56616642, -0.25131739],
    [-0.70514364, 0.2644153, 0.35935507, 0.05509873, -0.44889125, 0.04338892, -0.31192805],
    [0.28663706, -0.5222036, -0.15764876, -0.19414583, -0.51075268, 0.11348919, -0.55574164],
  ],
  reconstruction_threshold: 1.3168175203174426,
  reconstruction_scale: 0.3679995960261228,
  recovery_weights: {
    hrv_delta: 1.2,
    rhr_delta: 1.0,
    sleep_debt: 1.3,
    sleep_fragmentation: 1.0,
    activity_load: 0.5,
    temp_delta: 0.8,
    resp_delta: 0.7,
  } as Record<FeatureKey, number>,
};

const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))));
const clip = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

function dot(a: readonly number[], b: readonly number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

/** Pure, deterministic, dependency-free Small AI inference. Runs in the browser. */
export function inferLocal(input: SmallAIInput): SmallAIInference {
  const m = MODEL;
  const missing = m.feature_order.filter((f) => input.values[f] == null);

  const x = m.feature_order.map((f, i) => (input.values[f] == null ? m.mean[i] : Number(input.values[f])));
  const z = x.map((v, i) => (v - m.mean[i]) / Math.max(1e-8, m.std[i]));

  // PCA projection + reconstruction.
  const latent = m.components.map((row) => dot(row, z));
  const recon = m.feature_order.map((_, j) => m.components.reduce((s, row, i) => s + (row[j] ?? 0) * (latent[i] ?? 0), 0));

  const reconError = z.reduce((s, v, i) => s + (v - (recon[i] ?? 0)) ** 2, 0) / z.length;
  const zDistance = z.reduce((s, v) => s + v * v, 0) / z.length;

  const reconSignal = sigmoid((reconError - m.reconstruction_threshold) / Math.max(m.reconstruction_scale, 0.05));
  const distanceSignal = sigmoid((zDistance - 1.5) / 0.55);
  const anomaly = clip(0.25 * reconSignal + 0.75 * distanceSignal, 0, 1);

  const idx = Object.fromEntries(m.feature_order.map((f, i) => [f, i])) as Record<FeatureKey, number>;
  const zOf = (f: FeatureKey) => z[idx[f] ?? 0] ?? 0;
  const c: Partial<Record<FeatureKey, number>> = {};
  const add = (f: FeatureKey, amount: number) => {
    c[f] = Math.max(0, amount) * (m.recovery_weights[f] ?? 1);
  };

  add("hrv_delta", -zOf("hrv_delta"));
  add("rhr_delta", zOf("rhr_delta"));
  add("sleep_debt", zOf("sleep_debt"));
  add("sleep_fragmentation", zOf("sleep_fragmentation"));
  add("activity_load", Math.abs(zOf("activity_load")) * 0.5);
  add("temp_delta", Math.abs(zOf("temp_delta")));
  add("resp_delta", Math.abs(zOf("resp_delta")));

  const rawStress = Object.values(c).reduce((a, b) => a + b, 0);
  const stress = 100 * (1 - Math.exp(-rawStress / 5));
  const recovery = 100 - stress;

  const coverage = 1 - missing.length / m.feature_order.length;
  const decisiveness = Math.abs(anomaly - 0.5) * 2;
  const confidence = clip(0.45 + 0.45 * coverage + 0.1 * decisiveness, 0, 1);

  let state: SmallAIInference["state"];
  if (coverage < 0.45) state = "insufficient_data";
  else if (anomaly >= 0.75) state = "strongly_changed";
  else if (anomaly >= 0.58) state = "changed";
  else state = "within_personal_pattern";

  const topContributors = (Object.entries(c) as Array<[FeatureKey, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([feature, contribution]) => ({ feature, contribution: round2(contribution) }));

  const needsQuestion = state !== "within_personal_pattern" && state !== "insufficient_data" && input.context.pain == null;

  return {
    state,
    anomaly_score: round2(anomaly),
    recovery_score: Math.round(recovery),
    stress_score: Math.round(stress),
    confidence: round2(confidence),
    top_contributors: topContributors,
    missing_features: missing,
    model_version: m.version,
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
