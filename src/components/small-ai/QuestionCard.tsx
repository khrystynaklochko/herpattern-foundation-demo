import type { DemoEngine } from "@/hooks/useDemoEngine";
import { Button } from "@/components/ui/button";

export function QuestionCard({ e }: { e: DemoEngine }) {
  const q = e.result?.inference.question;
  const inf = e.result?.inference;
  if (e.phase !== "question_required" || !q || !inf || inf.state === "within_personal_pattern" || inf.state === "insufficient_data") return null;
  return (
    <section role="dialog" aria-labelledby="hp-q" className="animate-in fade-in slide-in-from-bottom-4 rounded-xl border-2 border-primary/60 bg-card p-5 shadow-2xl shadow-primary/10">
      <div className="label-mono text-primary">HerPattern noticed something different</div>
      <p className="mt-1 text-sm text-muted-foreground">One answer would help.</p>
      <h3 id="hp-q" className="mt-3 font-serif text-3xl">{q.text_en}</h3>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {q.options.map((o) => (
          <Button key={o} variant={o === "Strong" ? "default" : "secondary"} size="lg" onClick={() => e.answerQuestion(o)}>{o}</Button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">HerPattern asks only when passive data leaves an important gap.</p>
        <Button variant="ghost" size="sm" onClick={() => e.answerQuestion(null)}>Skip</Button>
      </div>
    </section>
  );
}
