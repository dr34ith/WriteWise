# WriteWise

A QuillBot-like writing assistant specialized for security writing: CTF writeups, HTB/THM-style
walkthroughs, DFIR/incident reports, and security blog posts. Rules run entirely client-side by
default; LLM-powered features (rephrase, deep grammar check) are explicit, user-triggered
opt-ins. See [PROJECT_SPEC.md](PROJECT_SPEC.md) for the full product spec and
[CLAUDE.md](CLAUDE.md) for the engineering working agreement.

## Status

Phase 0 (scaffold) — see `DECISIONS.md` for what's built so far.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys only if you want LLM / Deep Check features locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e smoke tests |
| `npm run eval` | Run the rule engine over `corpus/samples/` for false-positive review |
| `npm run format` | Prettier write |

## Privacy

The core checker (spelling, style, wordiness, tone, structure) runs entirely in a Web Worker in
your browser — no text leaves your machine for that. Deep Grammar Check and any LLM action
(rephrase, explain, structure review) are separate, explicit buttons; the UI states what will be
sent and to which third-party provider before you click them.

## Deployment

Deployed on Vercel. Required environment variables are listed in `.env.example`; LLM provider
keys and the Upstash rate-limit store are configured as Vercel Environment Variables, never
committed.
