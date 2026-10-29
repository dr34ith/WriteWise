# Decisions log

Records non-obvious choices: library picks, thresholds, deviations from `PROJECT_SPEC.md`.

## Phase 0

- **Project/package name**: `writewise` (lowercase) — npm forbids capitals in package names; the
  product/display name "WriteWise" is used in `metadata.title` and UI copy only.
- **Library versions verified via `npm view <pkg> version` on 2026-10-29**:
  - `next@16.4.3`, `react@19.3.0` (from `create-next-app` defaults)
  - `nspell@2.1.5`, `dictionary-en@4.0.0`, `dictionary-en-gb@3.0.0`
  - `compromise@14.19.0`
  - `diff@9.0.0`
  - `zod@4.6.7`
  - `@upstash/ratelimit@2.2.0`, `@upstash/redis@1.40.0`
  - `@google/genai@2.31.0` (Gemini SDK)
  - `openai@7.45.1` (used as an OpenAI-compatible client for DeepSeek; verify DeepSeek's base URL
    and model names against its docs in Phase 5 before wiring the adapter)
  - `@codemirror/lang-markdown@6.5.2`, `codemirror@6.0.2` (CodeMirror 6 chosen per spec over
    Monaco for bundle size)
  - `vitest@5.0.5`, `fast-check@4.10.2`, `@playwright/test` (latest), `prettier@3.9.10`
- **`@types/node` bumped to `^24`** (from create-next-app's default `^20`): `vitest@5` requires
  `@types/node@^22 || >=24`, so the default scaffold version conflicted with the peer requirement.
- **Vitest environment**: `jsdom`, since rule/engine code will eventually touch DOM-adjacent APIs
  (e.g. `Intl.Segmenter` behavior checks) and components will be tested later. Revisit if this
  slows the unit suite down.
- **ESLint/Tailwind/TS config**: kept `create-next-app`'s defaults (flat ESLint config, Tailwind
  v4, `strict: true` in `tsconfig.json`) rather than hand-rolling, since they already match the
  spec's requirements.
- **Worker wiring (Phase 0 scope)**: `src/lib/worker.ts` + `src/lib/engine.ts` are stubs that
  return `{ issues: [] }` for any input. `src/lib/analyzerClient.ts` is the main-thread wrapper
  used by `page.tsx` to prove the worker round-trip works. Real rules land in Phase 1.

## Phase 1

- **nspell dictionary loading**: `dictionary-en`/`dictionary-en-gb` read their `.aff`/`.dic`
  files via `node:fs/promises` at import time, which does not work unbundled in a browser or
  Web Worker. Solution: `scripts/copy-dictionaries.mjs` copies the raw `.aff`/`.dic`/`license`
  files from `node_modules` into `public/dictionaries/{en,en-gb}/` (wired as the `postinstall`
  npm script, so it reruns on every `npm install`). `src/lib/spelling.ts` fetches those files at
  runtime (`fetch('/dictionaries/en/index.aff')`, etc.) and builds an `nspell` instance from the
  raw text — this works identically in the browser and in the analysis Web Worker. The generated
  `public/dictionaries/` directory is gitignored (regenerated from `node_modules`, not committed).
  Tests bypass `fetch` entirely and build the checker directly from `node_modules` file contents
  via `buildSpellChecker()`, since there's no static file server in the Vitest/Node environment.
- **`engine.analyze` is async** (not sync as the spec's illustrative snippet in section 5
  implies for `Rule.run`): the spell checker must be loaded (fetched + parsed) before rules can
  run, so `analyze()` awaits `loadSpellChecker()` once per English variant (cached at module
  scope) and degrades gracefully to skipping `spelling.misspelled` if that fetch fails (e.g. no
  static file route available, as in the Node `eval` script). Individual `Rule.run()` functions
  stay synchronous, per spec — they just receive an already-loaded `spellChecker` via
  `RuleContext`.
- **Result caching**: `engine.ts` caches whole-document `AnalyzeResult`s keyed by
  `hash(mode + englishVariant + userDictionary + text)`, capped at 20 entries (simple
  insertion-order eviction). This is a document-level cache rather than the spec's
  per-paragraph cache — a true per-paragraph cache would require re-architecting every rule to
  run block-by-block instead of over the whole document text. Revisit in Phase 2 if typing
  responsiveness on very large documents needs it; for now the Web Worker already keeps the
  main thread unblocked, and the debounce (400ms, in `page.tsx`) limits how often `analyze()`
  runs at all.
- **Phase 1 rule scope**: implemented `spelling.misspelled`, `spelling.repeated-word`,
  `wordiness.phrase` (from `src/data/wordiness.json`), `style.filler`, `style.vague-noun`, and
  five `typography.*` rules, matching the spec's Phase 1 deliverable list. Rules that need full
  mode-aware tone profiles or sentence-level analysis (long-sentence, passive voice, hedging,
  evidence, structure) are deferred to Phases 2–3 as specified.
- **Rules operate on whole-document text with protected-range filtering**, not strictly
  block-by-block as spec section 6.3 suggests ("rules that check prose run only on prose
  blocks"). For phrase/word-level rules (wordiness, filler, vague-noun, typography) this is
  equivalent in practice since every protected range (code, URLs, hashes, etc.) is still
  excluded via `overlapsProtected`; the only gap is that table cell text isn't additionally
  excluded yet. `typography.unbalanced-brackets-quotes` and `typography.sentence-no-end-punct`
  do use `segmentBlocks`/`isProseBlock` since they need paragraph boundaries. Revisit if table
  false-positives show up in the Phase 2 corpus eval.
- **CodeMirror decorations use CSS underline styles keyed by severity** (`.ww-issue-info`,
  `.ww-issue-suggestion`, `.ww-issue-warning`, `.ww-issue-error` in `globals.css`), not color
  fills, so severity is never signaled by color alone (accessibility requirement, spec 6.10/11).
- **React 19.3 / Next 16's stricter `react-hooks` ESLint rules** (`react-hooks/set-state-in-effect`,
  `react-hooks/refs`) forbid calling `setState` synchronously in an effect body or capturing a
  ref inside a closure created during render. Worked around by: (a) wrapping synchronous
  hydration `setState` calls in `Promise.resolve().then(...)`, and (b) creating the debounced
  `analyze` closure inside a `useEffect` (stored in a ref) rather than in `useMemo`, since
  `useMemo`'s body runs during render.
- **Settings/draft/dictionary persistence** (`src/lib/storage.ts`) uses versioned
  `localStorage` keys (`ww:v1:*`) per spec 6.11, wrapped in try/catch. Document text is only
  persisted as the current draft (`ww:v1:draft`) for convenience across reloads — the spec's
  "do not store document text by default" rule (6.9) applies to habit-tracking snapshots, which
  land in Phase 6, not to the live draft itself.

## Phase 4 (pulled forward ahead of Phases 2-3, per owner request)

Owner asked for an auto-fixer, a rule-based rephraser with selectable styles, an explicit
light/dark theme toggle, and tab navigation — this pulls spec section 6.6 ("Rule-based
rephraser") forward out of order, plus two UI conveniences (theme toggle, tabs) not in the spec.

- **"Fix All" reconciles with spec section 1's "no auto-applying changes without user review"**
  by opening a per-change review list (`FixAllReview.tsx`, all rows checked by default) rather
  than mutating text on click. Eligible issues are `suggestion`/`info` severity with at least
  one suggestion; `warning`/`error` are excluded (need human judgment) and reported as a count
  in the review header. Conflict resolution for overlapping issues: non-overlapping, greedy by
  ascending `span.start` — first-wins by position, not an optimal-coverage algorithm, since
  predictability (matches what the user sees top-to-bottom) matters more than squeezing in one
  extra fix. See `src/lib/autofix.ts`.
- **Rephraser API computes protected ranges internally** (`rephrase(sentenceText, style)`, not
  `rephrase(sentenceText, style, protectedRanges)` as originally sketched) — avoids a
  full-document-to-sentence offset-translation step that added complexity with no real benefit,
  since `findProtectedRanges` is cheap and self-contained (front-matter detection, the only
  position-0-dependent check, never matters for a single sentence extracted from prose).
- **Rephraser style scope**: implemented Concise, Formal/Report, Technical precision, Plain/
  Simple, and Split-long-sentence (the 5 the owner asked for). "Active voice (best effort)" from
  spec 6.6's style list is **not** implemented — subject/object reordering is materially harder
  than the others and wasn't requested. `src/data/synonyms.json` ships with ~40 entries, not the
  spec's aspirational "a few hundred" — a stub to expand later. A sentence matching the hedging
  pattern (`I think`, `maybe`, `probably`, ...) returns zero candidates for every style, matching
  the spec's own acceptance example — rephrasing must never silently rewrite an unsupported claim.
- **Changes are derived directly from each style's own edit list** (`applyEdits.ts`'s `changes[]`,
  which already carries accurate before/after/span/reason), not re-derived by word-diffing the
  final strings with the `diff` package as originally sketched — the structured edits are more
  precise (exact original-text spans) and the `diff` package turned out to add no value here, so
  it's unused by the rephraser despite being in the stack table for a possible future UI-level
  diff view.
- **Meaning-preservation guard normalizes contractions on both sides before counting negations/
  modals** (`src/lib/rephrase/contractions.ts`, shared with `formal.ts`) — without this, Formal's
  own contraction expansion (e.g. "won't" -> "will not") would look like it invented a "will" or
  lost a negation, since "won't" is tokenized as one apostrophe-word, not two separate words.
- **Theme toggle**: switched Tailwind's `dark:` variant from v4's default media-query behavior to
  class-driven via `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css` (confirmed
  working — `npm run build` compiles it without error). `:root` keeps a `prefers-color-scheme`
  fallback for `:not(.light):not(.dark)`; an explicit `.dark`/`.light` class always overrides.
  2-state toggle (light/dark) — "system" is implicit (no stored `ww:v1:theme` value yet) rather
  than a selectable third option. An inline `<script>` in `layout.tsx`'s `<head>` applies the
  stored class before hydration to avoid a flash of the wrong theme.
- **Tabs**: plain `role="tablist"`/`role="tab"`/`role="tabpanel"` with full arrow-key navigation
  (`handleTabKeyDown` in `page.tsx`) — no UI library. Only "Issues" and "Rephrase" tabs exist now;
  Structure/Stats/Habits (spec 6.10) are deferred to their own phases, and the `TABS` array is
  written so adding them later is a one-line extension.
