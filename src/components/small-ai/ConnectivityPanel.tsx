import { useQuery } from "@tanstack/react-query";
import { getHerPatternStatus } from "@/lib/herpattern.functions";
import { Check, Cloud, Loader2, Smartphone, Watch, X } from "lucide-react";
import type { Connectivity, DemoEngine } from "@/hooks/useDemoEngine";
import { Button } from "@/components/ui/button";
import { EVENT_LABELS } from "@/lib/small-ai/queue";
import { Panel } from "./primitives";

const LABEL: Record<Connectivity, string> = { online: "Online", weak: "Weak", offline: "Offline", restoring: "Restoring" };
const DOT: Record<Connectivity, string> = { online: "bg-ok", weak: "bg-warn", offline: "bg-destructive", restoring: "bg-warn animate-pulse-dot" };

export function ConnectivityPanel({ e }: { e: DemoEngine }) {
  const c = e.connectivity;
  const cloudDown = c === "offline" || c === "weak";
  const waiting = e.queue.filter((q) => q.state === "QUEUED" || q.state === "FAILED").length;
  const failed = e.queue.some((q) => q.state === "FAILED");
  const status = useQuery({ queryKey: ["hp-status"], queryFn: () => getHerPatternStatus(), staleTime: 60_000, retry: false });
  const allSynced = e.queue.length > 0 && e.queue.every((q) => q.state === "SYNCED");

  return (
    <Panel title="Connection" right={<span className="flex items-center gap-2 text-sm"><span className={`size-2 rounded-full ${DOT[c]}`} />{LABEL[c]}</span>}>
      {/* Architecture */}
      <div className="flex items-center justify-between gap-1 rounded-lg border bg-background/50 px-3 py-3">
        <Node icon={<Watch className="size-4" />} label="Watch" />
        <Link ok />
        <Node icon={<Smartphone className="size-4" />} label="Device · AI" highlight />
        <Link ok={!cloudDown} pending={c === "restoring"} />
        <Node icon={<Cloud className="size-4" />} label="HerPattern" dim={cloudDown} />
      </div>
      {cloudDown && (
        <p className="mt-3 text-sm"><span className="font-semibold">{c === "offline" ? "Offline." : "Weak connection."}</span> HerPattern is still working locally.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {c === "online" && <>
          <Button size="sm" variant="outline" onClick={() => e.setConn("offline")} disabled={e.judge}>Simulate bad internet</Button>
          <Button size="sm" variant="ghost" onClick={() => e.setConn("weak")} disabled={e.judge}>Weak signal</Button>
        </>}
        {(c === "offline" || c === "weak") && <Button size="sm" onClick={() => void e.restoreConnection()} disabled={e.judge}>Restore connection</Button>}
        {failed && c !== "restoring" && <Button size="sm" variant="outline" onClick={() => void e.retryFailed()}>Retry sync</Button>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[0.65rem] uppercase tracking-wider">
        <ApiBadge label="HerPattern API" s={status.data?.herpattern} />
        <ApiBadge label="Small AI service" s={status.data?.smallAi} />
      </div>

      {/* Queue */}
      <div className="mt-4 border-t pt-3">
        <div className="label-mono mb-2">Local queue</div>
        {e.queue.length === 0 ? (
          <p className="text-xs text-muted-foreground">No records yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {e.queue.map((q) => (
              <li key={q.id} className="flex items-center gap-2">
                {q.state === "SYNCED" ? <Check className="size-3.5 text-ok" /> : q.state === "SYNCING" ? <Loader2 className="size-3.5 animate-spin text-warn" /> : q.state === "FAILED" ? <X className="size-3.5 text-destructive" /> : <Check className="size-3.5 text-muted-foreground" />}
                <span className="flex-1">{EVENT_LABELS[q.type]}</span>
                <span className="font-mono text-[0.65rem] text-muted-foreground">{q.state}</span>
              </li>
            ))}
          </ul>
        )}
        {e.syncProgress && c === "restoring" && (
          <p className="mt-2 font-mono text-xs text-warn">Synchronizing local events… {e.syncProgress.done} / {e.syncProgress.total}</p>
        )}
        {waiting > 0 && c !== "restoring" && <p className="mt-2 font-mono text-xs">{waiting} record{waiting > 1 ? "s" : ""} waiting</p>}
        {allSynced && c === "online" && <p className="mt-2 font-mono text-xs text-ok">{e.queue.length} RECORDS SYNCED ✓</p>}
      </div>
    </Panel>
  );
}

function Node({ icon, label, highlight, dim }: { icon: React.ReactNode; label: string; highlight?: boolean; dim?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 transition-opacity ${dim ? "opacity-35" : ""}`}>
      <div className={`grid size-9 place-items-center rounded-full border ${highlight ? "border-primary text-primary" : ""}`}>{icon}</div>
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

function Link({ ok, pending }: { ok: boolean; pending?: boolean }) {
  return (
    <div className="relative flex flex-1 items-center">
      <div className={`h-px w-full ${ok ? "bg-ok" : pending ? "bg-warn" : "border-t border-dashed border-destructive"}`} />
      {!ok && !pending && <X className="absolute left-1/2 size-4 -translate-x-1/2 text-destructive" />}
    </div>
  );
}

function ApiBadge({ label, s }: { label: string; s: "connected" | "unreachable" | "not_configured" | undefined }) {
  const text = s === "connected" ? "Connected · secure" : s === "unreachable" ? "Unreachable" : s === "not_configured" ? "Not configured" : "Checking…";
  const color = s === "connected" ? "text-ok" : s === "unreachable" ? "text-destructive" : "text-muted-foreground";
  return <div className="rounded border px-2 py-1.5"><div className="text-muted-foreground">{label}</div><div className={color}>{text}</div></div>;
}
