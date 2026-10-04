export const FEATURES = [
  "hrv_delta",
  "rhr_delta",
  "sleep_debt",
  "sleep_fragmentation",
  "activity_load",
  "temp_delta",
  "resp_delta",
] as const;

export type FeatureKey = (typeof FEATURES)[number];

export type SmallAIInput = {
  values: Record<FeatureKey, number | null>;
  context: {
    pain: string | null;
    medication_taken: boolean | null;
    unusual_meal: boolean | null;
  };
};

export type InferenceState =
  | "within_personal_pattern"
  | "changed"
  | "strongly_changed"
  | "insufficient_data";

export type SmallAIInference = {
  state: InferenceState;
  anomaly_score: number;
  recovery_score: number;
  stress_score: number;
  confidence: number;
  top_contributors: Array<{ feature: string; contribution: number }>;
  missing_features: string[];
  model_version: string;
  question?: {
    id: string;
    text_en: string;
    text_uk?: string;
    options: string[];
  } | null;
};

export type InferenceLocation = "local" | "remote";

export interface SmallAIProvider {
  infer(input: SmallAIInput): Promise<SmallAIInference>;
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  hrv_delta: "HRV",
  rhr_delta: "Resting HR",
  sleep_debt: "Sleep",
  sleep_fragmentation: "Sleep fragmentation",
  activity_load: "Activity",
  temp_delta: "Temperature",
  resp_delta: "Respiration",
};

export const MODEL_NAME = "HerPatternPocketPCA";
export const MODEL_VERSION = "0.1.0";
