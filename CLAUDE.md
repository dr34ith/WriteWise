# CLAUDE.md

Working agreement and conventions for WriteWise. Full product spec: [PROJECT_SPEC.md](PROJECT_SPEC.md).
Non-obvious decisions and library-version verifications: [DECISIONS.md](DECISIONS.md).

## Working agreement

- **Build in phases** (spec section 13). Finish a phase, run the verification commands below,
  commit, and stop at the phase gate to report what was built, test results, and any deviations.
- **Never guess library APIs or versions.** Run `npm view <pkg> version` and check docs before
  depending on a package's behavior. Record the verified version and any deviation in
  `DECISIONS.md`.
- **Rules are data-driven.** Phrase maps, glossaries, mode configs and the phrase bank live in
  `src/data/*.json` / `src/lib/modes/*.ts`, not hardcoded in rule logic, so they're editable
  without touching code.
- **Tests first for rules.** Every rule ships with positive and negative test cases, including
  protected-range cases (a rule must stay silent inside code, URLs, hashes, etc.).
- **Never commit secrets.** `.env*` is gitignored from the first commit; `.env.example` lists
  every variable with no values.
- **Ask only for real blockers** (e.g. missing API keys). Otherwise pick the sensible default,
  write it to `DECISIONS.md`, and keep going.
- Before finishing any phase, run:
  ```
  npm run lint && npm run typecheck && npm test && npm run build
  ```

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript, `strict: true` |
| Styling | Tailwind CSS v4 |
| Editor | CodeMirror 6 (`@codemirror/lang-markdown`) |
| Workers | Web Worker: `new Worker(new URL('./worker.ts', import.meta.url))` |
| Spelling | `nspell` + `dictionary-en` / `dictionary-en-gb` |
| NLP helpers | `compromise`; custom heuristics (e.g. passive voice) where it falls short |
| Diff | `diff` (jsdiff) |
| Validation | `zod` |
| Rate limiting | `@upstash/ratelimit` + `@upstash/redis` (serverless — no shared memory) |
| LLM SDKs | Gemini via `@google/genai`; DeepSeek via an OpenAI-compatible client (`openai` pkg) |
| Tests | Vitest (unit, `jsdom` env), `fast-check` (property, optional), Playwright (e2e smoke) |
| Lint/format | ESLint (flat config) + Prettier, `tsc --noEmit` |
| CI | GitHub Actions: lint, typecheck, test, build (`.github/workflows/ci.yml`) |
| Hosting | Vercel |

Do **not** depend on `write-good` — use its checklist as reference only; implement domain-aware
rules instead (see spec section 4).

Platform limits to respect: Vercel Hobby function max duration 300s, payload max 4.5MB (set
`maxDuration` on LLM routes); LanguageTool public API is ~20 req/IP/min, 75KB text/IP/min, POST
only, **user-triggered only, never per keystroke**.

## Conventions

- TypeScript strict; no `any` without a comment justifying it.
- Rules are pure functions: `(ctx: RuleContext) => Issue[]`. Every rule file exports `id`,
  `category`, `defaultSeverity`, `appliesTo`, `experimental`, and runs on prose blocks only
  (never inside protected ranges: code, URLs, hashes, CVEs, MITRE IDs, paths, flags, timestamps).
  Each rule has a matching test file with ≥5 positive and ≥5 negative cases.
- JSON data files are validated with `zod` at load/test time.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`); one commit series per phase.
- Accessible, keyboard-first UI; never signal severity by color alone.
- Record every non-obvious decision (library choice, threshold, spec deviation) in
  `DECISIONS.md`.
- Never alter protected content (code, URLs, IPs, hashes, CVE/MITRE IDs, paths, flags,
  timestamps) in any rule, rephrase, or LLM call — this is load-bearing for user trust and has
  dedicated tests.
- Privacy by default: core rule-checking runs entirely client-side in a Web Worker. Text only
  leaves the browser on an explicit user action (Deep Grammar Check, LLM rephrase/explain/
  structure), and the UI must say so at the point of action.

## Environment variables

See `.env.example` for the full list (LLM provider keys, `LLM_DEFAULT_PROVIDER`,
`LLM_FALLBACK_ORDER`, `MAX_INPUT_CHARS`, `LLM_DAILY_CAP`, LanguageTool config, Upstash
rate-limit config). Provider keys are server-only env vars or BYOK headers — never logged or
stored server-side.

## Repo layout

```
src/
  app/            Next.js routes + api/{deepcheck,llm/*}
  components/     Editor, IssuePanel, RephrasePanel, StructurePanel, StatsPanel, HabitsPanel, ...
  lib/
    types.ts protect.ts segment.ts engine.ts worker.ts score.ts tracker.ts storage.ts
    rules/        one file per rule family + index.ts registry
    modes/        ctf-writeup.ts walkthrough.ts incident-report.ts blog-post.ts academic.ts
    rephrase/      engine.ts guards.ts rank.ts
    llm/           provider.ts gemini.ts deepseek.ts prompts.ts schemas.ts redact.ts
    server/        ratelimit.ts cache.ts env.ts errors.ts
  data/            wordiness.json glossary.json acronyms.json synonyms.json phrasebank.json ...
corpus/samples/    sample docs for `npm run eval` (no private/client data)
tests/{unit,e2e}/
```
