import type { Issue, Rule, RuleContext } from "../types";
import { overlapsProtected } from "../protect";
import { tokenizeWords } from "../segment";
import { makeIssueId } from "./helpers";

function isAllCapsAcronym(word: string): boolean {
  // Matches acronyms like "APT", "IOC", and their plurals ("IOCs", "TTPs").
  return /^[A-Z]{2,}s?$/.test(word);
}

function containsDigitOrUnderscore(word: string): boolean {
  return /[0-9_]/.test(word);
}

export const misspelled: Rule = {
  id: "spelling.misspelled",
  category: "spelling",
  defaultSeverity: "suggestion",
  run(ctx: RuleContext): Issue[] {
    if (!ctx.spellChecker) return [];
    const issues: Issue[] = [];
    const words = tokenizeWords(ctx.text);

    for (const word of words) {
      if (overlapsProtected(ctx.protectedRanges, word)) continue;
      if (containsDigitOrUnderscore(word.text)) continue;
      if (isAllCapsAcronym(word.text)) continue;
      if (ctx.userDictionary?.has(word.text.toLowerCase())) continue;
      if (ctx.glossaryTerms?.has(word.text.toLowerCase())) continue;

      const correct =
        ctx.spellChecker.correct(word.text) || ctx.spellChecker.correct(word.text.toLowerCase());
      if (correct) continue;

      const suggestions = ctx.spellChecker.suggest(word.text).slice(0, 3);
      issues.push({
        id: makeIssueId("spelling.misspelled", word, word.text),
        ruleId: "spelling.misspelled",
        category: "spelling",
        severity: "suggestion",
        span: { start: word.start, end: word.end },
        message: `Possible misspelling: "${word.text}"`,
        why: "This word was not found in the dictionary, your custom dictionary, or the security glossary.",
        suggestions: suggestions.map((s) => ({ label: s, replacement: s })),
      });
    }
    return issues;
  },
};

export const repeatedWord: Rule = {
  id: "spelling.repeated-word",
  category: "spelling",
  defaultSeverity: "suggestion",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const words = tokenizeWords(ctx.text);

    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1];
      const curr = words[i];
      if (prev.text.toLowerCase() !== curr.text.toLowerCase()) continue;
      const between = ctx.text.slice(prev.end, curr.start);
      if (!/^\s+$/.test(between)) continue;
      if (
        overlapsProtected(ctx.protectedRanges, prev) ||
        overlapsProtected(ctx.protectedRanges, curr)
      ) {
        continue;
      }
      const span = { start: prev.start, end: curr.end };
      issues.push({
        id: makeIssueId("spelling.repeated-word", span, ctx.text.slice(span.start, span.end)),
        ruleId: "spelling.repeated-word",
        category: "spelling",
        severity: "suggestion",
        span,
        message: `Repeated word: "${prev.text} ${curr.text}"`,
        why: "The same word appears twice in a row, which is almost always an accidental duplicate.",
        suggestions: [{ label: prev.text, replacement: prev.text }],
        example: `${prev.text} ${curr.text} -> ${prev.text}`,
      });
    }
    return issues;
  },
};
