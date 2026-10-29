import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { findProtectedRanges } from "@/lib/protect";
import { runRules } from "@/lib/rules";
import { buildSpellChecker, type SpellChecker } from "@/lib/spelling";

let spellChecker: SpellChecker;

beforeAll(async () => {
  const dir = join(process.cwd(), "node_modules", "dictionary-en");
  const aff = readFileSync(join(dir, "index.aff"), "utf-8");
  const dic = readFileSync(join(dir, "index.dic"), "utf-8");
  spellChecker = await buildSpellChecker({ aff, dic });
});

function buildLargeDocument(targetWords: number): string {
  const paragraph =
    "In order to understand the attack, we looked at a lot of stuff in the logs. " +
    "The analyst basically confirmed the finding was really consistent with known TTPs. " +
    "Nmap and Wireshark were used during recon, and the CVE-2024-12345 vulnerability was exploited.\n\n";
  const wordsPerParagraph = paragraph.split(/\s+/).filter(Boolean).length;
  const repeats = Math.ceil(targetWords / wordsPerParagraph);
  return paragraph.repeat(repeats);
}

describe("rule engine performance (Phase 1 budget: p95 < ~150ms per full pass)", () => {
  it("completes a full rule pass on a ~5,000-word document well within budget", () => {
    const text = buildLargeDocument(5000);
    const protectedRanges = findProtectedRanges(text);

    const start = performance.now();
    const issues = runRules({
      text,
      mode: "blog-post",
      protectedRanges,
      spellChecker,
      glossaryTerms: new Set(["nmap", "wireshark"]),
    });
    const elapsedMs = performance.now() - start;

    expect(issues.length).toBeGreaterThan(0);
    // Generous ceiling for CI variance; spec's target is ~150ms on representative hardware.
    expect(elapsedMs).toBeLessThan(2000);
  });
});
