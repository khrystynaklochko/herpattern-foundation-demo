import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DOES = ["learns a personal baseline", "detects multivariate deviation", "explains contributing signals", "works with incomplete data", "asks for missing context"];
const DOES_NOT = ["diagnose endometriosis", "measure DNA damage directly", "prescribe medication", "determine treatment efficacy", "replace a clinician"];

export function SafetyContent() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="label-mono mb-2 text-ok">This AI does</h3>
        <ul className="space-y-1.5 text-sm">{DOES.map((d) => <li key={d} className="flex gap-2"><Check className="size-4 shrink-0 text-ok" />{d}</li>)}</ul>
      </div>
      <div>
        <h3 className="label-mono mb-2 text-primary">This AI does not</h3>
        <ul className="space-y-1.5 text-sm">{DOES_NOT.map((d) => <li key={d} className="flex gap-2"><X className="size-4 shrink-0 text-primary" />{d}</li>)}</ul>
      </div>
    </div>
  );
}

export function SafetyPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle className="font-serif text-3xl font-normal">Safety &amp; scope</DialogTitle></DialogHeader>
        <SafetyContent />
        <p className="text-xs text-muted-foreground">HerPattern organizes personal health context. It does not diagnose or prescribe. All data on this page is synthetic.</p>
      </DialogContent>
    </Dialog>
  );
}
