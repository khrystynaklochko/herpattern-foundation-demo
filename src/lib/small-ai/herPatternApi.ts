import type { QueuedEvent } from "./queue";

export type SyncAck = { id: string; ok: boolean; ack: string };

interface HerPatternApi {
  syncEvent(e: QueuedEvent, opts: { failFirst?: boolean }): Promise<SyncAck>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Deterministic mocked acknowledgement — used whenever the real platform is unavailable. */
class DemoHerPatternApi implements HerPatternApi {
  async syncEvent(e: QueuedEvent, opts: { failFirst?: boolean }) {
    await wait(650);
    if (opts.failFirst) throw new Error("Weak connection: sync timed out");
    return { id: e.id, ok: true, ack: `demo-ack-${e.id}` };
  }
}

// Real mode is only used when explicitly enabled AND authenticated; never in public demo.
class RealHerPatternApi implements HerPatternApi {
  constructor(private url: string) {}
  async syncEvent(e: QueuedEvent) {
    const res = await fetch(`${this.url.replace(/\/$/, "")}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(e),
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { id: e.id, ok: true, ack: "server" };
  }
}

export function getHerPatternApi(opts: { realMode: boolean }): HerPatternApi {
  const url = import.meta.env['VITE_HERPATTERN_API_URL'] as string | undefined;
  return opts.realMode && url ? new RealHerPatternApi(url) : new DemoHerPatternApi();
}

export const herPatternApi = {
  syncEvents: (events: QueuedEvent[]) =>
    Promise.all(events.map((e) => getHerPatternApi({ realMode: false }).syncEvent(e, {}))),
  createSymptom: (e: QueuedEvent) => getHerPatternApi({ realMode: false }).syncEvent(e, {}),
  createInference: (e: QueuedEvent) => getHerPatternApi({ realMode: false }).syncEvent(e, {}),
  createContinuityRecord: (e: QueuedEvent) => getHerPatternApi({ realMode: false }).syncEvent(e, {}),
};
