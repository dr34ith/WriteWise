import type { Issue, Rule, RuleContext } from "../types";
import { overlapsProtected } from "../protect";
import { isProseBlock, segmentBlocks } from "../segment";
import { makeIssueId, matchOutsideProtected } from "./helpers";

export const doubleSpace: Rule = {
  id: "typography.double-space",
  category: "typography",
  defaultSeverity: "info",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const matches = matchOutsideProtected(/(?<=\S) {2,}(?=\S)/g, ctx.text, ctx.protectedRanges);
    for (const m of matches) {
      const start = m.index ?? 0;
      const span = { start, end: start + m[0].length };
      issues.push({
        id: makeIssueId("typography.double-space", span, m[0]),
        ruleId: "typography.double-space",
        category: "typography",
        severity: "info",
        span,
        message: "Multiple spaces between words.",
        why: "Extra spaces between words are usually accidental and render inconsistently.",
        suggestions: [{ label: "Single space", replacement: " " }],
      });
    }
    return issues;
  },
};

export const spaceBeforePunct: Rule = {
  id: "typography.space-before-punct",
  category: "typography",
  defaultSeverity: "info",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const matches = matchOutsideProtected(/ +([.,;:!?])/g, ctx.text, ctx.protectedRanges);
    for (const m of matches) {
      const start = m.index ?? 0;
      const span = { start, end: start + m[0].length };
      issues.push({
        id: makeIssueId("typography.space-before-punct", span, m[0]),
        ruleId: "typography.space-before-punct",
        category: "typography",
        severity: "info",
        span,
        message: `Unexpected space before "${m[1]}".`,
        why: "Punctuation should immediately follow the preceding word.",
        suggestions: [{ label: m[1], replacement: m[1] }],
      });
    }
    return issues;
  },
};

export const missingSpaceAfterPunct: Rule = {
  id: "typography.missing-space-after-punct",
  category: "typography",
  defaultSeverity: "info",
  experimental: true,
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const matches = matchOutsideProtected(/([.,;:!?])([A-Za-z])/g, ctx.text, ctx.protectedRanges);
    for (const m of matches) {
      const start = m.index ?? 0;
      const span = { start, end: start + m[0].length };
      issues.push({
        id: makeIssueId("typography.missing-space-after-punct", span, m[0]),
        ruleId: "typography.missing-space-after-punct",
        category: "typography",
        severity: "info",
        experimental: true,
        span,
        message: `Missing space after "${m[1]}".`,
        why: "A space is expected between punctuation and the next word.",
        suggestions: [{ label: `${m[1]} ${m[2]}`, replacement: `${m[1]} ${m[2]}` }],
      });
    }
    return issues;
  },
};

const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

export const unbalancedBrackets: Rule = {
  id: "typography.unbalanced-brackets-quotes",
  category: "typography",
  defaultSeverity: "warning",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const blocks = segmentBlocks(ctx.text, ctx.protectedRanges).filter(isProseBlock);

    for (const block of blocks) {
      const stack: { char: string; pos: number }[] = [];
      for (let i = 0; i < block.text.length; i++) {
        const absPos = block.start + i;
        if (overlapsProtected(ctx.protectedRanges, { start: absPos, end: absPos + 1 })) continue;
        const ch = block.text[i];
        if (ch === "(" || ch === "[" || ch === "{") {
          stack.push({ char: ch, pos: absPos });
        } else if (ch === ")" || ch === "]" || ch === "}") {
          const top = stack[stack.length - 1];
          if (top && OPEN_TO_CLOSE[top.char] === ch) {
            stack.pop();
          } else {
            issues.push(makeBracketIssue(ctx.text, absPos, absPos + 1));
          }
        }
      }
      for (const unclosed of stack) {
        issues.push(makeBracketIssue(ctx.text, unclosed.pos, unclosed.pos + 1));
      }
    }
    return issues;
  },
};

function makeBracketIssue(text: string, start: number, end: number): Issue {
  const span = { start, end };
  return {
    id: makeIssueId("typography.unbalanced-brackets-quotes", span, text.slice(start, end)),
    ruleId: "typography.unbalanced-brackets-quotes",
    category: "typography",
    severity: "warning",
    span,
    message: "Unbalanced bracket.",
    why: "This bracket has no matching opening or closing counterpart in the paragraph.",
    suggestions: [],
  };
}

export const sentenceNoEndPunct: Rule = {
  id: "typography.sentence-no-end-punct",
  category: "typography",
  defaultSeverity: "info",
  experimental: true,
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const blocks = segmentBlocks(ctx.text, ctx.protectedRanges).filter(
      (b) => b.type === "paragraph",
    );
    for (const block of blocks) {
      const trimmed = block.text.trimEnd();
      if (trimmed.length === 0) continue;
      const last = trimmed[trimmed.length - 1];
      if (!/[.!?:"')\]]/.test(last)) {
        const end = block.start + trimmed.length;
        const span = { start: Math.max(block.start, end - 1), end };
        issues.push({
          id: makeIssueId("typography.sentence-no-end-punct", span, ctx.text.slice(span.start, span.end)),
          ruleId: "typography.sentence-no-end-punct",
          category: "typography",
          severity: "info",
          experimental: true,
          span,
          message: "Paragraph does not end with punctuation.",
          why: "Readers expect prose paragraphs to end with terminal punctuation.",
          suggestions: [],
        });
      }
    }
    return issues;
  },
};

export const typographyRules: Rule[] = [
  doubleSpace,
  spaceBeforePunct,
  missingSpaceAfterPunct,
  unbalancedBrackets,
  sentenceNoEndPunct,
];
