import { describe, expect, it } from "vitest";
import { applyAutoFix, planAutoFix } from "@/lib/autofix";
import type { Issue } from "@/lib/types";

function makeIssue(overrides: Partial<Issue> & { span: Issue["span"] }): Issue {
  return {
    id: `id-${overrides.span.start}-${overrides.span.end}-${Math.random()}`,
    ruleId: "test.rule",
    category: "style",
    severity: "suggestion",
    message: "test",
    why: "test",
    suggestions: [{ label: "fix", replacement: "FIXED" }],
    ...overrides,
  };
}

describe("planAutoFix", () => {
  it("selects a single eligible issue", () => {
    const issue = makeIssue({ span: { start: 0, end: 4 } });
    const { selected, skipped } = planAutoFix([issue]);
    expect(selected).toEqual([issue]);
    expect(skipped).toEqual([]);
  });

  it("selects multiple non-overlapping issues", () => {
    const a = makeIssue({ span: { start: 0, end: 4 } });
    const b = makeIssue({ span: { start: 10, end: 14 } });
    const { selected } = planAutoFix([a, b]);
    expect(selected).toEqual([a, b]);
  });

  it("skips a later issue that overlaps an earlier-starting one", () => {
    const a = makeIssue({ span: { start: 0, end: 10 } });
    const b = makeIssue({ span: { start: 5, end: 15 } });
    const { selected, skipped } = planAutoFix([a, b]);
    expect(selected).toEqual([a]);
    expect(skipped).toEqual([b]);
  });

  it("resolves conflicts by position regardless of input order", () => {
    const a = makeIssue({ span: { start: 0, end: 10 } });
    const b = makeIssue({ span: { start: 5, end: 15 } });
    const { selected, skipped } = planAutoFix([b, a]);
    expect(selected).toEqual([a]);
    expect(skipped).toEqual([b]);
  });

  it("excludes issues with no suggestions", () => {
    const issue = makeIssue({ span: { start: 0, end: 4 }, suggestions: [] });
    const { selected, skipped } = planAutoFix([issue]);
    expect(selected).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it("excludes warning-severity issues", () => {
    const issue = makeIssue({ span: { start: 0, end: 4 }, severity: "warning" });
    const { selected } = planAutoFix([issue]);
    expect(selected).toEqual([]);
  });

  it("excludes error-severity issues", () => {
    const issue = makeIssue({ span: { start: 0, end: 4 }, severity: "error" });
    const { selected } = planAutoFix([issue]);
    expect(selected).toEqual([]);
  });

  it("includes info-severity issues", () => {
    const issue = makeIssue({ span: { start: 0, end: 4 }, severity: "info" });
    const { selected } = planAutoFix([issue]);
    expect(selected).toEqual([issue]);
  });

  it("allows adjacent (touching, non-overlapping) spans", () => {
    const a = makeIssue({ span: { start: 0, end: 5 } });
    const b = makeIssue({ span: { start: 5, end: 10 } });
    const { selected } = planAutoFix([a, b]);
    expect(selected).toEqual([a, b]);
  });

  it("returns empty plan for an empty issue list", () => {
    const { selected, skipped } = planAutoFix([]);
    expect(selected).toEqual([]);
    expect(skipped).toEqual([]);
  });
});

describe("applyAutoFix", () => {
  it("applies a single issue's top suggestion", () => {
    const text = "The the server was up.";
    const issue = makeIssue({
      span: { start: 0, end: 7 },
      suggestions: [{ label: "The", replacement: "The" }],
    });
    const result = applyAutoFix(text, [issue]);
    expect(result.text).toBe("The server was up.");
  });

  it("applies multiple non-overlapping fixes in one pass without corrupting offsets", () => {
    const text = "In order to scan, we used a lot of tools.";
    const first = makeIssue({
      span: { start: 0, end: 11 },
      suggestions: [{ label: "To", replacement: "To" }],
    });
    const second = makeIssue({
      span: { start: 26, end: 34 },
      suggestions: [{ label: "many", replacement: "many" }],
    });
    expect(text.slice(first.span.start, first.span.end)).toBe("In order to");
    expect(text.slice(second.span.start, second.span.end)).toBe("a lot of");
    const result = applyAutoFix(text, [first, second]);
    expect(result.text).toBe("To scan, we used many tools.");
  });

  it("returns the appliedIssueIds matching the selected issues", () => {
    const issue = makeIssue({ span: { start: 0, end: 2 } });
    const result = applyAutoFix("ab", [issue]);
    expect(result.appliedIssueIds).toEqual([issue.id]);
  });

  it("handles replacement with an empty string (deletion)", () => {
    const text = "This is very important.";
    const issue = makeIssue({
      span: { start: 8, end: 13 },
      suggestions: [{ label: "Remove", replacement: "" }],
    });
    expect(text.slice(8, 13)).toBe("very ");
    const result = applyAutoFix(text, [issue]);
    expect(result.text).toBe("This is important.");
  });

  it("returns the original text unchanged when no issues are selected", () => {
    const text = "Nothing to fix here.";
    const result = applyAutoFix(text, []);
    expect(result.text).toBe(text);
    expect(result.appliedIssueIds).toEqual([]);
  });

  it("handles a fix at the very start of the text", () => {
    const text = "Teh quick fox.";
    const issue = makeIssue({
      span: { start: 0, end: 3 },
      suggestions: [{ label: "The", replacement: "The" }],
    });
    const result = applyAutoFix(text, [issue]);
    expect(result.text).toBe("The quick fox.");
  });

  it("handles a fix at the very end of the text", () => {
    const text = "This is bery good.";
    const issue = makeIssue({
      span: { start: 8, end: 12 },
      suggestions: [{ label: "very", replacement: "very" }],
    });
    const result = applyAutoFix(text, [issue]);
    expect(result.text).toBe("This is very good.");
  });

  it("applies three fixes across a longer document correctly", () => {
    const text = "aaa bbb ccc ddd eee";
    const issues = [
      makeIssue({ span: { start: 0, end: 3 }, suggestions: [{ label: "A", replacement: "A" }] }),
      makeIssue({ span: { start: 8, end: 11 }, suggestions: [{ label: "C", replacement: "C" }] }),
      makeIssue({ span: { start: 16, end: 19 }, suggestions: [{ label: "E", replacement: "E" }] }),
    ];
    const result = applyAutoFix(text, issues);
    expect(result.text).toBe("A bbb C ddd E");
  });
});
