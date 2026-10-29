import type { ProtectedRange, Span } from "../types";
import { overlapsProtected } from "../protect";

/** Matches `regex` against `text`, discarding any match that overlaps a protected range. */
export function matchOutsideProtected(
  regex: RegExp,
  text: string,
  protectedRanges: ProtectedRange[],
): RegExpMatchArray[] {
  const flags = regex.flags.includes("g") ? regex.flags : regex.flags + "g";
  const re = new RegExp(regex.source, flags);
  const results: RegExpMatchArray[] = [];
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (!overlapsProtected(protectedRanges, { start, end })) results.push(m);
  }
  return results;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Stable, deterministic id for an issue: ruleId + span + a short hash of the flagged text. */
export function makeIssueId(ruleId: string, span: Span, flaggedText: string): string {
  return `${ruleId}:${span.start}-${span.end}:${simpleHash(flaggedText)}`;
}

export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
