import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { misspelled, repeatedWord } from "@/lib/rules/spelling";
import { buildSpellChecker, type SpellChecker } from "@/lib/spelling";
import { findProtectedRanges } from "@/lib/protect";
import type { RuleContext } from "@/lib/types";

let spellChecker: SpellChecker;

beforeAll(async () => {
  const dir = join(process.cwd(), "node_modules", "dictionary-en");
  const aff = readFileSync(join(dir, "index.aff"), "utf-8");
  const dic = readFileSync(join(dir, "index.dic"), "utf-8");
  spellChecker = await buildSpellChecker({ aff, dic });
});

function ctxFor(text: string, overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    text,
    mode: "blog-post",
    protectedRanges: findProtectedRanges(text),
    spellChecker,
    glossaryTerms: new Set(["nmap", "wireshark", "burp", "suite", "powershell"]),
    ...overrides,
  };
}

describe("spelling.misspelled", () => {
  it("flags a clearly misspelled word", () => {
    const issues = misspelled.run(ctxFor("The attacker gainned access to the server."));
    expect(issues.some((i) => i.message.includes("gainned"))).toBe(true);
  });

  it("flags multiple distinct misspellings", () => {
    const issues = misspelled.run(ctxFor("We discoverd an obvoius vulnerabilty in the app."));
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });

  it("offers suggestions for a misspelled word", () => {
    const issues = misspelled.run(ctxFor("This is definately a bug."));
    const issue = issues.find((i) => i.message.includes("definately"));
    expect(issue).toBeDefined();
    expect(issue!.suggestions.length).toBeGreaterThan(0);
  });

  it("flags a typo in a technical sentence", () => {
    const issues = misspelled.run(ctxFor("The payload bypased the filter successfully."));
    expect(issues.some((i) => i.message.includes("bypased"))).toBe(true);
  });

  it("flags a misspelling inside an incident report sentence", () => {
    const issues = misspelled.run(
      ctxFor("The analyist reviewed the logs for suspicous activity."),
    );
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  it("does not flag correctly spelled prose", () => {
    const issues = misspelled.run(ctxFor("The attacker gained access to the server."));
    expect(issues).toEqual([]);
  });

  it("does not flag words inside a fenced code block", () => {
    const text = "Normal text.\n```\nthsi is intentionally mispeled code\n```\n";
    const issues = misspelled.run(ctxFor(text));
    expect(issues.length).toBe(0);
  });

  it("does not flag words inside inline code", () => {
    const issues = misspelled.run(ctxFor("Run `mispeled_function_nam()` to trigger it."));
    expect(issues.length).toBe(0);
  });

  it("does not flag glossary tool names", () => {
    const issues = misspelled.run(ctxFor("We used Nmap and Wireshark during recon."));
    expect(issues.some((i) => i.message.includes("Nmap") || i.message.includes("Wireshark"))).toBe(
      false,
    );
  });

  it("does not flag ALL-CAPS acronyms", () => {
    const issues = misspelled.run(ctxFor("The TTPs matched a known APT."));
    expect(issues.some((i) => /TTPs|APT/.test(i.message))).toBe(false);
  });

  it("does not flag words containing digits or underscores", () => {
    const issues = misspelled.run(ctxFor("The variable buf_sz2 held the length."));
    expect(issues.some((i) => i.message.includes("buf_sz2"))).toBe(false);
  });

  it("does not flag a word present in the user dictionary", () => {
    const issues = misspelled.run(
      ctxFor("The tool is called Pwntoolz.", { userDictionary: new Set(["pwntoolz"]) }),
    );
    expect(issues.some((i) => i.message.includes("Pwntoolz"))).toBe(false);
  });

  it("returns no issues when no spell checker is provided", () => {
    const text = "This has a mispeled wrod.";
    const issues = misspelled.run({
      text,
      mode: "blog-post",
      protectedRanges: findProtectedRanges(text),
    });
    expect(issues).toEqual([]);
  });
});

describe("spelling.repeated-word", () => {
  it("flags an immediately repeated word", () => {
    const issues = repeatedWord.run(ctxFor("We saw the the server respond."));
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("the the");
  });

  it("is case-insensitive when matching repeats", () => {
    const issues = repeatedWord.run(ctxFor("The The server was up."));
    expect(issues.length).toBe(1);
  });

  it("flags multiple repeats in the same text", () => {
    const issues = repeatedWord.run(ctxFor("We saw the the host and and the log."));
    expect(issues.length).toBe(2);
  });

  it("flags a repeated technical word", () => {
    const issues = repeatedWord.run(ctxFor("The the scan found open ports."));
    expect(issues.length).toBe(1);
  });

  it("flags repeats separated only by a single space", () => {
    const issues = repeatedWord.run(ctxFor("It was was successful."));
    expect(issues.length).toBe(1);
  });

  it("does not flag distinct adjacent words", () => {
    const issues = repeatedWord.run(ctxFor("The quick brown fox jumps."));
    expect(issues).toEqual([]);
  });

  it("does not flag repeats separated by a line break (different clauses)", () => {
    const issues = repeatedWord.run(ctxFor("End of line.\nEnd of next line."));
    expect(issues).toEqual([]);
  });

  it("does not flag a repeated word inside a code block", () => {
    const text = "Normal text.\n```\nls ls -la\n```\n";
    const issues = repeatedWord.run(ctxFor(text));
    expect(issues).toEqual([]);
  });

  it("does not flag a repeated word inside inline code", () => {
    const issues = repeatedWord.run(ctxFor("Run `ls ls` once."));
    expect(issues).toEqual([]);
  });

  it("does not flag unrelated short prose", () => {
    const issues = repeatedWord.run(ctxFor("Short and clean sentence here."));
    expect(issues).toEqual([]);
  });
});
