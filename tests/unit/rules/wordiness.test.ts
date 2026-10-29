import { describe, expect, it } from "vitest";
import { wordinessPhrase } from "@/lib/rules/wordiness";
import { findProtectedRanges } from "@/lib/protect";
import type { RuleContext } from "@/lib/types";

function ctxFor(text: string): RuleContext {
  return { text, mode: "blog-post", protectedRanges: findProtectedRanges(text) };
}

describe("wordiness.phrase", () => {
  it("flags 'in order to'", () => {
    const issues = wordinessPhrase.run(ctxFor("In order to scan the host, run nmap."));
    expect(issues.some((i) => i.message.includes("In order to"))).toBe(true);
  });

  it("flags 'due to the fact that'", () => {
    const issues = wordinessPhrase.run(
      ctxFor("Due to the fact that logs were missing, we could not confirm it."),
    );
    expect(issues.length).toBe(1);
    expect(issues[0].suggestions[0].replacement).toBe("because");
  });

  it("flags 'a large number of'", () => {
    const issues = wordinessPhrase.run(ctxFor("A large number of hosts were affected."));
    expect(issues.length).toBe(1);
  });

  it("flags 'has the ability to'", () => {
    const issues = wordinessPhrase.run(ctxFor("The attacker has the ability to escalate."));
    expect(issues.length).toBe(1);
  });

  it("flags 'a lot of' matching the acceptance-sample wordiness check", () => {
    const issues = wordinessPhrase.run(ctxFor("We looked at a lot of stuff in the logs."));
    expect(issues.some((i) => i.message.includes("a lot of"))).toBe(true);
  });

  it("flags 'make use of'", () => {
    const issues = wordinessPhrase.run(ctxFor("We make use of Burp Suite for testing."));
    expect(issues.length).toBe(1);
  });

  it("matches case-insensitively", () => {
    const issues = wordinessPhrase.run(ctxFor("IN ORDER TO bypass the filter."));
    expect(issues.length).toBe(1);
  });

  it("does not flag plain concise prose", () => {
    const issues = wordinessPhrase.run(ctxFor("We scanned the host with Nmap."));
    expect(issues).toEqual([]);
  });

  it("does not flag text with no wordy phrases at all", () => {
    const issues = wordinessPhrase.run(ctxFor("The server responded quickly to every request."));
    expect(issues).toEqual([]);
  });

  it("does not flag a wordy phrase inside a fenced code block", () => {
    const text = "Intro.\n```\n# in order to run this, set the flag\n```\n";
    const issues = wordinessPhrase.run(ctxFor(text));
    expect(issues).toEqual([]);
  });

  it("does not flag a wordy phrase inside inline code", () => {
    const issues = wordinessPhrase.run(ctxFor("The comment says `// in order to debug this`."));
    expect(issues).toEqual([]);
  });

  it("does not partially match inside a longer unrelated word", () => {
    const issues = wordinessPhrase.run(ctxFor("The priority of the task was high."));
    expect(issues.some((i) => i.message.toLowerCase().includes("prior to"))).toBe(false);
  });
});
