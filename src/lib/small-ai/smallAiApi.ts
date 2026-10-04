import { remoteInfer } from "@/lib/herpattern.functions";
import { LocalSmallAIProvider } from "./localSmallAI";
import type { InferenceLocation, SmallAIInference, SmallAIInput } from "./types";

const STATES = ["within_personal_pattern", "changed", "strongly_changed", "insufficient_data"];

function isInference(v: unknown): v is SmallAIInference {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<Record<keyof SmallAIInference, unknown>>;
  return (
    typeof o.state === "string" && STATES.includes(o.state) &&
    typeof o.anomaly_score === "number" &&
    typeof o.recovery_score === "number" &&
    typeof o.stress_score === "number" &&
    typeof o.confidence === "number" &&
    Array.isArray(o.top_contributors) &&
    Array.isArray(o.missing_features) &&
    typeof o.model_version === "string"
  );
}

const local = new LocalSmallAIProvider();
let remoteConfigured: boolean | null = null; // learned from the first server response

export type InferResult = { inference: SmallAIInference; location: InferenceLocation; fallback: boolean };

/** Single entry point for UI. Remote calls go through a secured server function; any failure falls back to local. */
export const smallAi = {
  async infer(input: SmallAIInput, opts: { forceLocal?: boolean } = {}): Promise<InferResult> {
    if (opts.forceLocal || remoteConfigured === false) {
      return { inference: await local.infer(input), location: "local", fallback: false };
    }
    try {
      const res = await remoteInfer({ data: input });
      if (!res.configured) {
        remoteConfigured = false;
        return { inference: await local.infer(input), location: "local", fallback: false };
      }
      remoteConfigured = true;
      if (!isInference(res.result)) throw new Error("Malformed inference response");
      return { inference: res.result, location: "remote", fallback: false };
    } catch {
      return { inference: await local.infer(input), location: "local", fallback: true };
    }
  },
};
