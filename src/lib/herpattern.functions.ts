import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// All HerPattern / Small AI credentials stay on the server. The browser only
// ever talks to these server functions — keys never reach the client bundle.

const TIMEOUT_MS = 4000;

async function callUpstream(base: string, key: string | undefined, path: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const headers = new Headers(init?.headers);
    if (key) headers.set("Authorization", `Bearer ${key}`);
    headers.set("Accept", "application/json");
    return await fetch(base.replace(/\/$/, "") + path, { ...init, headers, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function httpsOnly(url: string | undefined) {
  return url && url.startsWith("https://") ? url : undefined;
}

export const getHerPatternStatus = createServerFn({ method: "GET" }).handler(async () => {
  const url = httpsOnly(process.env["HERPATTERN_API_URL"]);
  const key = process.env["HERPATTERN_API_KEY"];
  const aiUrl = httpsOnly(process.env["SMALL_AI_API_URL"]);
  let herpattern: "connected" | "unreachable" | "not_configured" = "not_configured";
  let smallAi: "connected" | "unreachable" | "not_configured" = "not_configured";
  if (url && key) {
    try {
      herpattern = (await callUpstream(url, key, "/health")).ok ? "connected" : "unreachable";
    } catch {
      herpattern = "unreachable";
    }
  }
  if (aiUrl) {
    try {
      smallAi = (await callUpstream(aiUrl, process.env["SMALL_AI_API_KEY"], "/health")).ok ? "connected" : "unreachable";
    } catch {
      smallAi = "unreachable";
    }
  }
  return { herpattern, smallAi };
});

const EventSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(["sensor_summary", "inference", "symptom", "continuity_record"]),
  timestamp: z.string().max(40),
  payload: z.record(z.unknown()).or(z.null()).optional(),
});

export const syncHerPatternEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => EventSchema.parse(d))
  .handler(async ({ data }) => {
    const url = httpsOnly(process.env["HERPATTERN_API_URL"]);
    const key = process.env["HERPATTERN_API_KEY"];
    if (!url || !key) return { ok: false as const, configured: false as const };
    try {
      const res = await callUpstream(url, key, "/events", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": data.id },
        body: JSON.stringify({ ...data, origin: "small-ai-demo" }),
      });
      return { ok: res.ok, configured: true as const, status: res.status };
    } catch {
      return { ok: false as const, configured: true as const, status: 0 };
    }
  });

const InferSchema = z.object({
  values: z.record(z.number().nullable()),
  context: z.object({
    pain: z.string().max(40).nullable(),
    medication_taken: z.boolean().nullable(),
    unusual_meal: z.boolean().nullable(),
  }),
});

export const remoteInfer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InferSchema.parse(d))
  .handler(async ({ data }) => {
    const url = httpsOnly(process.env["SMALL_AI_API_URL"]);
    if (!url) return { configured: false as const, result: null };
    const res = await callUpstream(url, process.env["SMALL_AI_API_KEY"], "/infer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Small AI service error ${res.status}`);
    return { configured: true as const, result: (await res.json()) as unknown };
  });
