import { describe, expect, it } from "vitest";
import { vagueNoun } from "@/lib/rules/vagueNoun";
import { findProtectedRanges } from "@/lib/protect";
import type { RuleContext } from "@/lib/types";

function ctxFor(text: string): RuleContext {
  return { text, mode: "blog-post", protectedRanges: findProtectedRanges(text) };
}

describe("style.vague-noun", () => {
  it("flags 'stuff' matching the acceptance-sample check", () => {
    const issues = vagueNoun.run(ctxFor("We looked at a lot of stuff in the logs."));
    expect(issues.some((i) => i.message.includes("stuff"))).toBe(true);
  });

  it("flags 'things'", () => {
    const issues = vagueNoun.run(ctxFor("Several things were wrong with the config."));
    expect(issues.length).toBe(1);
  });

  it("flags 'something'", () => {
    const issues = vagueNoun.run(ctxFor("Something caused the service to crash."));
    expect(issues.length).toBe(1);
  });

  it("flags 'somehow'", () => {
    const issues = vagueNoun.run(ctxFor("The attacker somehow bypassed the WAF."));
    expect(issues.length).toBe(1);
  });

  it("flags multiple vague words in one paragraph", () => {
    const issues = vagueNoun.run(ctxFor("Something broke, and somehow the stuff got deleted."));
    expect(issues.length).toBe(3);
  });

  it("does not flag precise technical prose", () => {
    const issues = vagueNoun.run(ctxFor("The exploit overwrote the return address on the stack."));
    expect(issues).toEqual([]);
  });

  it("does not flag 'something' used inside a code comment block", () => {
    const text = "Intro.\n```\n// do something here\n```\n";
    const issues = vagueNoun.run(ctxFor(text));
    expect(issues).toEqual([]);
  });

  it("does not flag inline-code occurrences", () => {
    const issues = vagueNoun.run(ctxFor("The function `doStuff()` runs the payload."));
    expect(issues).toEqual([]);
  });

  it("does not flag unrelated words containing similar substrings", () => {
    const issues = vagueNoun.run(ctxFor("The staffing levels were adequate."));
    expect(issues).toEqual([]);
  });

  it("does not flag an empty document", () => {
    const issues = vagueNoun.run(ctxFor(""));
    expect(issues).toEqual([]);
  });
});
