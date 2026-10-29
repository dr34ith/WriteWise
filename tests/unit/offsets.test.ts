import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { findProtectedRanges, overlapsProtected } from "@/lib/protect";
import { runRules } from "@/lib/rules";
import { buildSpellChecker, type SpellChecker } from "@/lib/spelling";
import type { DocMode } from "@/lib/types";

let spellChecker: SpellChecker;

beforeAll(async () => {
  const dir = join(process.cwd(), "node_modules", "dictionary-en");
  const aff = readFileSync(join(dir, "index.aff"), "utf-8");
  const dic = readFileSync(join(dir, "index.dic"), "utf-8");
  spellChecker = await buildSpellChecker({ aff, dic });
});

const FIXTURES: { name: string; text: string; mode: DocMode }[] = [
  {
    name: "incident report acceptance sample",
    mode: "incident-report",
    text: `## Summary
I think the attacker maybe got in through a phishing email. We looked at a lot of stuff in the logs and basically it was really bad. The logs from 10/12 shows the server was accessed at 14:05 and then at 2:10 PM.`,
  },
  {
    name: "ctf writeup with code and protected artifacts",
    mode: "ctf-writeup",
    text: `# Writeup

In order to gain access, we scanned the host with Nmap:

\`\`\`bash
nmap -sV -p- 10.0.0.1
\`\`\`

We then dowloaded the flag from htb{th1s_1s_th3_fl4g} and confirmed CVE-2024-12345 was the root cause. See https://example.com/writeup for more.
`,
  },
  {
    name: "blog post with headings, lists, and a table",
    mode: "blog-post",
    text: `# Title

This is  a sentence with  double spaces and a lot of filler stuff.

- First item basically works
- Second item , has a stray space before punctuation

| Tool | Use |
| - | - |
| Nmap | Scanning |
`,
  },
];

describe("issue span offsets", () => {
  for (const fixture of FIXTURES) {
    it(`every issue span matches the flagged text exactly: ${fixture.name}`, () => {
      const protectedRanges = findProtectedRanges(fixture.text);
      const issues = runRules({
        text: fixture.text,
        mode: fixture.mode,
        protectedRanges,
        spellChecker,
        glossaryTerms: new Set(["nmap"]),
      });

      expect(issues.length).toBeGreaterThan(0);

      for (const issue of issues) {
        // The span must be a valid range within the original text — this is the
        // offset-correctness invariant the whole UI (highlighting, apply-suggestion,
        // jump-to-issue) depends on: text.slice(start, end) must be meaningful and in bounds.
        expect(issue.span.start).toBeGreaterThanOrEqual(0);
        expect(issue.span.end).toBeLessThanOrEqual(fixture.text.length);
        expect(issue.span.start).toBeLessThanOrEqual(issue.span.end);

        // For rules whose message quotes the *entire* flagged span (not just a sub-part of
        // it, as e.g. typography.space-before-punct does), the quoted text must match exactly.
        const QUOTES_FULL_SPAN = new Set(["spelling.misspelled", "style.filler", "style.vague-noun"]);
        if (QUOTES_FULL_SPAN.has(issue.ruleId)) {
          const flagged = fixture.text.slice(issue.span.start, issue.span.end);
          const quoted = /"([^"]*)"/.exec(issue.message)?.[1];
          expect(flagged.toLowerCase()).toBe(quoted?.toLowerCase());
        }

        // No issue should ever be reported inside a protected range.
        expect(overlapsProtected(protectedRanges, issue.span)).toBe(false);
      }
    });
  }
});
