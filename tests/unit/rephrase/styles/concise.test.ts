import { describe, expect, it } from "vitest";
import { generateConcise } from "@/lib/rephrase/styles/concise";
import { findProtectedRanges } from "@/lib/protect";

function run(text: string) {
  return generateConcise(text, findProtectedRanges(text));
}

describe("generateConcise", () => {
  it("proposes an edit for a wordiness.json phrase", () => {
    const edits = run("In order to scan the host, run nmap.");
    expect(edits.length).toBe(1);
    expect(edits[0].some((e) => e.replacement === "to")).toBe(true);
  });

  it("proposes an edit for a filler word", () => {
    const edits = run("The vulnerability was very severe.");
    expect(edits.length).toBe(1);
    expect(edits[0].some((e) => e.replacement === "")).toBe(true);
  });

  it("combines multiple substitutions into one candidate", () => {
    const edits = run("In order to be thorough, it was very important.");
    expect(edits.length).toBe(1);
    expect(edits[0].length).toBeGreaterThanOrEqual(2);
  });

  it("does not propose edits inside a fenced code block", () => {
    const text = "Intro.\n```\n// in order to debug this, very carefully\n```\n";
    const edits = run(text);
    expect(edits).toEqual([]);
  });

  it("returns no candidates when there is nothing to simplify", () => {
    const edits = run("The server responded quickly.");
    expect(edits).toEqual([]);
  });
});
