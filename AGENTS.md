<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All Small AI inference goes through `src/lib/small-ai/smallAiApi.ts`, which falls back to the in-browser `localSmallAI.ts`; UI never calls fetch directly — keeps the demo working with no backend.
- Demo state machine, timers, queue and Judge Mode orchestration live only in `src/hooks/useDemoEngine.ts` — one source of truth keeps replays deterministic.
- Synthetic scenario data is built lazily and deterministically in `src/data/small-ai/demoScenario.ts` (no randomness) — Judge Mode must replay identically.
