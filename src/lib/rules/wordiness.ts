import { z } from "zod";
import wordinessData from "../../data/wordiness.json";
import type { Issue, Rule, RuleContext } from "../types";
import { escapeRegExp, makeIssueId, matchOutsideProtected } from "./helpers";

const WordinessEntrySchema = z.object({
  phrase: z.string().min(1),
  replacement: z.string(),
  why: z.string().min(1),
});
const WordinessDataSchema = z.array(WordinessEntrySchema);

export const entries = WordinessDataSchema.parse(wordinessData);

export const wordinessPhrase: Rule = {
  id: "wordiness.phrase",
  category: "wordiness",
  defaultSeverity: "suggestion",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    for (const entry of entries) {
      const regex = new RegExp(`\\b${escapeRegExp(entry.phrase)}\\b`, "gi");
      const matches = matchOutsideProtected(regex, ctx.text, ctx.protectedRanges);
      for (const m of matches) {
        const start = m.index ?? 0;
        const span = { start, end: start + m[0].length };
        issues.push({
          id: makeIssueId("wordiness.phrase", span, m[0]),
          ruleId: "wordiness.phrase",
          category: "wordiness",
          severity: "suggestion",
          span,
          message: `Wordy phrase: "${m[0]}"`,
          why: entry.why,
          suggestions: [{ label: entry.replacement, replacement: entry.replacement }],
          example: `${m[0]} -> ${entry.replacement}`,
        });
      }
    }
    return issues;
  },
};
