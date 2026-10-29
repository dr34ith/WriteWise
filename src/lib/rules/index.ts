import type { DocMode, Issue, Rule, RuleContext } from "../types";
import { misspelled, repeatedWord } from "./spelling";
import { wordinessPhrase } from "./wordiness";
import { filler } from "./filler";
import { vagueNoun } from "./vagueNoun";
import { typographyRules } from "./typography";

export const allRules: Rule[] = [
  misspelled,
  repeatedWord,
  wordinessPhrase,
  filler,
  vagueNoun,
  ...typographyRules,
];

export function rulesForMode(mode: DocMode): Rule[] {
  return allRules.filter((rule) => !rule.appliesTo || rule.appliesTo.includes(mode));
}

export function runRules(ctx: RuleContext): Issue[] {
  const rules = rulesForMode(ctx.mode);
  const issues: Issue[] = [];
  for (const rule of rules) {
    issues.push(...rule.run(ctx));
  }
  return issues.sort((a, b) => a.span.start - b.span.start);
}
