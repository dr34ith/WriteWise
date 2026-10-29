<div align="center">

# WriteWise

**A privacy-first writing assistant built for security writers.**

CTF writeups · HTB/THM walkthroughs · DFIR & incident reports · security blog posts

![Status](https://img.shields.io/badge/status-Phase%200%20(scaffold)-orange)
![Next.js](https://img.shields.io/badge/Next.js-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-Vitest%20%2B%20Playwright-6E9F18)
![Privacy](https://img.shields.io/badge/checker-client--side%20by%20default-success)

</div>

<img width="1280" height="720" alt="Untitled design" src="https://github.com/user-attachments/assets/a00a3521-e378-4a72-b3c8-c265c6879e6d" />

## Overview

WriteWise is a QuillBot-style writing assistant specialized for **security writing**. General
grammar tools don't understand the way security people write: tool names, CVE IDs, hashes, IOCs,
command output, and the structure of a good writeup or incident report. WriteWise is built
around that.

Two principles drive the design:

1. **Local first.** The core checker runs entirely in a Web Worker in your browser. Your draft
   never leaves your machine for it.
2. **LLM features are opt-in.** Rephrasing, deep grammar checking, and other AI actions are
   separate, explicit, user-triggered buttons. Nothing is sent to a third party unless you click.

> For the full product definition see [PROJECT_SPEC.md](PROJECT_SPEC.md). For the engineering
> working agreement see [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md).

## Who it's for

- CTF players writing up challenges for a team, a blog, or a portfolio
- Students and learners documenting HTB / TryHackMe walkthroughs
- DFIR analysts and SOC staff drafting incident and investigation reports
- Security bloggers who want clear, concise, professional posts

## Features

### Core checker (runs in your browser)

| Category | What it helps with |
|---|---|
| **Spelling** | Catches typos while respecting security terminology |
| **Style** | Keeps writing consistent and readable |
| **Wordiness** | Flags filler and verbose phrasing |
| **Tone** | Keeps the voice appropriate for the document type |
| **Structure** | Checks that the document is organized the way its genre expects |

### Opt-in LLM actions (explicit, user-triggered)

| Action | Description |
|---|---|
| **Rephrase** | Rewrite a selection in a different style |
| **Deep Grammar Check** | A more thorough grammar pass than the local rules |
| **Explain** | Explain why a suggestion was made |
| **Structure review** | Higher-level feedback on how the document is organized |

Before each of these runs, the UI states **what will be sent** and **to which third-party
provider**.

## Status

**Phase 0 (scaffold).** The project skeleton, tooling, and conventions are in place. See
[DECISIONS.md](DECISIONS.md) for a running log of what has been built and why.

## Quick start

**Prerequisites:** a recent Node.js LTS and npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (only needed for LLM / Deep Check features)
cp .env.example .env.local

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The local rule-based checker works **without any API keys**. Fill in `.env.local` only if you
> want to try the LLM-powered features on your machine.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright end-to-end smoke tests |
| `npm run eval` | Run the rule engine over `corpus/samples/` for false-positive review |
| `npm run format` | Format the codebase with Prettier |

## Project layout

```text
WriteWise/
├── corpus/         # Sample texts used to evaluate rules (corpus/samples/)
├── public/         # Static assets
├── scripts/        # Tooling scripts (e.g. the rule-engine eval)
├── src/            # Application source
├── tests/          # Unit and e2e tests
├── AGENTS.md       # Guidance for AI coding agents
├── CLAUDE.md       # Engineering working agreement
├── DECISIONS.md    # Log of decisions and progress
├── PROJECT_SPEC.md # Full product spec
└── .env.example    # Environment variable template
```

## Development workflow

Before opening a PR or pushing, run the full local check:

```bash
npm run format
npm run lint
npm run typecheck
npm test
```

For changes that touch the rule engine, also run `npm run eval` and review the output on
`corpus/samples/`. This is how false positives are caught, which matters most for security
writing where commands, hashes, and identifiers are easy to mis-flag.

## Privacy

| Feature | Where it runs | Data leaves your browser? |
|---|---|---|
| Spelling, style, wordiness, tone, structure | Web Worker in your browser | **No** |
| Deep Grammar Check | Third-party LLM provider | Only when you click the button |
| Rephrase / Explain / Structure review | Third-party LLM provider | Only when you click the button |

The interface tells you exactly what will be sent and to which provider **before** you confirm.
Treat any LLM action like sending text to a third party: avoid including secrets, credentials,
or sensitive client and incident data unless you are comfortable with that provider's terms.

## Deployment

WriteWise is deployed on **Vercel**.

- Required environment variables are listed in [`.env.example`](.env.example).
- LLM provider keys and the Upstash rate-limit store are configured as **Vercel Environment
  Variables**.
- Secrets are **never committed**. `.env` and `.env.local` must stay out of version control.

## Contributing

1. Read [PROJECT_SPEC.md](PROJECT_SPEC.md) and [CLAUDE.md](CLAUDE.md) first.
2. Create a branch and keep changes focused.
3. Run the checks from [Development workflow](#development-workflow).
4. Record notable decisions in [DECISIONS.md](DECISIONS.md).
