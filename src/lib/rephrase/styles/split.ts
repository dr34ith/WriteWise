import nlp from "compromise";
import { overlapsProtected } from "../../protect";
import type { ProtectedRange } from "../../types";
import type { RawEdit } from "../types";

const SPLIT_POINT_REGEX = /(,\s+(?:and|but|so)\s+|;\s+)/gi;

function hasVerb(text: string): boolean {
  return nlp(text).verbs().out("array").length > 0;
}

/**
 * Splits a long sentence into two at a coordinating conjunction or semicolon, but only when
 * both halves contain their own verb phrase (otherwise splitting would produce a sentence
 * fragment) and the split point doesn't fall inside a protected range.
 */
export function generateSplit(sentenceText: string, protectedRanges: ProtectedRange[]): RawEdit[][] {
  const trimmed = sentenceText.replace(/[.!?]\s*$/, "");
  const trailingPunct = sentenceText.slice(trimmed.length).trim() || ".";

  for (const m of trimmed.matchAll(SPLIT_POINT_REGEX)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (overlapsProtected(protectedRanges, { start, end })) continue;

    const before = trimmed.slice(0, start);
    const after = trimmed.slice(end);
    if (before.trim().length === 0 || after.trim().length === 0) continue;
    if (!hasVerb(before) || !hasVerb(after)) continue;

    const capitalizedAfter = after.charAt(0).toUpperCase() + after.slice(1);
    const replacement = `${before}${trailingPunct} ${capitalizedAfter}${trailingPunct}`;

    return [
      [
        {
          span: { start: 0, end: sentenceText.length },
          replacement,
          reason: "Split a long sentence into two at a natural clause boundary.",
        },
      ],
    ];
  }

  return [];
}
