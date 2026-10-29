import type { Issue, Rule, RuleContext } from "../types";
import { makeIssueId, matchOutsideProtected } from "./helpers";

const VAGUE_WORDS = ["stuff", "things", "something", "somehow"];
const VAGUE_REGEX = new RegExp(`\\b(${VAGUE_WORDS.join("|")})\\b`, "gi");

export const vagueNoun: Rule = {
  id: "style.vague-noun",
  category: "style",
  defaultSeverity: "suggestion",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const matches = matchOutsideProtected(VAGUE_REGEX, ctx.text, ctx.protectedRanges);
    for (const m of matches) {
      const start = m.index ?? 0;
      const span = { start, end: start + m[0].length };
      issues.push({
        id: makeIssueId("style.vague-noun", span, m[0]),
        ruleId: "style.vague-noun",
        category: "style",
        severity: "suggestion",
        span,
        message: `Vague word: "${m[0]}"`,
        why: "Name the specific artifact, action, or value instead of a vague placeholder word — it makes the finding verifiable.",
        suggestions: [],
      });
    }
    return issues;
  },
};
