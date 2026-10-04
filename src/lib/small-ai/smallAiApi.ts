import { LocalSmallAIProvider } from "./localSmallAI";
import type { InferenceLocation, SmallAIInference, SmallAIInput, SmallAIProvider } from "./types";

const TIMEOUT_MS = 2500;
const baseUrl = (): string | undefined =>
  (import.meta.env['VITE_SMALL_AI_API_URL'] as string | undefined) || undefined;

async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
  const url = baseUrl();
  if (!url) throw new Error("Small AI API not configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.replace(/\/$/, "") + path, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

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

export class RemoteSmallAIProvider implements SmallAIProvider {
  async infer(input: SmallAIInput) {
    const data = await fetchJson("/infer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!isInference(data)) throw new Error("Malformed inference response");
    return data;
  }
}

const local = new LocalSmallAIProvider();
const remote = new RemoteSmallAIProvider();

export type InferResult = { inference: SmallAIInference; location: InferenceLocation; fallback: boolean };

/** Single entry point for UI. Falls back to local browser inference on any failure. */
export const smallAi = {
  isRemoteConfigured: () => Boolean(baseUrl()),
  async health(): Promise<{ ok: boolean; model?: string; version?: string }> {
    try {
      const d = (await fetchJson("/health")) as { ok?: boolean; model?: string; version?: string };
      return { ok: Boolean(d?.ok), model: d?.model, version: d?.version };
    } catch {
      return { ok: false };
    }
  },
  async infer(input: SmallAIInput, opts: { forceLocal?: boolean } = {}): Promise<InferResult> {
    if (opts.forceLocal || !baseUrl()) {
      return { inference: await local.infer(input), location: "local", fallback: false };
    }
    try {
      return { inference: await remote.infer(input), location: "remote", fallback: false };
    } catch {
      return { inference: await local.infer(input), location: "local", fallback: true };
    }
  },
};
