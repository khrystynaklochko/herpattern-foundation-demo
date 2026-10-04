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
- All Small AI inference goes through `src/lib/small-ai/smallAiApi.ts`, which calls the server function in `src/lib/herpattern.functions.ts` and falls back to the in-browser `localSmallAI.ts` — UI never calls fetch directly so the demo works with no backend.
- HerPattern platform and Small AI service URLs and keys are read only inside server-function handlers from runtime secrets (HTTPS only), never `VITE_` vars — no credentials reach the browser bundle.
- Demo state machine, timers, queue and Judge Mode orchestration live only in `src/hooks/useDemoEngine.ts` — one source of truth keeps replays deterministic.
- Synthetic scenario data is built lazily and deterministically in `src/data/small-ai/demoScenario.ts` (no randomness) — Judge Mode must replay identically.
