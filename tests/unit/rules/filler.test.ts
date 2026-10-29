import { describe, expect, it } from "vitest";
import { filler } from "@/lib/rules/filler";
import { findProtectedRanges } from "@/lib/protect";
import type { RuleContext } from "@/lib/types";

function ctxFor(text: string): RuleContext {
  return { text, mode: "blog-post", protectedRanges: findProtectedRanges(text) };
}

describe("style.filler", () => {
  it("flags 'basically'", () => {
    const issues = filler.run(ctxFor("It was basically a phishing email."));
    expect(issues.some((i) => i.message.includes("basically"))).toBe(true);
  });

  it("flags 'really' matching the acceptance-sample tone check", () => {
    const issues = filler.run(ctxFor("It was really bad for the organization."));
    expect(issues.some((i) => i.message.includes("really"))).toBe(true);
  });

  it("flags 'very'", () => {
    const issues = filler.run(ctxFor("The vulnerability was very severe."));
    expect(issues.length).toBe(1);
  });

  it("flags 'just'", () => {
    const issues = filler.run(ctxFor("It just worked on the first try."));
    expect(issues.length).toBe(1);
  });

  it("flags 'literally'", () => {
    const issues = filler.run(ctxFor("The server literally crashed instantly."));
    expect(issues.length).toBe(1);
  });

  it("flags multiple fillers in one sentence", () => {
    const issues = filler.run(ctxFor("It was basically really obviously broken."));
    expect(issues.length).toBe(3);
  });

  it("does not flag clean prose with no filler words", () => {
    const issues = filler.run(ctxFor("The server crashed after the request."));
    expect(issues).toEqual([]);
  });

  it("does not flag 'just' when used as part of a larger legitimate word", () => {
    const issues = filler.run(ctxFor("The adjustment was applied correctly."));
    expect(issues).toEqual([]);
  });

  it("does not flag a filler word inside a fenced code block", () => {
    const text = "Intro.\n```\n// this is basically a hack\n```\n";
    const issues = filler.run(ctxFor(text));
    expect(issues).toEqual([]);
  });

  it("does not flag a filler word inside inline code", () => {
    const issues = filler.run(ctxFor("The variable `reallyFast` controls timing."));
    expect(issues).toEqual([]);
  });
});
