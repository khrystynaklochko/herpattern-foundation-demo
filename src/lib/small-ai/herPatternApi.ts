import { syncHerPatternEvent } from "@/lib/herpattern.functions";
import type { QueuedEvent } from "./queue";

export type SyncAck = { id: string; ok: boolean; ack: "herpattern" | "demo" };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends events to the real HerPattern platform through a secured server
 * function (keys live only on the server). If the platform isn't configured,
 * a deterministic acknowledgement keeps the demo flowing.
 */
export async function syncEvent(e: QueuedEvent, opts: { failFirst?: boolean } = {}): Promise<SyncAck> {
  if (opts.failFirst) {
    await wait(650);
    throw new Error("Weak connection: sync timed out");
  }
  const started = Date.now();
  let res: Awaited<ReturnType<typeof syncHerPatternEvent>>;
  try {
    res = await syncHerPatternEvent({
      data: { id: e.id, type: e.type, timestamp: e.timestamp, payload: (e.payload ?? null) as Record<string, unknown> | null },
    });
  } catch {
    throw new Error("HerPattern unreachable");
  }
  const elapsed = Date.now() - started;
  if (elapsed < 500) await wait(500 - elapsed); // keep sync animation readable
  if (!res.configured) return { id: e.id, ok: true, ack: "demo" };
  if (!res.ok) throw new Error("HerPattern rejected the record");
  return { id: e.id, ok: true, ack: "herpattern" };
}
