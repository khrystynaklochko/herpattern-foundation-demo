export type QueuedEventType = "sensor_summary" | "inference" | "symptom" | "continuity_record";
export type QueuedEventState = "LOCAL" | "QUEUED" | "SYNCING" | "SYNCED" | "FAILED";

export type QueuedEvent = {
  id: string;
  type: QueuedEventType;
  timestamp: string;
  payload: unknown;
  state: QueuedEventState;
};

const KEY = "herpattern-small-ai-demo-queue";

export function loadQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQueue(q: QueuedEvent[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export const EVENT_LABELS: Record<QueuedEventType, string> = {
  sensor_summary: "sensor summary",
  inference: "recovery inference",
  symptom: "symptom response",
  continuity_record: "continuity record",
};
