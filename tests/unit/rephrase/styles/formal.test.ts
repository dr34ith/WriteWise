import { describe, expect, it } from "vitest";
import { generateFormal } from "@/lib/rephrase/styles/formal";
import { findProtectedRanges } from "@/lib/protect";

function run(text: string) {
  return generateFormal(text, findProtectedRanges(text));
}

describe("generateFormal", () => {
  it("proposes a contraction-expansion edit", () => {
    const candidates = run("We don't know the root cause yet.");
    expect(candidates.some((set) => set.some((e) => e.replacement === "do not"))).toBe(true);
  });

  it("proposes an informal-word-replacement edit", () => {
    const candidates = run("The attacker got access to the server.");
    expect(candidates.some((set) => set.some((e) => e.replacement === "obtained"))).toBe(true);
  });

  it("proposes the first-person template as its own candidate", () => {
    const candidates = run("I found a vulnerability in the login form.");
    expect(candidates.some((set) => set.length === 1 && set[0].span.start === 0)).toBe(true);
  });

  it("does not propose a contraction edit inside inline code", () => {
    const candidates = run("Run `if (!x) { don't_call(); }` carefully.");
    const hasContractionEdit = candidates.some((set) =>
      set.some((e) => e.reason.includes("Expand contraction")),
    );
    expect(hasContractionEdit).toBe(false);
  });

  it("returns no candidates for a sentence with nothing to formalize", () => {
    const candidates = run("The server responded quickly to the request.");
    expect(candidates).toEqual([]);
  });
});
