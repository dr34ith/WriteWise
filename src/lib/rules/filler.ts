import type { Issue, Rule, RuleContext } from "../types";
import { makeIssueId, matchOutsideProtected } from "./helpers";

export const FILLER_WORDS = [
  "very",
  "really",
  "basically",
  "actually",
  "just",
  "quite",
  "simply",
  "literally",
  "obviously",
  "clearly",
  "kind of",
  "sort of",
];

const FILLER_REGEX = new RegExp(`\\b(${FILLER_WORDS.join("|")})\\b`, "gi");

export const filler: Rule = {
  id: "style.filler",
  category: "style",
  defaultSeverity: "suggestion",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const matches = matchOutsideProtected(FILLER_REGEX, ctx.text, ctx.protectedRanges);
    for (const m of matches) {
      const start = m.index ?? 0;
      const span = { start, end: start + m[0].length };
      issues.push({
        id: makeIssueId("style.filler", span, m[0]),
        ruleId: "style.filler",
        category: "style",
        severity: "suggestion",
        span,
        message: `Filler word: "${m[0]}"`,
        why: "Filler words rarely add meaning and dilute technical writing; try removing it and re-reading the sentence.",
        suggestions: [{ label: "Remove", replacement: "" }],
      });
    }
    return issues;
  },
};
